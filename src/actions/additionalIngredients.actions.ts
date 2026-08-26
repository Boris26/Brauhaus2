import {AdditionalIngredient, AdditionalIngredientCreatePayload, AdditionalIngredientMasterData} from "../model/AdditionalIngredient";

export namespace AdditionalIngredientsActions {
    export enum ActionTypes {
        GET_ADDITIONAL_INGREDIENTS = 'AdditionalIngredientsActions.GET_ADDITIONAL_INGREDIENTS',
        GET_ADDITIONAL_INGREDIENTS_SUCCESS = 'AdditionalIngredientsActions.GET_ADDITIONAL_INGREDIENTS_SUCCESS',
        SUBMIT_NEW_ADDITIONAL_INGREDIENT = 'AdditionalIngredientsActions.SUBMIT_NEW_ADDITIONAL_INGREDIENT',
        SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS = 'AdditionalIngredientsActions.SUBMIT_NEW_ADDITIONAL_INGREDIENT_SUCCESS',
        DELETE_ADDITIONAL_INGREDIENT_BY_ID = 'AdditionalIngredientsActions.DELETE_ADDITIONAL_INGREDIENT_BY_ID',
        UPDATE_ADDITIONAL_INGREDIENT = 'AdditionalIngredientsActions.UPDATE_ADDITIONAL_INGREDIENT',
        UPDATE_ADDITIONAL_INGREDIENT_SUCCESS = 'AdditionalIngredientsActions.UPDATE_ADDITIONAL_INGREDIENT_SUCCESS',
        UPDATE_ADDITIONAL_INGREDIENT_ERROR = 'AdditionalIngredientsActions.UPDATE_ADDITIONAL_INGREDIENT_ERROR',
        RESET_UPDATE = 'AdditionalIngredientsActions.RESET_UPDATE'
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

    export interface UpdateAdditionalIngredient { readonly type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT; payload: { id: string | number; data: AdditionalIngredientMasterData } }
    export interface UpdateAdditionalIngredientSuccess { readonly type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_SUCCESS; payload: { ingredient: AdditionalIngredient } }
    export interface UpdateAdditionalIngredientError { readonly type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_ERROR; payload: { error: string } }
    export interface ResetUpdate { readonly type: ActionTypes.RESET_UPDATE }

    export type AllAdditionalIngredientsActions =
        GetAdditionalIngredients |
        GetAdditionalIngredientsSuccess |
        SubmitNewAdditionalIngredient |
        SubmitNewAdditionalIngredientSuccess |
        DeleteAdditionalIngredientById | UpdateAdditionalIngredient | UpdateAdditionalIngredientSuccess | UpdateAdditionalIngredientError | ResetUpdate

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
    export function updateAdditionalIngredient(id: string | number, data: AdditionalIngredientMasterData): UpdateAdditionalIngredient { return { type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT, payload: { id, data } }; }
    export function updateAdditionalIngredientSuccess(ingredient: AdditionalIngredient): UpdateAdditionalIngredientSuccess { return { type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_SUCCESS, payload: { ingredient } }; }
    export function updateAdditionalIngredientError(error: string): UpdateAdditionalIngredientError { return { type: ActionTypes.UPDATE_ADDITIONAL_INGREDIENT_ERROR, payload: { error } }; }
    export function resetUpdate(): ResetUpdate { return { type: ActionTypes.RESET_UPDATE }; }
}
