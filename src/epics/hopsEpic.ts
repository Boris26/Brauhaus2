import {ofType} from "redux-observable";
import {ApplicationActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from} from "rxjs";
import {getIngredientUpdateError} from "./ingredientUpdateError";
import {HopsActions} from "../actions/hops.actions";
import {Hops} from "../model/Hops";
import {HopRepository} from "../repositorys/HopRepository";

/**
 * Epic to handle the GET_HOPS action.
 * @param action$ - The stream of actions.
 */
export const getHopsEpic = (action$: any) =>
    action$.pipe(
        ofType(HopsActions.ActionTypes.GET_HOPS),
        mergeMap(() =>
            from(HopRepository.getHops()).pipe(map((hops: Hops[]) => HopsActions.getHopsSuccess(hops)
                ),
                catchError((aError: Error)=>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hopfen fehler",
                            "Get Hops: "+ aError.message
                        )
                    ])
                )
            )
        )
    );

export const submitNewHopEpic = (action$: any) =>
    action$.pipe(
        ofType(HopsActions.ActionTypes.SUBMIT_NEW_HOP),
        mergeMap((action: any) =>
            from(HopRepository.submitHop(action.payload.hop)).pipe(
                mergeMap(() => from([HopsActions.submitHopSuccess(), HopsActions.getHops(true)])),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hopfen fehler",
                            "Submit Hops: "+ aError.message
                        )
                    ])
                )
            )
        )
    );

export const deleteHopByIdEpic = (action$: any) =>
    action$.pipe(
        ofType(HopsActions.ActionTypes.DELETE_HOPS_BY_ID),
        mergeMap((aAction: any) =>
            from(HopRepository.deleteHopById(aAction.payload.hopsId)).pipe(
                mergeMap(() =>
                    from([
                        HopsActions.getHops(true)
                    ])
                ),
                catchError((aError: Error) =>
                    from([
                        ApplicationActions.openErrorDialog(
                            true,
                            "Hopfen fehler",
                            "Delete Hopfen: " + aError.message
                        )
                    ])
                )
            )
        )
    );


export const updateIngredientEpic = (action$: any) =>
    action$.pipe(
        ofType(HopsActions.ActionTypes.UPDATE_HOP),
        mergeMap((action: any) => from(HopRepository.updateHop(action.payload.id, action.payload.data)).pipe(
            mergeMap((updated: any) => from([
                HopsActions.updateHopsSuccess(updated),
                ApplicationActions.setMessage("Hopfen erfolgreich aktualisiert.")
            ])),
            catchError((error: unknown) => from([HopsActions.updateHopsError(getIngredientUpdateError(error))]))
        ))
    );

export const hopsEpic = [
    getHopsEpic,
    submitNewHopEpic,
    deleteHopByIdEpic,
    updateIngredientEpic
]
