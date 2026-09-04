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
});
