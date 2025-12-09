import {Yeast} from "../model/Beer";
import {YeastActions} from "../actions/yeast.actions";
import AllYeastActions = YeastActions.AllYeastActions;
import {MaltsActions} from "../actions/malt.actions";

export interface YeastReducerState {
    yeasts: Yeast[] | undefined
    isFetching: boolean,
    isSubmitYeastSuccessful: boolean | undefined,
}

export const initialYeastState: YeastReducerState =
    {
        yeasts: undefined,
        isFetching: false,
        isSubmitYeastSuccessful: true,
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

        default:
            return aState;
    }
}
