import { ofType } from 'redux-observable';
import {fromEvent, of, from} from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import {ApplicationActions, BeerActions} from '../actions/actions';
import { BeerRepository } from '../repositorys/BeerRepository';
import {Beer} from "../model/Beer";
import {FinishedBrew} from "../model/FinishedBrew";
import { FinishedBrewListPdfStrategy } from '../utils/pdf/finishedBrewStrategy';
import {PdfGenerator} from "../utils/pdf/PdfGenerator";
import { BeerPdfStrategy } from '../utils/pdf/shoppingListPdfStrategy';
import {FinishedBeerRepository} from "../repositorys/FinishedBeerRepository";

/**
 * Epic to handle the GET_BEERS action.
 * @param action$ - The stream of actions.
 */
export const getBeersEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_BEERS),
        mergeMap(() =>
            from(BeerRepository.getBeers()).pipe(map((beers: Beer[]) =>BeerActions.getBeersSuccess(beers)),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Bier fehler",
                            "Get Bier: " + aError.message
                        )
                    ])
                )
            )
        )
    );

export const getFinishedBeersEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_FINISHED_BEERS),
        mergeMap(() =>
        from(FinishedBeerRepository.getFinishedBeers()).pipe(
            map((finishedBeers: FinishedBrew[]) => BeerActions.getFinishedBeersSuccess(finishedBeers)),
            catchError((aError) => from([
                ApplicationActions.openErrorDialog(
                    true,
                    "Bier fehler",
                    "Get Fertiges Bier: " + aError.message
                )
            ]))
        )
        )
    );

export const submitBeerEpic = (aAction$: any) =>
    aAction$.pipe(
        ofType(BeerActions.ActionTypes.SUBMIT_BEER),
        mergeMap((aAction: any) =>
            from(BeerRepository.submitBeer(aAction.payload.beer)).pipe(
                map(() => BeerActions.submitBeerSuccess()),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Bier fehler",
                            "Submit Bier: " + aError.message
                        )
                    ])
                )
            )
        )
    );









export const deleteFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.DELETE_FINISHED_BEER),
    mergeMap((action: any) =>
      from(FinishedBeerRepository.deleteFinishedBeer(action.payload.finishedBrewId)).pipe(
        map(() => BeerActions.deleteFinishedBeerSuccess(true, action.payload.finishedBrewId)),
          catchError((aError: Error) =>
              from([
                  ApplicationActions.openErrorDialog(
                      true,
                      "Fertige Bier fehler",
                      "Fertiges Bier konnte nicht gelöscht werden: " + aError.message
                  )
              ])
          )
      )
    )
  );

export const updateFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.UPDATE_ACTIVE_BEER),
    mergeMap((action: any) =>
      from(FinishedBeerRepository.updateFinishedBeer(action.payload.beer)).pipe(
        map((beer) => BeerActions.updateFinishedBrewSuccess(beer)),
        catchError((aError: Error) =>  from([
            ApplicationActions.openErrorDialog(
                true,
                "Bier fehler",
                "Submit Bier: " + aError.message
            )
        ])
      )
    )
  )
  )
;

export const sendNewFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.ADD_FINISHED_BREW),
    mergeMap((action: any) =>
      from(FinishedBeerRepository.sendNewFinishedBeer(action.payload.finishedBrew)).pipe(
        map(() => BeerActions.getFinishedBeers(true)),
        catchError((aError: Error) =>  from([
            ApplicationActions.openErrorDialog(
                true,
                "Bier fehler",
                "Fertiges Bier: " + aError.message
            )
        ])
      )
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

export const importBeerEpic = (aAction$: any) =>
    aAction$.pipe(
        ofType(BeerActions.ActionTypes.IMPORT_BEER),
        mergeMap((aAction: any) =>
            from(BeerRepository.importBeer(aAction.payload.file)).pipe(
                map((aResponse) => BeerActions.addImportedBeer(aResponse)),
                catchError((aError: Error) =>
                    of(ApplicationActions.openErrorDialog(
                        true,
                        "Import Fehler",
                        aError.message
                    ))
                )
            )
        )
    );


export const beerEpics = [
  getBeersEpic,
  submitBeerEpic,
  getFinishedBeersEpic,
  deleteFinishedBeerEpic,
  updateFinishedBeerEpic,
  sendNewFinishedBeerEpic,
  generateFinishedBrewsPdfEpic,
  generateShoppingListPdfEpic,
  importBeerEpic
];
