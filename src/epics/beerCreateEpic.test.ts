import {Subject} from 'rxjs';
import {BeerActions} from '../actions/actions';
import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew, FinishedBrewCreatePayload} from '../model/FinishedBrew';
import {FinishedBeerRepository} from '../repositorys/FinishedBeerRepository';
import {sendNewFinishedBeerEpic} from './beerEpics';

jest.mock('../repositorys/FinishedBeerRepository', () => ({
    FinishedBeerRepository: {sendNewFinishedBeer: jest.fn()},
}));

const repository = FinishedBeerRepository as jest.Mocked<typeof FinishedBeerRepository>;
const payload: FinishedBrewCreatePayload = {
    name: 'Testbier', startDate: '2026-08-27', liters: 0, originalwort: 0,
    residual_extract: 0, note: '', active: true, beer_id: 'recipe-1',
    state: eBrewState.FERMENTATION, brewValues: '{"groupedData":{"FINISHED":[1]}}',
};

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((aResolve, aReject) => { resolve = aResolve; reject = aReject; });
    return {promise, resolve, reject};
};

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('sendNewFinishedBeerEpic', () => {
    beforeEach(() => jest.clearAllMocks());

    it('allows only one create while a request is running', async () => {
        const request = deferred<FinishedBrew>();
        repository.sendNewFinishedBeer.mockReturnValue(request.promise);
        const action$ = new Subject<BeerActions.AddFinishedBrew>();
        const subscription = sendNewFinishedBeerEpic(action$).subscribe();

        action$.next(BeerActions.addFinishedBrew(payload));
        action$.next(BeerActions.addFinishedBrew(payload));
        expect(repository.sendNewFinishedBeer).toHaveBeenCalledTimes(1);
        expect(repository.sendNewFinishedBeer).toHaveBeenCalledWith(payload);

        request.resolve({...payload, id: 'brew-1'});
        await flush();
        subscription.unsubscribe();
    });

    it('emits failure, then retries with the same payload', async () => {
        repository.sendNewFinishedBeer
            .mockRejectedValueOnce(new Error('network error'))
            .mockResolvedValueOnce({...payload, id: 'brew-1'});
        const action$ = new Subject<BeerActions.AddFinishedBrew>();
        const emitted: BeerActions.AllBeerActions[] = [];
        const subscription = sendNewFinishedBeerEpic(action$).subscribe(action => emitted.push(action as BeerActions.AllBeerActions));

        action$.next(BeerActions.addFinishedBrew(payload));
        await flush();
        action$.next(BeerActions.addFinishedBrew(payload));
        await flush();

        expect(repository.sendNewFinishedBeer).toHaveBeenNthCalledWith(1, payload);
        expect(repository.sendNewFinishedBeer).toHaveBeenNthCalledWith(2, payload);
        expect(emitted).toContainEqual(BeerActions.addFinishedBrewFailure('network error'));
        expect(emitted).toContainEqual(BeerActions.addFinishedBrewSuccess({...payload, id: 'brew-1'}));
        subscription.unsubscribe();
    });
});
