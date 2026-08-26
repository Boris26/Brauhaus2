import {ofType} from "redux-observable";
import {ApplicationActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from} from "rxjs";
import {getIngredientUpdateError} from "./ingredientUpdateError";
import {YeastActions} from "../actions/yeast.actions";
import {Yeasts} from "../model/Yeasts";
import {YeastRepository} from "../repositorys/YeastRepository";

/**
 * Epic to handle the GET_YEASTS action.
 * @param action$ - The stream of actions.
 */
export const getYeastsEpic = (action$: any) =>
    action$.pipe(
        ofType(YeastActions.ActionTypes.GET_YEASTS),
        mergeMap((action: any) =>
            from(YeastRepository.getYeasts()).pipe(map((yeasts : Yeasts[]) => YeastActions.getYeastsSuccess(yeasts)
                ),
                catchError((aError) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hefe fehler",
                            "Get Yeast: "+ aError.message
                        )
                    ])
            )
        )
    )
    );

export const submitNewYeastEpic = (action$: any) =>
    action$.pipe(
        ofType(YeastActions.ActionTypes.SUBMIT_NEW_YEAST),
        mergeMap((action: any) =>
            from(YeastRepository.submitYeast(action.payload.yeast)).pipe(
                mergeMap(() => from([YeastActions.submitYeastSuccess(), YeastActions.getYeasts(true)])),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hefe fehler",
                            "Submit Yeast: "+ aError.message
                        )
                    ])
                )
            )
        )
    );

export const deleteYeastByIdEpic = (action$: any) =>
    action$.pipe(
        ofType(YeastActions.ActionTypes.DELETE_YEAST_BY_ID),
        mergeMap((aAction: any) =>
            from(YeastRepository.deleteYeastById(aAction.payload.yeastId)).pipe(
                mergeMap(() =>
                    from([
                        YeastActions.getYeasts(true)
                    ])
                ),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hefe fehler",
                            "Delete Hefe: " + aError.message
                        )
                    ])
                )
            )
        )
    );


export const updateIngredientEpic = (action$: any) =>
    action$.pipe(
        ofType(YeastActions.ActionTypes.UPDATE_YEAST),
        mergeMap((action: any) => from(YeastRepository.updateYeast(action.payload.id, action.payload.data)).pipe(
            mergeMap((updated: any) => from([
                YeastActions.updateYeastsSuccess(updated),
                ApplicationActions.setMessage("Hefe erfolgreich aktualisiert.")
            ])),
            catchError((error: unknown) => from([YeastActions.updateYeastsError(getIngredientUpdateError(error))]))
        ))
    );

export const yeastEpic =[
    getYeastsEpic,
    submitNewYeastEpic,
    deleteYeastByIdEpic,
    updateIngredientEpic
]
