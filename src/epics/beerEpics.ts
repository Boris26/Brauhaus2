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
import { FinishedBrewListPdfStrategy } from '../utils/pdf/finishedBrewStrategy';
import {PdfGenerator} from "../utils/pdf/PdfGenerator";
import { BeerPdfStrategy } from '../utils/pdf/shoppingListPdfStrategy';

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

export const submitNewMaltEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.SUBMIT_NEW_MALT),
    mergeMap((action: any) =>
      from(BeerRepository.submitMalt(action.payload.malt)).pipe(
        map(() => BeerActions.submitMaltSuccess(true)),
        catchError((error) => of(BeerActions.getMaltsFailure(error)))
      )
    )
  );

export const submitNewHopEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.SUBMIT_NEW_HOP),
    mergeMap((action: any) =>
      from(BeerRepository.submitHop(action.payload.hop)).pipe(
        map(() => BeerActions.submitHopSuccess(true)),
        catchError((error) => of(BeerActions.getHopsFailure(error)))
      )
    )
  );

export const submitNewYeastEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.SUBMIT_NEW_YEAST),
    mergeMap((action: any) =>
      from(BeerRepository.submitYeast(action.payload.yeast)).pipe(
        map(() => BeerActions.submitYeastSuccess(true)),
        catchError((error) => of(BeerActions.getYeastsFailure(error)))
      )
    )
  );

export const deleteFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.DELETE_FINISHED_BEER),
    mergeMap((action: any) =>
      from(BeerRepository.deleteFinishedBeer(action.payload.finishedBrewId)).pipe(
        map(() => BeerActions.deleteFinishedBeerSuccess(true, action.payload.finishedBrewId)),
        catchError((error) => of(BeerActions.getFinishedBeersFailure(error)))
      )
    )
  );

export const updateFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.UPDATE_ACTIVE_BEER),
    mergeMap((action: any) =>
      from(BeerRepository.updateFinishedBeer(action.payload.beer)).pipe(
        map((beer) => BeerActions.updateFinishedBrewSuccess(beer)),
        catchError((error) => of(BeerActions.getFinishedBeersFailure(error)))
      )
    )
  );

export const sendNewFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.ADD_FINISHED_BREW),
    mergeMap((action: any) =>
      from(BeerRepository.sendNewFinishedBeer(action.payload.finishedBrew)).pipe(
        map(() => BeerActions.getFinishedBeers(true)),
        catchError((error) => of(BeerActions.getFinishedBeersFailure(error)))
      )
    )
  );

export const generateFinishedBrewsPdfEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.GENERATE_FINISHED_BREWS_PDF),
    mergeMap((action: any) => {
      const pdfGenerator = new PdfGenerator(new FinishedBrewListPdfStrategy());
      return from(pdfGenerator.generatePdf(action.payload.finishedBrews, 'Fertig Gebraute'))
        .pipe(
          map(() => BeerActions.generateFinishedBrewsPdfSuccess()),
          catchError((error) => of(BeerActions.generateFinishedBrewsPdfFailure(error)))
        );
    })
  );

export const generateShoppingListPdfEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.GENERATE_SHOPPING_LIST_PDF),
    mergeMap((action: any) => {
      const pdfGenerator = new PdfGenerator(new BeerPdfStrategy());
      return from(pdfGenerator.generatePdf(action.payload.beer, action.payload.beer.name))
        .pipe(
          map(() => BeerActions.generateShoppingListPdfSuccess()),
          catchError((error) => of(BeerActions.generateShoppingListPdfFailure(error)))
        );
    })
  );

export const beerEpics = [
  getBeersEpic,
  submitBeerEpic,
  getMaltsEpic,
  getHopsEpic,
  getYeastsEpic,
  getFinishedBeersEpic,
  submitNewMaltEpic,
  submitNewHopEpic,
  submitNewYeastEpic,
  deleteFinishedBeerEpic,
  updateFinishedBeerEpic,
  sendNewFinishedBeerEpic,
  generateFinishedBrewsPdfEpic,
  generateShoppingListPdfEpic
];
