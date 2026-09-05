import {FermentationActions} from '../actions/fermentation.actions';
import {fermentationReducer, initialFermentationState} from './fermentationReducer';

describe('fermentationReducer', () => {
  it('does not optimistically add measurements', () => {
    const state = fermentationReducer(initialFermentationState, FermentationActions.createMeasurement({finishedBeerId: 'b', measuredAt: '', plato: 4}));
    expect(state.savingMeasurementIds).toEqual(['b']); expect(state.byBrewId.b).toBeUndefined();
  });
  it('does not optimistically complete actions or assignments and exposes failures', () => {
    const completing = fermentationReducer(initialFermentationState, FermentationActions.completeAction('b', 'a'));
    expect(completing.completingActionIds).toEqual(['a']); expect(completing.byBrewId.b).toBeUndefined();
    const failed = fermentationReducer(completing, FermentationActions.completeActionFailure('b', 'a', 'HTTP 500'));
    expect(failed.completingActionIds).toEqual([]); expect(failed.errors.b).toBe('HTTP 500');
  });
  it('does not optimistically skip actions and clears the pending marker on failure', () => {
    const skipping = fermentationReducer(initialFermentationState, FermentationActions.skipAction('b', 'a'));
    expect(skipping.skippingActionIds).toEqual(['a']); expect(skipping.byBrewId.b).toBeUndefined();
    const failed = fermentationReducer(skipping, FermentationActions.skipActionFailure('b', 'a', 'HTTP 500'));
    expect(failed.skippingActionIds).toEqual([]); expect(failed.errors.b).toBe('HTTP 500');
  });
  it('keeps runtime actions isolated by concrete FinishedBeer.id even for the same recipe action', () => {
    const action = {actionId: 'recipe-action-1', status: 'PENDING'} as any;
    const brewA = {measurements: [], devices: [], sensorMeasurements: [], actions: [{...action, status: 'COMPLETED'}]};
    const brewB = {measurements: [], devices: [], sensorMeasurements: [], actions: [action]};
    const afterA = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('brew-a', brewA));
    const afterB = fermentationReducer(afterA, FermentationActions.loadSuccess('brew-b', brewB));
    expect(afterB.byBrewId['brew-a'].actions[0].status).toBe('COMPLETED');
    expect(afterB.byBrewId['brew-b'].actions[0].status).toBe('PENDING');
  });
  it('replaces the backend due projection after Plato reload without completing the action', () => {
    const details = (due: boolean) => ({measurements: [], devices: [], sensorMeasurements: [], actions: [{actionId: 'plato-action', status: 'PENDING' as const, due, triggerType: 'PLATO_THRESHOLD' as any, triggerValue: 5}]});
    const before = fermentationReducer(initialFermentationState, FermentationActions.loadSuccess('brew-a', details(false)));
    const after = fermentationReducer(before, FermentationActions.loadSuccess('brew-a', details(true)));
    expect(before.byBrewId['brew-a'].actions[0]).toMatchObject({status: 'PENDING', due: false});
    expect(after.byBrewId['brew-a'].actions[0]).toMatchObject({status: 'PENDING', due: true});
  });
});
