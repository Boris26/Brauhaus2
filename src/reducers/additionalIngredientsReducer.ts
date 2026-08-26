import {AdditionalIngredient} from "../model/AdditionalIngredient";
import {AdditionalIngredientsActions} from "../actions/additionalIngredients.actions";
import AllAdditionalIngredientsActions = AdditionalIngredientsActions.AllAdditionalIngredientsActions;

export interface AdditionalIngredientsReducerState {
    additionalIngredients: AdditionalIngredient[] | undefined
    isFetching: boolean,
    isSubmitAdditionalIngredientSuccessful: boolean | undefined,
    isUpdating: boolean,
    updateError?: string,
}

export const initialAdditionalIngredientsState: AdditionalIngredientsReducerState = {
    additionalIngredients: undefined,
    isFetching: false,
    isSubmitAdditionalIngredientSuccessful: true,
    isUpdating: false,
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
        case AdditionalIngredientsActions.ActionTypes.UPDATE_ADDITIONAL_INGREDIENT:
            return {...aState, isUpdating: true, updateError: undefined};
        case AdditionalIngredientsActions.ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_SUCCESS:
            return {...aState, isUpdating: false, updateError: undefined, additionalIngredients: (aState.additionalIngredients || []).map(item => String(item.id) === String(aAction.payload.ingredient.id) ? aAction.payload.ingredient : item)};
        case AdditionalIngredientsActions.ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_ERROR:
            return {...aState, isUpdating: false, updateError: aAction.payload.error};
        case AdditionalIngredientsActions.ActionTypes.RESET_UPDATE:
            return {...aState, isUpdating: false, updateError: undefined};
        default:
            return aState;
    }
}
