import {ofType} from "redux-observable";
import {ApplicationActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from} from "rxjs";
import {getIngredientUpdateError} from "./ingredientUpdateError";
import {MaltsActions} from "../actions/malt.actions";
import {Malts} from "../model/Malt";
import {MaltRepository} from "../repositorys/MaltRepository";

/**
 * Epic to handle the GET_MALTS action.
 * @param action$ - The stream of actions.
 */
export const getMaltsEpic = (action$: any) =>
    action$.pipe(
        ofType(MaltsActions.ActionTypes.GET_MALTS),
        mergeMap(() =>
            from(MaltRepository.getMalts()).pipe(map((malts: Malts[]) => MaltsActions.getMaltsSuccess(malts)
                ),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Malz fehler",
                            "Get Malz: "+ aError.message
                        )
                    ])
                )
            )
        )
    );

export const submitNewMaltEpic = (action$: any) =>
    action$.pipe(
        ofType(MaltsActions.ActionTypes.SUBMIT_NEW_MALT),
        mergeMap((action: any) =>
            from(MaltRepository.submitMalt(action.payload.malt)).pipe(
                mergeMap(() => from([MaltsActions.submitMaltSuccess(), MaltsActions.getMalts(true)])),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Malz fehler",
                            "Submit Malz: "+ aError.message
                        )
                    ])
                )
            )
        )
    );

export const deleteMaltByIdEpic = (action$: any) =>
    action$.pipe(
        ofType(MaltsActions.ActionTypes.DELETE_MALTS_BY_ID),
        mergeMap((aAction: any) =>
            from(MaltRepository.deleteMaltById(aAction.payload.maltsId)).pipe(
                mergeMap(() =>
                    from([
                        MaltsActions.getMalts(true)
                    ])
                ),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Malz fehler",
                            "Delete Malz: " + aError.message
                        )
                    ])
                )
            )
        )
    );


export const updateIngredientEpic = (action$: any) =>
    action$.pipe(
        ofType(MaltsActions.ActionTypes.UPDATE_MALT),
        mergeMap((action: any) => from(MaltRepository.updateMalt(action.payload.id, action.payload.data)).pipe(
            mergeMap((updated: any) => from([
                MaltsActions.updateMaltsSuccess(updated),
                ApplicationActions.setMessage("Malz erfolgreich aktualisiert.")
            ])),
            catchError((error: unknown) => from([MaltsActions.updateMaltsError(getIngredientUpdateError(error))]))
        ))
    );

export const maltsEpic = [
    getMaltsEpic,
    submitNewMaltEpic,
    deleteMaltByIdEpic,
    updateIngredientEpic
]
