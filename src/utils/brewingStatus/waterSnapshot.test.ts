import reducer, {initialProductionState} from '../../reducers/productionReducer';
import {ProductionActions as Actions} from '../../actions/actions';
import {parseWaterSnapshot} from './waterSnapshot';

export const water = (revision = 1, fillId = 'fill-1', state = 'RUNNING', epoch = 'epoch') => ({schemaVersion: 1,
  controllerEpoch: epoch, waterFillingRevision: revision, fillId, mode: 'MASH', state,
  filledLiters: 0.1234, targetLiters: 1, openClose: state === 'RUNNING', reason: null, error: null});

it('validates water and preserves four decimals', () => {
  expect(parseWaterSnapshot(water())?.filledLiters).toBe(0.1234);
  expect(parseWaterSnapshot({...water(), filledLiters: NaN})).toBeUndefined();
});

it('rejects older revisions, retired fill IDs and old connection responses independently of process revision', () => {
  let state = reducer(initialProductionState, Actions.socketConnectionChanged(true));
  const action = (data: any, generation = state.communication.generation) => ({type: Actions.ActionTypes.WATER_SNAPSHOT, payload: {data, generation}} as any);
  state = reducer(state, action(water(5)));
  const status = state.waterStatus;
  state = reducer(state, action(water(4)));
  expect(state.waterStatus).toBe(status);
  state = reducer(state, action(water(6, 'fill-2')));
  state = reducer(state, action(water(7, 'fill-1')));
  expect(state.waterStatus.fillId).toBe('fill-2');
  const before = state;
  expect(reducer(state, action(water(10), 0))).toBe(before);
  expect(state.brewingStatus).toBeUndefined();
});
