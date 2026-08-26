import {Malts} from "../model/Malt";
import {MaltsActions} from "../actions/malt.actions";
import AllMaltsActions = MaltsActions.AllMaltsActions;

export interface MaltsReducerState {
    malts: Malts[] | undefined
    isFetching: boolean,
    isSubmitMaltSuccessful: boolean | undefined,
    isUpdating: boolean,
    updateError?: string,
}

export const initialMaltsState: MaltsReducerState =
    {
        malts: undefined,
        isFetching: false,
        isSubmitMaltSuccessful: true,
        isUpdating: false,
    }
export const maltsReducer =(aState: MaltsReducerState = initialMaltsState, aAction: AllMaltsActions)=>{
    switch (aAction.type)
    { case MaltsActions.ActionTypes.GET_MALTS: {
        return { ...aState, isFetching: aAction.payload.isFetching };
    }


        case MaltsActions.ActionTypes.GET_MALTS_SUCCESS: {
            return { ...aState, malts: aAction.payload.malts};
        }


        case MaltsActions.ActionTypes.SUBMIT_NEW_MALT: {
            return { ...aState };
        }


        case MaltsActions.ActionTypes.SUBMIT_NEW_MALT_SUCCESS: {
            return { ...aState, isSubmitMaltSuccessful: true };
        }
        case MaltsActions.ActionTypes.UPDATE_MALT:
            return {...aState, isUpdating: true, updateError: undefined};
        case MaltsActions.ActionTypes.UPDATE_MALT_SUCCESS:
            return {...aState, isUpdating: false, updateError: undefined, malts: (aState.malts || []).map(item => String(item.id) === String(aAction.payload.malt.id) ? aAction.payload.malt : item)};
        case MaltsActions.ActionTypes.UPDATE_MALT_ERROR:
            return {...aState, isUpdating: false, updateError: aAction.payload.error};
        case MaltsActions.ActionTypes.RESET_UPDATE:
            return {...aState, isUpdating: false, updateError: undefined};
        default:
            return aState;
    }
}

