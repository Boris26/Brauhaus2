import {Hops, HopMasterData} from "../model/Hops";

export namespace HopsActions {
    export enum ActionTypes {
        GET_HOPS = 'HopsActions.GET_HOPS',
        GET_HOPS_SUCCESS = 'HopsActions.GET_HOPS_SUCCESS',
        SUBMIT_NEW_HOP = 'HopsActions.SUBMIT_NEW_HOP',
        SUBMIT_NEW_HOP_SUCCESS = 'HopsActions.SUBMIT_NEW_HOP_SUCCESS',
        SET_UNKNOWN_HOPS = 'HopsActions.SET_UNKNOWN_HOPS',
        DELETE_HOPS_BY_ID = 'HopsActions.DELETE_HOPS_BY_ID',
        GET_HOPS_FAILURE = 'HopsActions.GET_HOPS_FAILURE',
        UPDATE_HOP = 'HopsActions.UPDATE_HOP',
        UPDATE_HOP_SUCCESS = 'HopsActions.UPDATE_HOP_SUCCESS',
        UPDATE_HOP_ERROR = 'HopsActions.UPDATE_HOP_ERROR',
        RESET_UPDATE = 'HopsActions.RESET_UPDATE',
    }

    export interface GetHops {
        readonly type: ActionTypes.GET_HOPS
        payload: {
            isFetching: boolean
        }
    }

    export interface GetHopsSuccess {
        readonly type: ActionTypes.GET_HOPS_SUCCESS
        payload: {
            hops: Hops[]
        }
    }

    export interface SubmitNewHop {
        readonly type: ActionTypes.SUBMIT_NEW_HOP
        payload: {
            hop: Hops
        }
    }

    export interface SubmitNewHopSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_HOP_SUCCESS
    }

    export interface SetUnknownHops {
        readonly type: ActionTypes.SET_UNKNOWN_HOPS;
        payload: {
            unknownHops: string[];
        }
    }

    export interface DeleteHopsById {
        readonly type: ActionTypes.DELETE_HOPS_BY_ID;
        payload: {
            hopsId: string;
        }
    }

    export interface GetHopsFailure {
        readonly type: ActionTypes.GET_HOPS_FAILURE;
    }

    export interface UpdateHops { readonly type: ActionTypes.UPDATE_HOP; payload: { id: string | number; data: HopMasterData } }
    export interface UpdateHopsSuccess { readonly type: ActionTypes.UPDATE_HOP_SUCCESS; payload: { hop: Hops } }
    export interface UpdateHopsError { readonly type: ActionTypes.UPDATE_HOP_ERROR; payload: { error: string } }
    export interface ResetUpdate { readonly type: ActionTypes.RESET_UPDATE }

    export type AllHopsActions =
        GetHops |
        GetHopsSuccess |
        SubmitNewHop |
        SubmitNewHopSuccess |
        SetUnknownHops |
        DeleteHopsById |
        GetHopsFailure |
        UpdateHops | UpdateHopsSuccess | UpdateHopsError | ResetUpdate



    export function getHops(aIsFetching: boolean): GetHops {
        return {
            type: ActionTypes.GET_HOPS,
            payload: {isFetching: aIsFetching}
        }
    }
    export function getHopsSuccess(aHops: Hops[]): GetHopsSuccess {
        return {
            type: ActionTypes.GET_HOPS_SUCCESS,
            payload: {hops: aHops}
        }
    }
    export function submitNewHop(aHop: Hops): SubmitNewHop {
        return {
            type: ActionTypes.SUBMIT_NEW_HOP,
            payload: {hop: aHop}
        }
    }

    export function submitHopSuccess(): SubmitNewHopSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_HOP_SUCCESS
        }
    }

    export function setUnknownHops(unknownHops: string[]): SetUnknownHops {
        return {
            type: ActionTypes.SET_UNKNOWN_HOPS,
            payload: {unknownHops}
        }
    }

    export function deleteHopById(aHopsId: string): DeleteHopsById {
        return {
            type: ActionTypes.DELETE_HOPS_BY_ID,
            payload: {hopsId: aHopsId}
        }
    }
    export function updateHops(id: string | number, data: HopMasterData): UpdateHops { return { type: ActionTypes.UPDATE_HOP, payload: { id, data } }; }
    export function updateHopsSuccess(hop: Hops): UpdateHopsSuccess { return { type: ActionTypes.UPDATE_HOP_SUCCESS, payload: { hop } }; }
    export function updateHopsError(error: string): UpdateHopsError { return { type: ActionTypes.UPDATE_HOP_ERROR, payload: { error } }; }
    export function resetUpdate(): ResetUpdate { return { type: ActionTypes.RESET_UPDATE }; }
}


