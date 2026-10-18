import {configureStore} from '@reduxjs/toolkit';
import {combineEpics, createEpicMiddleware} from 'redux-observable';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import reducer from '../reducers/productionReducer';
import {ProductionActions as Actions} from '../actions/actions';
import {ProductionRepository} from '../repositorys/ProductionRepository';
import {confirmEpic$, startPollingEpic$} from './productionEpics';
import {statusCommunicationEpics} from './statusCommunicationEpics';
import {parseSnapshot} from '../utils/brewingStatus/snapshot';
import {dataCollector} from '../utils/DataCollector/dataCollector';

jest.mock('../repositorys/ProductionRepository', () => ({ProductionRepository: {
  getBrewingStatus: jest.fn(), confirm: jest.fn(),
}}));
jest.mock('../repositorys/BeerRepository', () => ({BeerRepository: {}}));

const snapshot = (revision: number, mode = 'WAITING', epoch = 'epoch-1') => parseSnapshot({
  schemaVersion: 1, controllerEpoch: epoch, processInstanceId: 'run-1', revision, stateRevision: revision,
  status: {elapsedTime: revision, process: {state: 'ACTIVE'}, currentStep: {index: 1, phase: 'RAST', mode},
    temperature: {current: 60, target: 65},
    waiting: {waitingFor: mode === 'WAITING' ? 'IODINE_TEST' : 'NONE', canConfirm: mode === 'WAITING'}, error: {}},
})!;
const flush = async () => {for (let i = 0; i < 10; i++) await Promise.resolve();};
const deferred = () => {let resolve!: (value: any) => void; const promise = new Promise<any>(r => {resolve = r;}); return {promise, resolve};};
const mock = ProductionRepository as jest.Mocked<typeof ProductionRepository>;

