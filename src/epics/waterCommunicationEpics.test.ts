import {configureStore} from '@reduxjs/toolkit';
import {combineEpics, createEpicMiddleware} from 'redux-observable';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import reducer from '../reducers/productionReducer';
import {ProductionActions as Actions, ApplicationActions} from '../actions/actions';
import {ProductionRepository} from '../repositorys/ProductionRepository';
import {waterCommunicationEpics} from './waterCommunicationEpics';
import {startWaterFillingEpic$, stopWaterFillingEpic$} from './productionEpics';
import {parseWaterSnapshot} from '../utils/brewingStatus/waterSnapshot';

jest.mock('../repositorys/ProductionRepository', () => ({ProductionRepository: {
  getWaterStatus: jest.fn(), fillWaterAutomatic: jest.fn(), stopWaterFilling: jest.fn(),
}}));
jest.mock('../repositorys/BeerRepository', () => ({BeerRepository: {}}));
const payload = (revision = 1, state = 'RUNNING') => ({schemaVersion: 1, controllerEpoch: 'epoch', waterFillingRevision: revision,
  fillId: 'fill-1', mode: 'MASH', state, filledLiters: 0.1234, targetLiters: 1, openClose: state === 'RUNNING', reason: null, error: null});
const flush = async () => {for (let i = 0; i < 20; i++) await Promise.resolve();};
const mock = ProductionRepository as jest.Mocked<typeof ProductionRepository>;

