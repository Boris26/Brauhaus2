import { ofType } from 'redux-observable';
import {of, from} from 'rxjs';
import { catchError, exhaustMap, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import {ApplicationActions, BeerActions} from '../actions/actions';
import { BeerRepository } from '../repositorys/BeerRepository';
import {Beer} from "../model/Beer";
import { extractBeerErrorMessage, resolveSubmittedBeer } from "../utils/beerSubmission";
import {FinishedBrew} from "../model/FinishedBrew";
import { FinishedBrewListPdfStrategy } from '../utils/pdf/finishedBrewStrategy';
import {PdfGenerator} from "../utils/pdf/PdfGenerator";
import { BeerPdfStrategy } from '../utils/pdf/shoppingListPdfStrategy';
import {FinishedBeerRepository} from "../repositorys/FinishedBeerRepository";
import {getRecipeImportErrorMessage} from '../utils/recipeImport';

/**
 * Epic to handle the GET_BEERS action.
 * @param action$ - The stream of actions.
 */
export const getBeersEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.GET_BEERS),
        switchMap(() =>
            from(BeerRepository.getBeers()).pipe(map((beers: Beer[]) =>BeerActions.getBeersSuccess(beers)),
                catchError((aError: Error) =>
                    from([
                        BeerActions.getBeersFailure(),
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
        switchMap(() =>
        from(FinishedBeerRepository.getFinishedBeers()).pipe(
            map((finishedBeers: FinishedBrew[]) => BeerActions.getFinishedBeersSuccess(finishedBeers)),
            catchError((aError) => from([
                BeerActions.getFinishedBeersFailure(),
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
        exhaustMap((aAction: any) =>
            from(BeerRepository.submitBeer(aAction.payload.beer)).pipe(
                map((aResponse) => BeerActions.submitBeerSuccess(resolveSubmittedBeer(aAction.payload.beer, aResponse))),
                catchError((aError: Error) =>
                    from([
                        BeerActions.isSubmitSuccessful(false, extractBeerErrorMessage(aError, "Bier konnte nicht gespeichert werden"), "error"),
                        ApplicationActions.openErrorDialog(
                            true,
                            "Bier fehler",
                            extractBeerErrorMessage(aError, "Bier konnte nicht gespeichert werden")
                        )
                    ])
                )
            )
        )
    );









export const deleteFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.DELETE_FINISHED_BEER),
    groupBy((action: any) => action.payload.finishedBrewId),
    mergeMap((actionsForBrew$: any) => actionsForBrew$.pipe(exhaustMap((action: any) =>
      from(FinishedBeerRepository.deleteFinishedBeer(action.payload.finishedBrewId)).pipe(
        map(() => BeerActions.deleteFinishedBeerSuccess(true, action.payload.finishedBrewId)),
          catchError((aError: Error) =>
              from([
                  BeerActions.deleteFinishedBeerFailure(action.payload.finishedBrewId, aError.message),
                  ApplicationActions.openErrorDialog(
                      true,
                      "Fertige Bier fehler",
                      "Fertiges Bier konnte nicht gelöscht werden: " + aError.message
                  )
              ])
          )
      ))
    ))
  );

export const updateFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.UPDATE_ACTIVE_BEER),
    groupBy((action: any) => action.payload.beer.id),
    mergeMap((actionsForBrew$: any) => actionsForBrew$.pipe(
      exhaustMap((action: any) =>
        from(FinishedBeerRepository.updateFinishedBeer(action.payload.beer)).pipe(
          map((beer) => BeerActions.updateFinishedBrewSuccess({...action.payload.beer, ...beer}, action.payload.beer.id)),
          catchError((aError: Error) => from([
              BeerActions.updateFinishedBrewFailure(action.payload.beer.id, aError.message),
              ApplicationActions.openErrorDialog(true, "Bier fehler", "Submit Bier: " + aError.message)
          ]))
        )
      )
    ))
  )
;

export const sendNewFinishedBeerEpic = (action$: any) =>
  action$.pipe(
    ofType(BeerActions.ActionTypes.ADD_FINISHED_BREW),
    exhaustMap((action: any) =>
      from(FinishedBeerRepository.sendNewFinishedBeer(action.payload.finishedBrew)).pipe(
        map((beer) => BeerActions.addFinishedBrewSuccess({...action.payload.finishedBrew, ...beer})),
        catchError((aError: Error) =>  from([
            BeerActions.addFinishedBrewFailure(aError.message),
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
            from(BeerRepository.importBeer(aAction.payload.request)).pipe(
                map((result) => BeerActions.addImportedBeer(result)),
                catchError((aError) => of(BeerActions.importBeerFailed(getRecipeImportErrorMessage(aError))))
            )
        )
    );

export const deleteBeerEpic = (action$: any) =>
    action$.pipe(
        ofType(BeerActions.ActionTypes.DELETE_BEER),
        mergeMap((action: any) =>
            from(BeerRepository.deleteBeer(action.payload.beerId)).pipe(
                map(() => BeerActions.deleteBeerSuccess(action.payload.beerId)),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Bier fehler",
                            "Bier konnte nicht gelöscht werden: " + aError.message
                        )
                    ])
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
  importBeerEpic,
  deleteBeerEpic
];
