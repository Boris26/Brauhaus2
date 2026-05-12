import {AdditionalIngredient, AdditionalIngredientCreatePayload} from "../model/AdditionalIngredient";

export namespace AdditionalIngredientsActions {
    export enum ActionTypes {
        GET_ADDITIONAL_INGREDIENTS = 'AdditionalIngredientsActions.GET_ADDITIONAL_INGREDIENTS',
        GET_ADDITIONAL_INGREDIENTS_SUCCESS = 'AdditionalIngredientsActions.GET_ADDITIONAL_INGREDIENTS_SUCCESS',
        SUBMIT_NEW_ADDITIONAL_INGREDIENT = 'AdditionalIngredientsActions.SUBMIT_NEW_ADDITIONAL_INGREDIENT',
        SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS = 'AdditionalIngredientsActions.SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS',
        DELETE_ADDITIONAL_INGREDIENT_BY_ID = 'AdditionalIngredientsActions.DELETE_ADDITIONAL_INGREDIENT_BY_ID'
    }

    export interface GetAdditionalIngredients {
        readonly type: ActionTypes.GET_ADDITIONAL_INGREDIENTS
        payload: {
            isFetching: boolean
        }
    }

    export interface GetAdditionalIngredientsSuccess {
        readonly type: ActionTypes.GET_ADDITIONAL_INGREDIENTS_SUCCESS
        payload: {
            additionalIngredients: AdditionalIngredient[]
        }
    }

    export interface SubmitNewAdditionalIngredient {
        readonly type: ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT
        payload: {
            ingredient: AdditionalIngredientCreatePayload
        }
    }

    export interface SubmitNewAdditionalIngredientSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS
    }

    export interface DeleteAdditionalIngredientById {
        readonly type: ActionTypes.DELETE_ADDITIONAL_INGREDIENT_BY_ID
        payload: {
            ingredientId: string
        }
    }

    export type AllAdditionalIngredientsActions =
        GetAdditionalIngredients |
        GetAdditionalIngredientsSuccess |
        SubmitNewAdditionalIngredient |
        SubmitNewAdditionalIngredientSuccess |
        DeleteAdditionalIngredientById

    export function getAdditionalIngredients(aIsFetching: boolean): GetAdditionalIngredients {
        return {
            type: ActionTypes.GET_ADDITIONAL_INGREDIENTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getAdditionalIngredientsSuccess(aAdditionalIngredients: AdditionalIngredient[]): GetAdditionalIngredientsSuccess {
        return {
            type: ActionTypes.GET_ADDITIONAL_INGREDIENTS_SUCCESS,
            payload: {additionalIngredients: aAdditionalIngredients}
        }
    }

    export function submitNewAdditionalIngredient(aIngredient: AdditionalIngredientCreatePayload): SubmitNewAdditionalIngredient {
        return {
            type: ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT,
            payload: {ingredient: aIngredient}
        }
    }

    export function submitNewAdditionalIngredientSuccess(): SubmitNewAdditionalIngredientSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS
        }
    }

    export function deleteAdditionalIngredientById(aId: string): DeleteAdditionalIngredientById {
        return {
            type: ActionTypes.DELETE_ADDITIONAL_INGREDIENT_BY_ID,
            payload: {ingredientId: aId}
        }
    }
}
