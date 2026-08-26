import {Hops} from "../model/Hops";
import {HopsActions} from "../actions/hops.actions";
import AllHopsActions = HopsActions.AllHopsActions;

export interface HopsReducerState {
    hops: Hops[] | undefined
    isFetching: boolean,
    isSubmitHopSuccessful: boolean | undefined,
    isUpdating: boolean,
    updateError?: string,
}

export const initialHopsState: HopsReducerState =
    {
        hops: undefined,
        isFetching: false,
        isSubmitHopSuccessful: true,
        isUpdating: false,
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
        case HopsActions.ActionTypes.UPDATE_HOP:
            return {...aState, isUpdating: true, updateError: undefined};
        case HopsActions.ActionTypes.UPDATE_HOP_SUCCESS:
            return {...aState, isUpdating: false, updateError: undefined, hops: (aState.hops || []).map(item => String(item.id) === String(aAction.payload.hop.id) ? aAction.payload.hop : item)};
        case HopsActions.ActionTypes.UPDATE_HOP_ERROR:
            return {...aState, isUpdating: false, updateError: aAction.payload.error};
        case HopsActions.ActionTypes.RESET_UPDATE:
            return {...aState, isUpdating: false, updateError: undefined};
        default:
            return aState;
    }
}
