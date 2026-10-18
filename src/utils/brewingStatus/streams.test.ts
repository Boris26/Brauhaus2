import reducer, {initialProductionState} from '../../reducers/productionReducer';
import {ProductionActions as Actions} from '../../actions/actions';
const envelope = (revision = 1) => ({schemaVersion: 1, controllerEpoch: 'epoch', processInstanceId: 'run', revision, stateRevision: revision,
  status: {elapsedTime: revision, process: {state: 'ACTIVE'}, currentStep: {index: 1, phase: 'RAST', mode: 'WAITING'},
    temperature: {current: 60, target: 65}, waiting: {waitingFor: 'IODINE_TEST', canConfirm: true}, error: {}}});
import {parseSnapshot} from './snapshot';

it('keeps semantic object identity across HTTP time/temperature refreshes and rejects late streams', () => {
  const first = {...envelope(10), stateRevision: 4, telemetryRevision: 1};
  let state = reducer(initialProductionState, Actions.setBrewingStatus(parseSnapshot(first), 'socket'));
  const semantic = state.brewingStatus;
  const sample = {...first, revision: 15, telemetryRevision: 2, elapsedTime: 15, temperature: {current: 61, target: 65}};
  state = reducer(state, {type: Actions.ActionTypes.TELEMETRY_RECEIVED, payload: {data: sample, generation: 0}});
  expect(state.brewingStatus).toBe(semantic);
  expect(state.telemetry?.temperature.current).toBe(61);
  state = reducer(state, Actions.setBrewingStatus(parseSnapshot({...first, revision: 12}), 'http'));
  expect(state.brewingStatus).toBe(semantic);
  expect(state.telemetry?.telemetryRevision).toBe(2);
  const newerSemantic = parseSnapshot({...first, revision: 13, stateRevision: 13});
  state = reducer(state, Actions.setBrewingStatus(newerSemantic, 'socket'));
  expect(state.brewingStatus).toBe(newerSemantic);
});

it('a validated heartbeat restores freshness without replacing semantic state', () => {
  let state = reducer(initialProductionState, Actions.socketConnectionChanged(true));
  state = reducer(state, Actions.setBrewingStatus(parseSnapshot({...envelope(10), stateRevision: 4, telemetryRevision: 1}), 'socket'));
  const status = state.brewingStatus;
  state = reducer(state, {type: Actions.ActionTypes.STATUS_STREAM_STALE});
  expect(state.isBrewingStatusStale).toBe(true);
  state = reducer(state, {type: Actions.ActionTypes.STATUS_HEARTBEAT, payload: {schemaVersion: 1, controllerEpoch: 'epoch',
    processInstanceId: 'run', revision: 1000, stateRevision: 4, telemetryRevision: 1}});
  expect(state.isBrewingStatusStale).toBe(false);
  expect(state.brewingStatus).toBe(status);
});