describe('shared water observation', () => {
  let stop: Subject<void>, store: any;
  const snapshot = () => store.dispatch({type: Actions.ActionTypes.WATER_SNAPSHOT, payload: {data: payload(), generation: store.getState().productionReducer.communication.generation}});
  const heartbeat = (sourceAgeSeconds = 0) => store.dispatch({type: Actions.ActionTypes.WATER_HEARTBEAT, payload: {
    schemaVersion: 1, controllerEpoch: 'epoch', waterFillingRevision: 1, fillId: 'fill-1', sourceAgeSeconds}});
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    mock.getWaterStatus.mockResolvedValue(parseWaterSnapshot(payload())!);
    mock.fillWaterAutomatic.mockResolvedValue(true); mock.stopWaterFilling.mockResolvedValue(true);
    stop = new Subject();
    const middleware = createEpicMiddleware<any, any, any>();
    store = configureStore({reducer: {productionReducer: reducer}, middleware: [middleware]});
    const root = combineEpics(...waterCommunicationEpics, startWaterFillingEpic$, stopWaterFillingEpic$);
    middleware.run((a, s, d) => root(a, s, d).pipe(takeUntil(stop)));
  });
  afterEach(() => {stop.next(); stop.complete(); jest.useRealTimers();});

  it('receives an ongoing fill on a second/browser-restarted client without a local start or regular HTTP poll', async () => {
    store.dispatch(Actions.socketConnectionChanged(true, 'sid')); snapshot();
    jest.advanceTimersByTime(30_000); await flush();
    expect(mock.getWaterStatus).not.toHaveBeenCalled();
    expect(store.getState().productionReducer.waterStatus.filledLiters).toBe(0.1234);
    expect(mock.fillWaterAutomatic).not.toHaveBeenCalled();
  });

  it('immediately reads after disconnect and cancels 1 Hz fallback when a socket snapshot returns', async () => {
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    store.dispatch(Actions.socketConnectionChanged(false)); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(2);
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    jest.advanceTimersByTime(10_000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(2);
    expect(mock.stopWaterFilling).not.toHaveBeenCalled();
  });

  it('retains the last value and marks it stale when a remote observer cannot read HTTP', async () => {
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    mock.getWaterStatus.mockRejectedValue(new Error('offline'));
    store.dispatch(Actions.socketConnectionChanged(false)); await flush();
    const state = store.getState().productionReducer;
    expect(state.waterStatus.filledLiters).toBe(0.1234);
    expect(state.waterStatus.openClose).toBe(true);
    expect(state.waterCommunication.stale).toBe(true);
    expect(mock.stopWaterFilling).not.toHaveBeenCalled();
  });

  it('rediscovers a fill started by another client while socket transport remains unavailable', async () => {
    mock.getWaterStatus.mockResolvedValueOnce(parseWaterSnapshot({...payload(0, 'IDLE'), fillId: null})!);
    store.dispatch({type: Actions.ActionTypes.WATER_RESYNC_REQUEST}); await flush();
    expect(store.getState().productionReducer.waterStatus.state).toBe('IDLE');
    mock.getWaterStatus.mockResolvedValue(parseWaterSnapshot(payload())!);
    store.dispatch(Actions.isBackenAvailable({isBackenAvailable: true, statusText: ''})); await flush();
    expect(store.getState().productionReducer.waterStatus.state).toBe('RUNNING');
    jest.advanceTimersByTime(1000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(3);
  });

  it('detects an inactive water source despite a connected socket and does not accept old source heartbeats', async () => {
    store.dispatch(ApplicationActions.applicationStart()); await flush();
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    mock.getWaterStatus.mockClear();
    jest.advanceTimersByTime(3000); heartbeat(8);
    jest.advanceTimersByTime(2000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(1);
    expect(mock.stopWaterFilling).not.toHaveBeenCalled();
  });

  it('preserves the existing HTTP-read failure stop rule only for a locally started fill', async () => {
    mock.getWaterStatus.mockRejectedValueOnce(new Error('read failed'))
      .mockResolvedValue(parseWaterSnapshot(payload(2, 'STOPPED'))!);
    store.dispatch(Actions.startWaterFilling(1, 'MASH')); await flush();
    expect(mock.stopWaterFilling).toHaveBeenCalledTimes(1);
    expect(store.getState().productionReducer.isWaterFillingSuccessful).toBe(false);
  });

  it('continues through closed STARTING and stops fallback after an exact terminal snapshot', async () => {
    mock.getWaterStatus.mockResolvedValueOnce(parseWaterSnapshot(payload(1, 'STARTING'))!)
      .mockResolvedValueOnce({...parseWaterSnapshot(payload(2, 'COMPLETED'))!, filledLiters: 1.0001, reason: 'TARGET_REACHED'});
    store.dispatch({type: Actions.ActionTypes.WATER_RESYNC_REQUEST}); await flush();
    expect(store.getState().productionReducer.waterStatus.state).toBe('STARTING');
    jest.advanceTimersByTime(1000); await flush();
    expect(store.getState().productionReducer.waterStatus.filledLiters).toBe(1.0001);
    jest.advanceTimersByTime(3000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(2);
  });

  it('stores startup errors as errors rather than interpreting a closed valve as success', async () => {
    mock.getWaterStatus.mockResolvedValue({...parseWaterSnapshot(payload(2, 'ERROR'))!, error: 'GPIO failed', reason: 'START_FAILED'});
    store.dispatch({type: Actions.ActionTypes.WATER_RESYNC_REQUEST}); await flush();
    expect(store.getState().productionReducer.waterStatus.state).toBe('ERROR');
    expect(store.getState().productionReducer.waterStatus.error).toBe('GPIO failed');
    jest.advanceTimersByTime(3000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(1);
  });

  it('does not overlap slow HTTP fallback requests and aborts the pending request after reconnect', async () => {
    let resolve!: (value: any) => void;
    mock.getWaterStatus.mockReturnValue(new Promise(r => {resolve = r;}));
    store.dispatch({type: Actions.ActionTypes.WATER_RESYNC_REQUEST});
    jest.advanceTimersByTime(5000); await flush();
    expect(mock.getWaterStatus).toHaveBeenCalledTimes(1);
    const signal = mock.getWaterStatus.mock.calls[0][2]!;
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    expect(signal.aborted).toBe(true);
    resolve(parseWaterSnapshot(payload(99))!); await flush();
    expect(store.getState().productionReducer.waterStatus.snapshotMetadata.waterFillingRevision).toBe(1);
  });

  it('retains the local maximum-duration safeguard without polling a synchronized socket', async () => {
    store.dispatch(Actions.socketConnectionChanged(true)); snapshot();
    store.dispatch({type: Actions.ActionTypes.WATER_START_ACCEPTED, payload: {startedAt: performance.now() - 30 * 60 * 1000, baselineFillId: 'old-fill'}});
    mock.getWaterStatus.mockResolvedValue(parseWaterSnapshot(payload(2, 'STOPPED'))!);
    jest.advanceTimersByTime(1); await flush();
    expect(mock.stopWaterFilling).toHaveBeenCalledTimes(1);
    expect(store.getState().productionReducer.isWaterFillingSuccessful).toBe(false);
  });
});
