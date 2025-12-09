import {Malts} from "../model/Malt";
import {MaltsActions} from "../actions/malt.actions";
import AllMaltsActions = MaltsActions.AllMaltsActions;
import {BeerActions} from "../actions/actions";

export interface MaltsReducerState {
    malts: Malts[] | undefined
    isFetching: boolean,
    isSubmitMaltSuccessful: boolean | undefined,
}

export const initialMaltsState: MaltsReducerState =
    {
        malts: undefined,
        isFetching: false,
        isSubmitMaltSuccessful: true,
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
        default:
            return aState;
    }
}


