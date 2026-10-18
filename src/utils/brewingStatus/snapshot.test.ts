import reducer, {initialProductionState} from '../../reducers/productionReducer';
import {ProductionActions} from '../../actions/actions';
import {mergeTelemetry, parseSnapshot, statusFromResponse} from './snapshot';

export const envelope = (revision = 1, epoch = 'epoch-1', run = 'run-1') => ({
  schemaVersion: 1, controllerEpoch: epoch, processInstanceId: run, revision, stateRevision: revision,
  status: {elapsedTime: revision, process: {state: 'ACTIVE'},
    currentStep: {index: 1, stepId: 'step-1', phase: 'RAST', mode: 'WAITING'},
    temperature: {current: 60, target: 65}, waiting: {waitingFor: 'IODINE_TEST', canConfirm: true}, error: {}},
});

it('validates before normalizing and preserves metadata and step identity', () => {
  expect(parseSnapshot(envelope())?.currentStep.stepId).toBe('step-1');
  expect(parseSnapshot({...envelope(), revision: -1})).toBeUndefined();
  expect(parseSnapshot({...envelope(), status: {}})).toBeUndefined();
  expect(() => statusFromResponse({data: envelope().status, headers: {'x-controller-epoch': 'epoch'}})).toThrow();
});

it('rejects older HTTP responses, duplicates and previous processes', () => {
  const status = parseSnapshot(envelope(4))!;
  const state = reducer(initialProductionState, ProductionActions.setBrewingStatus(status, 'socket'));
  expect(reducer(state, ProductionActions.setBrewingStatus(parseSnapshot(envelope(3)), 'http'))).toBe(state);
  expect(reducer(state, ProductionActions.setBrewingStatus(parseSnapshot(envelope(4)), 'http'))).toBe(state);
  const next = reducer(state, ProductionActions.setBrewingStatus(parseSnapshot(envelope(5, 'epoch-1', 'run-2')), 'socket'));
  expect(next.brewingStatus?.snapshotMetadata?.processInstanceId).toBe('run-2');
  expect(reducer(next, ProductionActions.setBrewingStatus(status, 'http'))).toBe(next);
});

it('changes epoch only through synchronization and rejects retired epochs', () => {
  const old = reducer(initialProductionState, ProductionActions.setBrewingStatus(parseSnapshot(envelope(10)), 'socket'));
  const unknown = reducer(old, ProductionActions.setBrewingStatus(parseSnapshot(envelope(1, 'epoch-2')), 'socket'));
  expect(unknown.brewingStatus).toBe(old.brewingStatus);
  const synced = reducer(unknown, ProductionActions.setBrewingStatus(parseSnapshot(envelope(1, 'epoch-2')), 'sync'));
  expect(synced.brewingStatus?.snapshotMetadata?.controllerEpoch).toBe('epoch-2');
  expect(reducer(synced, ProductionActions.setBrewingStatus(parseSnapshot(envelope(11)), 'sync'))).toBe(synced);
});

it('rejects responses from a previous connection generation', () => {
  const state = reducer(initialProductionState, ProductionActions.socketConnectionChanged(true, 'sid'));
  expect(reducer(state, ProductionActions.setBrewingStatus(parseSnapshot(envelope()), 'sync', 0))).toBe(state);
});

it('telemetry cannot change process state or cross a semantic boundary', () => {
  const status = parseSnapshot(envelope(4))!;
  const sample = {...envelope(5), stateRevision: 4, elapsedTime: 5, temperature: {current: 61, target: 65}, timing: {elapsedTime: 5, remainingTime: 10}};
  const result = mergeTelemetry(sample, status)!;
  expect(result.process).toBe(status.process);
  expect(result.temperature.current).toBe(61);
  expect(mergeTelemetry({...sample, stateRevision: 5}, status)).toBeUndefined();
  expect(mergeTelemetry({...sample, processInstanceId: 'another'}, status)).toBeUndefined();
  expect(mergeTelemetry({...sample, revision: 3}, status)).toBeUndefined();
});

it('HTTP acceptance does not complete confirmation; observed transition does in either response order', () => {
  const waiting = reducer(initialProductionState, ProductionActions.setBrewingStatus(parseSnapshot(envelope()), 'socket'));
  const pending = reducer(waiting, ProductionActions.confirm('Iodine' as any));
  const accepted = reducer(pending, ProductionActions.confirmSuccess());
  expect(accepted.isConfirmPending).toBe(true);
  const next = envelope(2);
  next.status.currentStep.mode = 'HEATING';
  next.status.waiting = {waitingFor: 'NONE', canConfirm: false};
  const completed = reducer(accepted, ProductionActions.setBrewingStatus(parseSnapshot(next), 'socket'));
  expect(completed.confirmation.phase).toBe('Completed');
  expect(completed.isConfirmPending).toBe(false);
  const socketFirst = reducer(pending, ProductionActions.setBrewingStatus(parseSnapshot(next), 'socket'));
  expect(socketFirst.confirmation.phase).toBe('Completed');
  expect(reducer(socketFirst, ProductionActions.confirmSuccess()).isConfirmPending).toBe(false);
});
