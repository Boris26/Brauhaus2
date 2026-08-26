import {Yeasts, YeastMasterData} from "../model/Yeasts";

export namespace YeastActions{
    export enum ActionTypes {
        GET_YEASTS = 'YeastActions.GET_YEASTS',
        GET_YEASTS_SUCCESS = 'YeastActions.GET_YEASTS_SUCCESS',
        SUBMIT_NEW_YEAST = 'YeastActions.SUBMIT_NEW_YEAST',
        SUBMIT_NEW_YEAST_SUCCESS = 'YeastActions.SUBMIT_NEW_YEAST_SUCCESS',
        SET_UNKNOWN_YEASTS = 'YeastActions.SET_UNKNOWN_YEASTS',
        DELETE_YEAST_BY_ID = 'YeastActions.DELETE_YEAST_BY_ID',
        UPDATE_YEAST = 'YeastActions.UPDATE_YEAST',
        UPDATE_YEAST_SUCCESS = 'YeastActions.UPDATE_YEAST_SUCCESS',
        UPDATE_YEAST_ERROR = 'YeastActions.UPDATE_YEAST_ERROR',
        RESET_UPDATE = 'YeastActions.RESET_UPDATE',
    }
    export interface GetYeasts {
        readonly type: ActionTypes.GET_YEASTS
        payload: {
            isFetching: boolean
        }
    }

    export interface GetYeastsSuccess {
        readonly type: ActionTypes.GET_YEASTS_SUCCESS
        payload: {
            yeasts: Yeasts[]
        }
    }

    export interface SubmitNewYeast {
        readonly type: ActionTypes.SUBMIT_NEW_YEAST
        payload: {
            yeast: Yeasts
        }
    }

    export interface SubmitNewYeastSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_YEAST_SUCCESS
    }

    export interface SetUnknownYeasts {
        readonly type: ActionTypes.SET_UNKNOWN_YEASTS;
        payload: {
            unknownYeasts: string[];
        }
    }

    export interface DeleteYeastById {
        readonly type: ActionTypes.DELETE_YEAST_BY_ID
        payload: {yeastId: string};
    }

    export interface UpdateYeasts { readonly type: ActionTypes.UPDATE_YEAST; payload: { id: string | number; data: YeastMasterData } }
    export interface UpdateYeastsSuccess { readonly type: ActionTypes.UPDATE_YEAST_SUCCESS; payload: { yeast: Yeasts } }
    export interface UpdateYeastsError { readonly type: ActionTypes.UPDATE_YEAST_ERROR; payload: { error: string } }
    export interface ResetUpdate { readonly type: ActionTypes.RESET_UPDATE }

    export type AllYeastActions =
        GetYeasts |
        GetYeastsSuccess |
        SubmitNewYeast |
        SubmitNewYeastSuccess |
        SetUnknownYeasts |
        DeleteYeastById |
        UpdateYeasts | UpdateYeastsSuccess | UpdateYeastsError | ResetUpdate

    export function submitYeastSuccess(): SubmitNewYeastSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_YEAST_SUCCESS,
        }
    }
    export function submitNewYeast(aYeast: Yeasts): SubmitNewYeast {
        return {
            type: ActionTypes.SUBMIT_NEW_YEAST,
            payload: {yeast: aYeast}
        }
    }

    export function getYeasts(aIsFetching: boolean): GetYeasts {
        return {
            type: ActionTypes.GET_YEASTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getYeastsSuccess(aYeasts: Yeasts[]): GetYeastsSuccess {
        return {
            type: ActionTypes.GET_YEASTS_SUCCESS,
            payload: {yeasts: aYeasts}
        }
    }
    export function setUnknownYeasts(unknownYeasts: string[]): SetUnknownYeasts {
        return {
            type: ActionTypes.SET_UNKNOWN_YEASTS,
            payload: {unknownYeasts}
        }
    }

    export function deleteYeastById(aYeastId: string): DeleteYeastById {
        return {
            type: ActionTypes.DELETE_YEAST_BY_ID,
            payload: {yeastId: aYeastId}
        }
    }
    export function updateYeasts(id: string | number, data: YeastMasterData): UpdateYeasts { return { type: ActionTypes.UPDATE_YEAST, payload: { id, data } }; }
    export function updateYeastsSuccess(yeast: Yeasts): UpdateYeastsSuccess { return { type: ActionTypes.UPDATE_YEAST_SUCCESS, payload: { yeast } }; }
    export function updateYeastsError(error: string): UpdateYeastsError { return { type: ActionTypes.UPDATE_YEAST_ERROR, payload: { error } }; }
    export function resetUpdate(): ResetUpdate { return { type: ActionTypes.RESET_UPDATE }; }
}
