import { ofType } from 'redux-observable';
import {from, of, tap} from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { BeerActions } from '../actions/actions';
import { BeerRepository } from '../repositorys/BeerRepository';
import {Beer} from "../model/Beer";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {Yeasts} from "../model/Yeasts";
import {FinishedBrew} from "../model/FinishedBrew";

/**
 * Epic to handle the GET_BEERS action.
 * @param action$ - The stream of actions.
 */
export const getBeersEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_BEERS),
        mergeMap(() =>
            from(BeerRepository.getBeers()).pipe(
                map((beers: Beer[] | undefined) => BeerActions.getBeersSuccess(beers ?? [])),
                catchError((error) =>
                    of(BeerActions.getBeersFailure(error?.message || 'Unbekannter Fehler'))
                )
            )
        )
    );

/**
 * Epic to handle the GET_MALTS action.
 * @param action$ - The stream of actions.
 */
export const getMaltsEpic= (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_MALTS),
        mergeMap(() =>
            from(BeerRepository.getMalts()).pipe(
                map((malts: Malts[] | undefined ) => BeerActions.getMaltsSuccess(malts ?? [], true)),
                catchError((error) => of(BeerActions.getMaltsFailure(error)))
            )
        )
    );

/**
 * Epic to handle the GET_HOPS action.
 * @param action$ - The stream of actions.
 */
export const getHopsEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_HOPS),
        mergeMap((action: any) =>
            from(BeerRepository.getHops()).pipe(
                map((hops: Hops[] | undefined) => BeerActions.getHopsSuccess(hops ?? [], true)),
                catchError((error) => of(BeerActions.getHopsFailure(error)))
            )
        )
    );

/**
 * Epic to handle the GET_YEASTS action.
 * @param action$ - The stream of actions.
 */
export const getYeastsEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_YEASTS),
        mergeMap((action: any) =>
            from(BeerRepository.getYeasts()).pipe(
                map((yeasts : Yeasts[] | undefined) => BeerActions.getYeastsSuccess(yeasts ?? [], true)),
                catchError((error) => of(BeerActions.getYeastsFailure(error)))
            )
        )
    );

export const getFinishedBeersEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_FINISHED_BEERS),
        mergeMap(() =>
        from(BeerRepository.getFinishedBeers()).pipe(
            map((finishedBeers: FinishedBrew[] | undefined) => BeerActions.getFinishedBeersSuccess(finishedBeers ?? [])),
            catchError((error) => of(BeerActions.getFinishedBeersFailure(error)))
        )
        )
    );

export const submitBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.SUBMIT_BEER),
    mergeMap((action: any) =>
      from(BeerRepository.submitBeer(action.payload.beer)).pipe(
        map(() => BeerActions.submitBeerSuccess(true)),
        catchError((error) => of(BeerActions.submitBeerFailure(error)))
      )
    )
  );







export const beerEpics = [
  getBeersEpic,
  submitBeerEpic,
  getMaltsEpic,
  getHopsEpic,
  getYeastsEpic,
  getFinishedBeersEpic
];
