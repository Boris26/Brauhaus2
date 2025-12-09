import {ofType} from "redux-observable";
import {ApplicationActions, BeerActions} from "../actions/actions";
import {catchError, map, mergeMap} from "rxjs/operators";
import {from, of} from "rxjs";
import {BeerRepository} from "../repositorys/BeerRepository";
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
                map(() => YeastActions.submitYeastSuccess()),
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

export const yeastEpic =[
    getYeastsEpic,
    submitNewYeastEpic
]