describe('process communication integration', () => {
  let stop: Subject<void>;
  let store: any;
  beforeEach(() => {
    jest.useFakeTimers();
    dataCollector.reset();
    mock.getBrewingStatus.mockReset();
    mock.confirm.mockReset();
    mock.getBrewingStatus.mockResolvedValue({available: {isBackenAvailable: true, statusText: 'OK'}, brewingStatus: snapshot(1)});
    stop = new Subject();
    const middleware = createEpicMiddleware<any, any, any>();
    store = configureStore({reducer: {productionReducer: reducer}, middleware: [middleware]});
    const root = combineEpics(...statusCommunicationEpics, startPollingEpic$, confirmEpic$);
    middleware.run((actions, state, deps) => root(actions, state, deps).pipe(takeUntil(stop)));
  });
  afterEach(() => {stop.next(); stop.complete(); jest.useRealTimers();});
  const connect = () => {
    store.dispatch(Actions.socketConnectionChanged(true, 'sid'));
    store.dispatch(Actions.setBrewingStatus(snapshot(1), 'socket', store.getState().productionReducer.communication.generation));
  };

  it('uses no regular status poll while connected and synchronized', async () => {
    connect();
    store.dispatch(Actions.startPolling());
    jest.advanceTimersByTime(30000);
    await flush();
    expect(mock.getBrewingStatus).not.toHaveBeenCalled();
    expect(store.getState().productionReducer.isPollingRunning).toBe(false);
  });

  it('uses independent heartbeat watermarks and time anchors without history samples or HTTP for raw revision growth', async () => {
    store.dispatch(Actions.socketConnectionChanged(true));
    const initial = snapshot(1, 'TIMER_RUNNING');
    const modern = {...initial, snapshotMetadata: {...initial.snapshotMetadata!, telemetryRevision: 1}};
    store.dispatch(Actions.setBrewingStatus(modern, 'socket', store.getState().productionReducer.communication.generation));
    const semantic = store.getState().productionReducer.brewingStatus;
    const historyCount = dataCollector.getMeasurementCount();
    for (let sequence = 2; sequence <= 4; sequence++) {
      jest.advanceTimersByTime(15000);
      store.dispatch({type: Actions.ActionTypes.STATUS_HEARTBEAT, payload: {schemaVersion: 1,
        controllerEpoch: 'epoch-1', processInstanceId: 'run-1', revision: 1000 * sequence, stateRevision: 1,
        telemetryRevision: 1, timeAnchorSequence: sequence,
        timeAnchor: {sequence, stepId: null, stepIndex: 1, phase: 'RAST', mode: 'TIMER_RUNNING',
          elapsedTime: sequence * 15, stepElapsedTime: sequence * 15, running: true, stepRunning: true, sampleAgeSeconds: 0}}});
    }
    await flush();
    expect(mock.getBrewingStatus).not.toHaveBeenCalled();
    expect(store.getState().productionReducer.brewingStatus).toBe(semantic);
    expect(store.getState().productionReducer.timeAnchor.sequence).toBe(4);
    expect(dataCollector.getMeasurementCount()).toBe(historyCount);
  });

  it('accepts HTTP-only telemetry updates without replacing semantic state and collects the changed temperature once', async () => {
    const initial = snapshot(1);
    store.dispatch(Actions.setBrewingStatus({...initial, snapshotMetadata: {...initial.snapshotMetadata!, telemetryRevision: 1}}, 'sync'));
    await flush();
    const semantic = store.getState().productionReducer.brewingStatus;
    mock.getBrewingStatus.mockResolvedValue({available: {isBackenAvailable: true, statusText: ''},
      brewingStatus: {...initial, elapsedTime: 10, temperature: {current: 61, target: 65},
        snapshotMetadata: {...initial.snapshotMetadata!, revision: 10, telemetryRevision: 2}}});
    jest.advanceTimersByTime(10000); await flush();
    expect(store.getState().productionReducer.brewingStatus).toBe(semantic);
    expect(store.getState().productionReducer.telemetry.temperature.current).toBe(61);
    expect(dataCollector.getMeasurementCount()).toBe(2);
    jest.advanceTimersByTime(10000); await flush();
    expect(dataCollector.getMeasurementCount()).toBe(2);
  });

  it('a transport connection without a valid snapshot keeps HTTP fallback active', async () => {
    store.dispatch(Actions.socketConnectionChanged(true, 'sid'));
    expect(store.getState().productionReducer.communication.phase).toBe('Synchronizing');
    jest.advanceTimersByTime(2000);
    await flush();
    expect(mock.getBrewingStatus).toHaveBeenCalledTimes(1);
    expect(store.getState().productionReducer.communication.phase).toBe('Synchronizing');
    jest.advanceTimersByTime(10000);
    await flush();
    expect(mock.getBrewingStatus).toHaveBeenCalledTimes(2);
  });

  it('falls back after disconnect and stops again after a full reconnect snapshot', async () => {
    connect();
    store.dispatch(Actions.socketConnectionChanged(false));
    await flush();
    expect(mock.getBrewingStatus).toHaveBeenCalled();
    jest.advanceTimersByTime(10000);
    await flush();
    const count = mock.getBrewingStatus.mock.calls.length;
    store.dispatch(Actions.socketConnectionChanged(true, 'new-sid'));
    store.dispatch(Actions.setBrewingStatus(snapshot(2), 'socket', store.getState().productionReducer.communication.generation));
    jest.advanceTimersByTime(30000);
    await flush();
    expect(mock.getBrewingStatus).toHaveBeenCalledTimes(count);
    expect(store.getState().productionReducer.communication.phase).toBe('Synchronized');
  });

  it.each(['http-first', 'socket-first'])('completes a confirmation only on controller transition (%s)', async order => {
    connect();
    const request = deferred();
    mock.confirm.mockReturnValue(request.promise);
    store.dispatch(Actions.confirm('Iodine' as any));
    expect(mock.confirm).toHaveBeenCalledTimes(1);
    if (order === 'http-first') {
      request.resolve(snapshot(1));
      await flush();
      expect(store.getState().productionReducer.confirmation.phase).toBe('AwaitingStateTransition');
    }
    store.dispatch(Actions.setBrewingStatus(snapshot(2, 'HEATING'), 'socket', store.getState().productionReducer.communication.generation));
    if (order === 'socket-first') {request.resolve(snapshot(1)); await flush();}
    expect(store.getState().productionReducer.confirmation.phase).toBe('Completed');
    expect(store.getState().productionReducer.isConfirmPending).toBe(false);
    expect(store.getState().productionReducer.brewingStatus.currentStep.mode).toBe('HEATING');
    jest.advanceTimersByTime(10000);
    await flush();
    expect(mock.confirm).toHaveBeenCalledTimes(1);
  });

  it('resynchronizes a delayed confirmation without repeating its command', async () => {
    connect();
    mock.confirm.mockResolvedValue(snapshot(1));
    store.dispatch(Actions.confirm('Iodine' as any));
    await flush();
    store.dispatch(Actions.confirm('Iodine' as any));
    jest.advanceTimersByTime(5000);
    await flush();
    expect(mock.confirm).toHaveBeenCalledTimes(1);
    expect(mock.getBrewingStatus).toHaveBeenCalledTimes(1);
    expect(store.getState().productionReducer.confirmation.syncWaiting).toBe(true);
  });

  it('a socket terminal state stops an active fallback subscription', async () => {
    store.dispatch(Actions.startPolling());
    await flush();
    store.dispatch(Actions.socketConnectionChanged(true, 'sid'));
    const finished = {...snapshot(2, 'FINISHED'), process: {state: 'FINISHED' as any}};
    store.dispatch(Actions.setBrewingStatus(finished, 'socket', store.getState().productionReducer.communication.generation));
    const count = mock.getBrewingStatus.mock.calls.length;
    jest.advanceTimersByTime(30000);
    await flush();
    expect(mock.getBrewingStatus).toHaveBeenCalledTimes(count);
    expect(store.getState().productionReducer.isPollingRunning).toBe(false);
  });

  it('deduplicates history across reconnect snapshots and late HTTP responses', () => {
    connect();
    expect(dataCollector.getMeasurementCount()).toBe(1);
    store.dispatch(Actions.setBrewingStatus(snapshot(1), 'socket'));
    store.dispatch(Actions.setBrewingStatus(snapshot(1), 'http'));
    expect(dataCollector.getMeasurementCount()).toBe(1);
    store.dispatch(Actions.setBrewingStatus(snapshot(2), 'socket'));
    store.dispatch(Actions.setBrewingStatus(snapshot(1), 'http'));
    expect(dataCollector.getMeasurementCount()).toBe(1); // Only elapsedTime changed.
  });

  it('resynchronizes an epoch change and cannot return to the retired epoch', async () => {
    connect();
    mock.getBrewingStatus.mockResolvedValue({available: {isBackenAvailable: true, statusText: ''}, brewingStatus: snapshot(1, 'HEATING', 'epoch-2')});
    store.dispatch(Actions.setBrewingStatus(snapshot(1, 'HEATING', 'epoch-2'), 'socket'));
    await flush();
    expect(store.getState().productionReducer.brewingStatus.snapshotMetadata.controllerEpoch).toBe('epoch-2');
    store.dispatch(Actions.setBrewingStatus(snapshot(99), 'http'));
    expect(store.getState().productionReducer.brewingStatus.snapshotMetadata.controllerEpoch).toBe('epoch-2');
  });
});
