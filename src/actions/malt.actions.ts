import {Malts} from "../model/Malt";

export namespace MaltsActions{
    export enum ActionTypes {
        GET_MALTS = 'MaltsActions.GET_MALTS',
        GET_MALTS_SUCCESS = 'MaltsActions.GET_MALTS_SUCCESS',
        SUBMIT_NEW_MALT = 'MaltsActions.SUBMIT_NEW_MALT',
        SUBMIT_NEW_MALT_SUCCESS = 'MaltsActions.SUBMIT_NEW_MALT_SUCCESS',
        SET_UNKNOWN_MALTS = 'MaltsActions.SET_UNKNOWN_MALTS',
        DELETE_MALTS_BY_ID = 'MaltsActions.DELETE_MALTS_BY_ID'
    }

    export interface GetMalts {
        readonly type: ActionTypes.GET_MALTS
        payload: {
            isFetching: boolean
        }
    }

    export interface GetMaltsSuccess {
        readonly type: ActionTypes.GET_MALTS_SUCCESS
        payload: {
            malts: Malts[]
        }
    }
    export interface SubmitNewMalt {
        readonly type: ActionTypes.SUBMIT_NEW_MALT
        payload: {
            malt: Malts
        }
    }
    export interface SubmitNewMaltSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_MALT_SUCCESS
    }

    export interface DeleteMaltById {
        readonly type : ActionTypes.DELETE_MALTS_BY_ID
        payload: {
            maltId: string
        }
    }

    export interface SetUnknownMalts {
        readonly type: ActionTypes.SET_UNKNOWN_MALTS;
        payload: {
            unknownMalts: string[];
        }
    }
    export interface DeleteMaltsById {
        readonly type: ActionTypes.DELETE_MALTS_BY_ID
        payload: {
            maltsId: string;
        }
    }
    export type AllMaltsActions =
        GetMalts |
        GetMaltsSuccess|
        SubmitNewMalt |
        SubmitNewMaltSuccess|
        DeleteMaltById |
        SetUnknownMalts |
        DeleteMaltsById

    export function getMalts(aIsFetching: boolean): GetMalts {
        return {
            type: ActionTypes.GET_MALTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getMaltsSuccess(aMalts: Malts[]): GetMaltsSuccess {
        return {
            type: ActionTypes.GET_MALTS_SUCCESS,
            payload: {malts: aMalts}
        }
    }

    export function submitNewMalt(aMalt: Malts): SubmitNewMalt {
        return {
            type: ActionTypes.SUBMIT_NEW_MALT,
            payload: {malt: aMalt}
        }
    }
    export function submitMaltSuccess(): SubmitNewMaltSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_MALT_SUCCESS
        }
    }

    export function setUnknownMalts(unknownMalts: string[]): SetUnknownMalts {
        return {
            type: ActionTypes.SET_UNKNOWN_MALTS,
            payload: {unknownMalts}
        }
    }

    export function deleteMaltsById(aMaltId: string): DeleteMaltsById{
        return {
            type: ActionTypes.DELETE_MALTS_BY_ID,
            payload: {maltsId: aMaltId}
        }
    }
}
