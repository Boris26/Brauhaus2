import {Subject} from 'rxjs';
import {BeerActions} from '../actions/actions';
import {Beer} from '../model/Beer';
import {BeerRepository} from '../repositorys/BeerRepository';
import {getBeersEpic} from './beerEpics';

jest.mock('../repositorys/BeerRepository', () => ({BeerRepository: {getBeers: jest.fn()}}));
const repository = BeerRepository as jest.Mocked<typeof BeerRepository>;
const deferred = () => { let resolve!: (beers: Beer[]) => void; const promise = new Promise<Beer[]>(r => {resolve = r;}); return {promise, resolve}; };

it('emits only the newest recipe response when refresh requests overlap', async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    repository.getBeers.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const action$ = new Subject<BeerActions.GetBeers>();
    const emitted: BeerActions.AllBeerActions[] = [];
    const subscription = getBeersEpic(action$).subscribe((action: unknown) => emitted.push(action as BeerActions.AllBeerActions));
    action$.next(BeerActions.getBeers(true));
    action$.next(BeerActions.getBeers(true));
    newRequest.resolve([{id: 'new'} as Beer]);
    await Promise.resolve(); await Promise.resolve();
    oldRequest.resolve([{id: 'old'} as Beer]);
    await Promise.resolve(); await Promise.resolve();
    expect(emitted).toEqual([BeerActions.getBeersSuccess([{id: 'new'} as Beer])]);
    subscription.unsubscribe();
});
