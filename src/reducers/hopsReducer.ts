import {Malts} from "../model/Malt";
import {MaltsActions} from "../actions/malt.actions";
import {Hops} from "../model/Hops";
import {HopsActions} from "../actions/hops.actions";
import AllHopsActions = HopsActions.AllHopsActions;
import {BeerActions} from "../actions/actions";

export interface HopsReducerState {
    hops: Hops[] | undefined
    isFetching: boolean,
    isSubmitHopSuccessful: boolean | undefined,
}

export const initialHopsState: HopsReducerState =
    {
        hops: undefined,
        isFetching: false,
        isSubmitHopSuccessful: true,
    }
export const hopsReducer =(aState: HopsReducerState = initialHopsState, aAction: AllHopsActions)=>{
    switch (aAction.type) {
        case HopsActions.ActionTypes.GET_HOPS: {
            return {...aState, isFetching: aAction.payload.isFetching};
        }
        case HopsActions.ActionTypes.GET_HOPS_SUCCESS: {
            return {...aState, hops: aAction.payload.hops};
        }
        case HopsActions.ActionTypes.SUBMIT_NEW_HOP: {
            return {...aState};
        }
        case HopsActions.ActionTypes.SUBMIT_NEW_HOP_SUCCESS: {
            return {...aState, isSubmitHopSuccessful: true};
        }
        default:
            return aState;
    }
}
