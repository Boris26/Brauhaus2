import {Subject} from 'rxjs';
import {toArray} from 'rxjs/operators';
import {BeerActions} from '../actions/actions';
import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew} from '../model/FinishedBrew';
import {FinishedBeerRepository} from '../repositorys/FinishedBeerRepository';
import {startFermentationEpic} from './beerEpics';

jest.mock('../repositorys/FinishedBeerRepository', () => ({FinishedBeerRepository: {startFermentation: jest.fn()}}));
const repository = FinishedBeerRepository as jest.Mocked<typeof FinishedBeerRepository>;
const canonical: FinishedBrew = {id: 'brew-1', name: 'IPA', startDate: '2026-09-11', fermentationStartedAt: '2026-09-12T09:10:11+02:00', liters: 20, originalwort: 13, residual_extract: null, note: '', active: true, state: eBrewState.FERMENTATION};

describe('startFermentationEpic', () => {
  beforeEach(() => jest.resetAllMocks());

  it('requests the dedicated command and forwards the canonical response unchanged', done => {
    repository.startFermentation.mockResolvedValue(canonical);
    const action$ = new Subject<BeerActions.StartFermentation>();
    startFermentationEpic(action$).pipe(toArray()).subscribe((actions: BeerActions.AllBeerActions[]) => {
      expect(repository.startFermentation).toHaveBeenCalledWith('brew-1');
      expect(actions).toEqual([BeerActions.startFermentationSuccess(canonical, 'brew-1')]);
      done();
    });
    action$.next(BeerActions.startFermentation('brew-1'));
    action$.complete();
  });

  it('does not create a timestamp or lifecycle update when the request fails', done => {
    repository.startFermentation.mockRejectedValue(new Error('HTTP 500'));
    const action$ = new Subject<BeerActions.StartFermentation>();
    startFermentationEpic(action$).pipe(toArray()).subscribe((actions: BeerActions.AllBeerActions[]) => {
      expect(actions[0]).toMatchObject({type: BeerActions.ActionTypes.START_FERMENTATION_FAILURE, payload: {requestedId: 'brew-1', message: expect.any(String)}});
      expect(actions.some((action: BeerActions.AllBeerActions) => action.type === BeerActions.ActionTypes.START_FERMENTATION_SUCCESS)).toBe(false);
      done();
    });
    action$.next(BeerActions.startFermentation('brew-1'));
    action$.complete();
  });
});
