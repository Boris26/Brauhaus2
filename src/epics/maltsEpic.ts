import {ofType} from "redux-observable";
import {ApplicationActions, BeerActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from, of} from "rxjs";
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
                map(() => MaltsActions.submitMaltSuccess()),
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

export const maltsEpic = [
    getMaltsEpic,
    submitNewMaltEpic
]
