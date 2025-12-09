import {ofType} from "redux-observable";
import {ApplicationActions, BeerActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from, of} from "rxjs";
import {BeerRepository} from "../repositorys/BeerRepository";
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
                map(() => HopsActions.submitHopSuccess()),
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

export const hopsEpic = [
    getHopsEpic,
    submitNewHopEpic
]
