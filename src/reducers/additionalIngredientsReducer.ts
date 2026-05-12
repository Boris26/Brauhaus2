import {AdditionalIngredient} from "../model/AdditionalIngredient";
import {AdditionalIngredientsActions} from "../actions/additionalIngredients.actions";
import AllAdditionalIngredientsActions = AdditionalIngredientsActions.AllAdditionalIngredientsActions;

export interface AdditionalIngredientsReducerState {
    additionalIngredients: AdditionalIngredient[] | undefined
    isFetching: boolean,
    isSubmitAdditionalIngredientSuccessful: boolean | undefined,
}

export const initialAdditionalIngredientsState: AdditionalIngredientsReducerState = {
    additionalIngredients: undefined,
    isFetching: false,
    isSubmitAdditionalIngredientSuccessful: true,
}

export const additionalIngredientsReducer = (aState: AdditionalIngredientsReducerState = initialAdditionalIngredientsState, aAction: AllAdditionalIngredientsActions) => {
    switch (aAction.type) {
        case AdditionalIngredientsActions.ActionTypes.GET_ADDITIONAL_INGREDIENTS: {
            return {...aState, isFetching: aAction.payload.isFetching};
        }
        case AdditionalIngredientsActions.ActionTypes.GET_ADDITIONAL_INGREDIENTS_SUCCESS: {
            return {...aState, additionalIngredients: aAction.payload.additionalIngredients};
        }
        case AdditionalIngredientsActions.ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS: {
            return {...aState, isSubmitAdditionalIngredientSuccessful: true};
        }
        default:
            return aState;
    }
}
