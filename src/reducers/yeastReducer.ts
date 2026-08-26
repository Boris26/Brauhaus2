import {Yeast} from "../model/Beer";
import {YeastActions} from "../actions/yeast.actions";
import AllYeastActions = YeastActions.AllYeastActions;

export interface YeastReducerState {
    yeasts: Yeast[] | undefined
    isFetching: boolean,
    isSubmitYeastSuccessful: boolean | undefined,
    isUpdating: boolean,
    updateError?: string,
}

export const initialYeastState: YeastReducerState =
    {
        yeasts: undefined,
        isFetching: false,
        isSubmitYeastSuccessful: true,
        isUpdating: false,
    }
export const yeastReducer =(aState: YeastReducerState = initialYeastState, aAction: AllYeastActions)=>{
    switch (aAction.type)
    {
        case YeastActions.ActionTypes.GET_YEASTS: {
            return { ...aState, isFetching: aAction.payload.isFetching };
        }

        case YeastActions.ActionTypes.GET_YEASTS_SUCCESS: {
            return {...aState, yeasts: aAction.payload.yeasts};
        }

        case YeastActions.ActionTypes.SUBMIT_NEW_YEAST: {
            return { ...aState };
        }

        case YeastActions.ActionTypes.SUBMIT_NEW_YEAST_SUCCESS: {
            return { ...aState, isSubmitYeastSuccessful: true };
        }
        case YeastActions.ActionTypes.UPDATE_YEAST:
            return {...aState, isUpdating: true, updateError: undefined};
        case YeastActions.ActionTypes.UPDATE_YEAST_SUCCESS:
            return {...aState, isUpdating: false, updateError: undefined, yeasts: (aState.yeasts || []).map(item => String(item.id) === String(aAction.payload.yeast.id) ? aAction.payload.yeast : item)};
        case YeastActions.ActionTypes.UPDATE_YEAST_ERROR:
            return {...aState, isUpdating: false, updateError: aAction.payload.error};
        case YeastActions.ActionTypes.RESET_UPDATE:
            return {...aState, isUpdating: false, updateError: undefined};

        default:
            return aState;
    }
}
