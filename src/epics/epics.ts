import {EMPTY, mergeMap, Observable} from "rxjs";
import {combineEpics, Epic, ofType} from "redux-observable";
import {BeerActions} from "../actions/actions";
import {Action, AnyAction} from 'redux'
import {Repository} from "../repositorys/Repository";
import SubmitBeer = BeerActions.SubmitBeer;

export function submitNewBeer$(aAction$: Observable<BeerActions.SubmitBeer>, ): Observable<string | null>
{
 return aAction$.pipe(
     ofType(BeerActions.ActionTypes.SUBMIT_BEER),
    mergeMap((aAction : BeerActions.SubmitBeer) => {
            return Repository.submitBeer$(aAction.payload.beer);
                }));


}
export const epics: (aAction$: Observable<BeerActions.SubmitBeer>) => Observable<string | null> = submitNewBeer$;


export default epics;
