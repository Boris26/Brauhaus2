import {Subject} from 'rxjs';
import {BeerActions} from '../actions/actions';
import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew} from '../model/FinishedBrew';
import {FinishedBeerRepository} from '../repositorys/FinishedBeerRepository';
import {updateFinishedBeerEpic} from './beerEpics';

jest.mock('../repositorys/FinishedBeerRepository', () => ({FinishedBeerRepository: {updateFinishedBeer: jest.fn()}}));
const repository = FinishedBeerRepository as jest.Mocked<typeof FinishedBeerRepository>;
const brew = (id: string, note: string): FinishedBrew => ({id, name: id, startDate: '2026-08-27', liters: 10, originalwort: 12, residual_extract: 3, note, active: true, state: eBrewState.FERMENTATION});

describe('updateFinishedBeerEpic', () => {
  it('serializes updates per id while allowing different ids', () => {
    repository.updateFinishedBeer.mockReturnValue(new Promise(() => undefined));
    const action$ = new Subject<BeerActions.UpdateActiveBeer>();
    const subscription = updateFinishedBeerEpic(action$).subscribe();
    action$.next(BeerActions.updateActiveBeer(brew('A', 'first')));
    action$.next(BeerActions.updateActiveBeer(brew('A', 'stale')));
    action$.next(BeerActions.updateActiveBeer(brew('B', 'other')));
    expect(repository.updateFinishedBeer).toHaveBeenCalledTimes(2);
    expect(repository.updateFinishedBeer).toHaveBeenNthCalledWith(1, brew('A', 'first'));
    expect(repository.updateFinishedBeer).toHaveBeenNthCalledWith(2, brew('B', 'other'));
    subscription.unsubscribe();
  });
});
