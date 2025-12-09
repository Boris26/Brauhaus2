import {Hops} from "../model/Hops";

export namespace HopsActions {
    export enum ActionTypes {
        GET_HOPS = 'HopsActions.GET_HOPS',
        GET_HOPS_SUCCESS = 'HopsActions.GET_HOPS_SUCCESS',
        SUBMIT_NEW_HOP = 'HopsActions.SUBMIT_NEW_HOP',
        SUBMIT_NEW_HOP_SUCCESS = 'HopsActions.SUBMIT_NEW_HOP_SUCCESS',
        SET_UNKNOWN_HOPS = 'HopsActions.SET_UNKNOWN_HOPS',
        DELETE_HOPS_BY_ID = 'HopsActions.DELETE_HOPS_BY_ID',
        GET_HOPS_FAILURE = 'HopsActions.GET_HOPS_FAILURE'
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

    export type AllHopsActions =
        GetHops |
        GetHopsSuccess |
        SubmitNewHop |
        SubmitNewHopSuccess |
        SetUnknownHops |
        DeleteHopsById |
        GetHopsFailure



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
}


