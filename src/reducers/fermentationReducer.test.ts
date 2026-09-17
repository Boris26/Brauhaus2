import {FermentationActions} from '../actions/fermentation.actions';
import {fermentationReducer, initialFermentationState} from './fermentationReducer';

describe('fermentationReducer', () => {
  it('tracks display-name saving and errors per device without changing canonical details', () => {
    const requesting = fermentationReducer(initialFermentationState, FermentationActions.updateDeviceDisplayName('sensor-a', 'brew', 'Garage'));
    expect(requesting.updatingDeviceDisplayNameIds).toEqual(['sensor-a']);
    const failed = fermentationReducer(requesting, FermentationActions.updateDeviceDisplayNameFailure('sensor-a', 'brew', 'Sensor-Alias konnte nicht gespeichert werden.'));
    expect(failed.updatingDeviceDisplayNameIds).toEqual([]);
    expect(failed.deviceDisplayNameErrors['sensor-a']).toBe('Sensor-Alias konnte nicht gespeichert werden.');
    expect(failed.byBrewId).toEqual({});
  });
  it('replaces a gateway snapshot and updates exactly one sensor status', () => {
    const first = {deviceUid: 'one', deviceName: 'FERM-1', status: 'UNASSIGNED' as const, updatedAt: '2026-09-11T07:23:11Z'};
    const second = {deviceUid: 'two', deviceName: 'FERM-2', status: 'REGISTERED' as const, updatedAt: '2026-09-11T07:23:11Z'};
    const snapshot = fermentationReducer(initialFermentationState, FermentationActions.gatewaySnapshotReceived([first, second]));
    expect(snapshot.sensorsByDeviceUid).toEqual({one: first, two: second});
    const assigned = {...first, status: 'ASSIGNED' as const};
    const changed = fermentationReducer(snapshot, FermentationActions.gatewaySensorStatusChanged(assigned));
    expect(changed.sensorsByDeviceUid).toEqual({one: assigned, two: second});
    expect(changed.sensorsByDeviceUid.two).toBe(snapshot.sensorsByDeviceUid.two);
  });
  it('keeps snapshot runtime state and updates only that runtime state and timestamp', () => {
    const first = {deviceUid: 'one', deviceName: 'FERM-1', status: 'ASSIGNED' as const, beerId: 'brew-1', measurementState: 'PAUSED' as const, updatedAt: 'old'};
    const second = {deviceUid: 'two', deviceName: 'FERM-2', status: 'REGISTERED' as const, measurementState: 'IDLE' as const, updatedAt: 'old'};
    const snapshot = fermentationReducer(initialFermentationState, FermentationActions.gatewaySnapshotReceived([first, second]));
    expect(snapshot.sensorsByDeviceUid.one.measurementState).toBe('PAUSED');

    const running = fermentationReducer(snapshot, FermentationActions.gatewaySensorRuntimeChanged('one', 'RUNNING', 'running-at'));
    const paused = fermentationReducer(running, FermentationActions.gatewaySensorRuntimeChanged('one', 'PAUSED', 'paused-at'));
    const idle = fermentationReducer(paused, FermentationActions.gatewaySensorRuntimeChanged('one', 'IDLE', 'idle-at'));
    expect(running.sensorsByDeviceUid.one).toMatchObject({deviceName: 'FERM-1', status: 'ASSIGNED', beerId: 'brew-1', measurementState: 'RUNNING', updatedAt: 'running-at'});
    expect(paused.sensorsByDeviceUid.one.measurementState).toBe('PAUSED');
    expect(idle.sensorsByDeviceUid.one.measurementState).toBe('IDLE');
    expect(idle.sensorsByDeviceUid.two).toBe(snapshot.sensorsByDeviceUid.two);
  });
  it('discards the last runtime state when a disconnected status omits it', () => {
    const connected = {deviceUid: 'one', status: 'ASSIGNED' as const, measurementState: 'RUNNING' as const, updatedAt: 'old'};
    const state = fermentationReducer(initialFermentationState, FermentationActions.gatewaySnapshotReceived([connected]));
    const disconnected = fermentationReducer(state, FermentationActions.gatewaySensorStatusChanged({deviceUid: 'one', status: 'DISCONNECTED', updatedAt: 'new'}));
    expect(disconnected.sensorsByDeviceUid.one.measurementState).toBeUndefined();
  });
  it('does not optimistically add measurements', () => {
    const state = fermentationReducer(initialFermentationState, FermentationActions.createMeasurement({finishedBeerId: 'b', measuredAt: '', plato: 4}));
    expect(state.savingMeasurementIds).toEqual(['b']); expect(state.byBrewId.b).toBeUndefined();
  });
  it('appends canonical measurements once and preserves the existing array for duplicates', () => {
    const first = {id: 'm1', finishedBeerId: 'b', measuredAt: '2026-09-17T10:00:00Z', beerTemperatureC: 18, source: 'SENSOR' as const};
    const second = {...first, id: 'm2', measuredAt: '2026-09-17T10:01:00Z'};
    const loaded = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('b', {measurements: [first], actions: [], devices: []}));
    const appended = fermentationReducer(loaded, FermentationActions.measurementsReceived('b', [second]));
    const duplicate = fermentationReducer(appended, FermentationActions.measurementsReceived('b', [second]));
    expect(appended.byBrewId.b.measurements).toEqual([first, second]);
    expect(duplicate).toBe(appended);
  });
  it('does not optimistically complete actions or assignments and exposes failures', () => {
    const completing = fermentationReducer(initialFermentationState, FermentationActions.completeAction('b', 'a'));
    expect(completing.completingActionIds).toEqual(['b/a']); expect(completing.byBrewId.b).toBeUndefined();
    const failed = fermentationReducer(completing, FermentationActions.completeActionFailure('b', 'a', 'HTTP 500'));
    expect(failed.completingActionIds).toEqual([]); expect(failed.completeActionErrors['b/a']).toBe('HTTP 500');
  });
  it('tracks assignment and unassignment independently per device', () => {
    const assigning = fermentationReducer(initialFermentationState, FermentationActions.assignDevice('one', 'b'));
    const parallel = fermentationReducer(assigning, FermentationActions.unassignDevice('two', 'b'));
    expect(parallel.assigningDeviceIds).toEqual(['one']);
    expect(parallel.unassigningDeviceIds).toEqual(['two']);
    const failed = fermentationReducer(parallel, FermentationActions.unassignDeviceFailure('two', 'b', 'HTTP 500'));
    expect(failed.unassigningDeviceIds).toEqual([]);
    expect(failed.assigningDeviceIds).toEqual(['one']);
    expect(failed.unassignmentErrors.b).toBe('HTTP 500');
  });
  it('immediately adopts the canonical action returned by successful completion', () => {
    const pending = {actionId: 'a', sourceType: 'DRY_HOP', status: 'PENDING' as const, due: true};
    const loaded = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('b', {actions: [pending], measurements: [], devices: []}));
    const requesting = fermentationReducer(loaded, FermentationActions.completeAction('b', 'a'));
    const canonical = {...pending, status: 'COMPLETED' as const, due: false, completedAt: '2026-09-13T10:00:00Z', contactEndsAt: '2026-09-16T10:00:00Z'};
    const completed = fermentationReducer(requesting, FermentationActions.completeActionSuccess('b', canonical));
    expect(completed.completingActionIds).toEqual([]);
    expect(completed.byBrewId.b.actions).toEqual([canonical]);
  });
  it('scopes simultaneous completion state to finished beer and action identity', () => {
    const first = fermentationReducer(initialFermentationState, FermentationActions.completeAction('brew-a', 'same-action'));
    const second = fermentationReducer(first, FermentationActions.completeAction('brew-b', 'same-action'));
    expect(second.completingActionIds).toEqual(['brew-a/same-action', 'brew-b/same-action']);
  });
  it('does not optimistically skip actions and clears the pending marker on failure', () => {
    const skipping = fermentationReducer(initialFermentationState, FermentationActions.skipAction('b', 'a'));
    expect(skipping.skippingActionIds).toEqual(['a']); expect(skipping.byBrewId.b).toBeUndefined();
    const failed = fermentationReducer(skipping, FermentationActions.skipActionFailure('b', 'a', 'HTTP 500'));
    expect(failed.skippingActionIds).toEqual([]); expect(failed.errors.b).toBe('HTTP 500');
  });
  it('keeps runtime actions isolated by concrete FinishedBeer.id even for the same recipe action', () => {
    const action = {actionId: 'recipe-action-1', status: 'PENDING'} as any;
    const brewA = {measurements: [], devices: [], actions: [{...action, status: 'COMPLETED'}]};
    const brewB = {measurements: [], devices: [], actions: [action]};
    const afterA = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('brew-a', brewA));
    const afterB = fermentationReducer(afterA, FermentationActions.loadSuccess('brew-b', brewB));
    expect(afterB.byBrewId['brew-a'].actions[0].status).toBe('COMPLETED');
    expect(afterB.byBrewId['brew-b'].actions[0].status).toBe('PENDING');
  });
  it('replaces the backend due projection after Plato reload without completing the action', () => {
    const details = (due: boolean) => ({measurements: [], devices: [], actions: [{actionId: 'plato-action', sourceType: 'ADDITIONAL_INGREDIENT', status: 'PENDING' as const, due, triggerType: 'PLATO_THRESHOLD' as any, triggerValue: 5}]});
    const before = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('brew-a', details(false)));
    const after = fermentationReducer(before, FermentationActions.loadSuccess('brew-a', details(true)));
    expect(before.byBrewId['brew-a'].actions[0]).toMatchObject({status: 'PENDING', due: false});
    expect(after.byBrewId['brew-a'].actions[0]).toMatchObject({status: 'PENDING', due: true});
  });
  it('defaults bubble activity to 24 h and ignores stale range responses', () => {
    const loading = fermentationReducer(initialFermentationState, FermentationActions.loadBubbleActivity('b', '24h'));
    expect(loading.bubbleActivityByBrewId.b).toMatchObject({activity: [], loading: true, selectedRange: '24h'});
    const changed = fermentationReducer(loading, FermentationActions.loadBubbleActivity('b', '6h'));
    expect(fermentationReducer(changed, FermentationActions.loadBubbleActivitySuccess('b', '24h', []))).toBe(changed);
  });
});
