import {ofType} from "redux-observable";
import {ApplicationActions} from "../actions/actions";
import {catchError, mergeMap} from "rxjs/operators";
import {from} from "rxjs";
import {AdditionalIngredientsActions} from "../actions/additionalIngredients.actions";
import {AdditionalIngredientRepository} from "../repositorys/AdditionalIngredientRepository";
import {AdditionalIngredient} from "../model/AdditionalIngredient";

export const getAdditionalIngredientsEpic = (action$: any) =>
    action$.pipe(
        ofType(AdditionalIngredientsActions.ActionTypes.GET_ADDITIONAL_INGREDIENTS),
        mergeMap(() =>
            from(AdditionalIngredientRepository.getAdditionalIngredients()).pipe(
                mergeMap((aIngredients: AdditionalIngredient[]) => from([
                    AdditionalIngredientsActions.getAdditionalIngredientsSuccess(aIngredients)
                ])),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Weitere Zutaten Fehler",
                            "Get AdditionalIngredients: " + aError.message
                        )
                    ])
                )
            )
        )
    );

export const submitNewAdditionalIngredientEpic = (action$: any) =>
    action$.pipe(
        ofType(AdditionalIngredientsActions.ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT),
        mergeMap((aAction: any) =>
            from(AdditionalIngredientRepository.submitAdditionalIngredient(aAction.payload.ingredient)).pipe(
                // Nach erfolgreichem Anlegen laden wir die Liste neu, damit der State sicher aktuell ist.
                mergeMap(() => from([
                    AdditionalIngredientsActions.submitNewAdditionalIngredientSuccess(),
                    AdditionalIngredientsActions.getAdditionalIngredients(true)
                ])),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Weitere Zutaten Fehler",
                            "Submit AdditionalIngredient: " + aError.message
                        )
                    ])
                )
            )
        )
    );

export const additionalIngredientsEpic = [
    getAdditionalIngredientsEpic,
    submitNewAdditionalIngredientEpic
]
