import {Beer, Yeast} from "../model/Beer";
import {Views} from "../enums/eViews";
import {BeerDTO} from "../model/BeerDTO";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";

export namespace BeerActions {

    export enum ActionTypes {
        SUBMIT_BEER = 'BeerActions.SUBMIT_BEER',
        SET_SELECTED_BEER = 'BeerActions.SET_SELECTED_BEER',
        SET_VIEW = 'BeerActions.SET_VIEW',
        GET_BEERS = 'BeerActions.GET_BEERS',
        GET_BEERS_SUCCESS = 'BeerActions.GET_BEERS_SUCCESS',
        SUBMIT_BEER_SUCCESS = 'BeerActions.SUBMIT_BEER_SUCCESS',
        GET_MALTS = 'BeerActions.GET_MALTS',
        GET_HOPS = 'BeerActions.GET_HOPS',
        GET_YEASTS = 'BeerActions.GET_YEASTS',
        GET_MALTS_SUCCESS = 'BeerActions.GET_MALTS_SUCCESS',
        GET_HOPS_SUCCESS = 'BeerActions.GET_HOPS_SUCCESS',
        GET_YEASTS_SUCCESS = 'BeerActions.GET_YEASTS_SUCCESS'
    }


    export interface SubmitBeer {
        readonly type: ActionTypes.SUBMIT_BEER
        payload: {
            beer: BeerDTO
        }
    }
    export interface SubmitBeerSuccess {
        readonly type: ActionTypes.SUBMIT_BEER_SUCCESS
        payload: {
            isSuccessful: boolean
        }
    }
    export interface GetBeers {
        readonly type: ActionTypes.GET_BEERS
        payload: {
            isFetching: boolean
        }
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
            malts: Malts[] | null,
            isSuccessful: boolean
        }
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
            hops: Hops[] | null,
            isSuccessful: boolean
        }
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
            yeasts: Yeast[] | null
            isSuccessful: boolean
        }
    }

    export interface GetBeersSuccess {
        readonly type: ActionTypes.GET_BEERS_SUCCESS
        payload: {
            beers: Beer[]
        }
    }


    export interface SetSelectedBeer {
        readonly type: ActionTypes.SET_SELECTED_BEER
        payload: { beer: Beer }
    }

    export interface SetView {
        readonly type: ActionTypes.SET_VIEW
        payload: { view: Views }
    }


    export type AllBeerActions =
        SubmitBeer |
        SubmitBeerSuccess |
        SetSelectedBeer |
        SetView |
        GetBeers |
        GetBeersSuccess|
        GetMalts |
        GetHops |
        GetYeasts|
        GetMaltsSuccess |
        GetHopsSuccess |
        GetYeastsSuccess
        ;

    export function getYeasts(aIsFetching:boolean): GetYeasts {
        return {
            type: ActionTypes.GET_YEASTS,
            payload: {isFetching: aIsFetching}
        }
    }
    export function getHops(aIsFetching:boolean): GetHops {
        return {
            type: ActionTypes.GET_HOPS,
            payload: {isFetching: aIsFetching}
        }
    }
    export function getHopsSuccess(aHops: Hops[]| null, aIsSuccessful: boolean): GetHopsSuccess {
        return {
            type: ActionTypes.GET_HOPS_SUCCESS,
            payload: {hops: aHops,isSuccessful: aIsSuccessful}
        }
    }
    export function getYeastsSuccess(aYeasts: Yeast[] | null, aIsSuccessful: boolean): GetYeastsSuccess {
        return {
            type: ActionTypes.GET_YEASTS_SUCCESS,
            payload: {yeasts: aYeasts, isSuccessful: aIsSuccessful}
        }
    }
    export function getMalts(aIsFetching:boolean): GetMalts {
        return {
            type: ActionTypes.GET_MALTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getMaltsSuccess(aMalts: Malts[] | null, aIsSuccessful: boolean): BeerActions.GetMaltsSuccess {
        return {
            type: ActionTypes.GET_MALTS_SUCCESS,
            payload: {malts: aMalts,isSuccessful: aIsSuccessful}
        }
    }

    export function getBeersSuccess(aBeers: Beer[]): GetBeersSuccess {
        return {
            type: ActionTypes.GET_BEERS_SUCCESS,
            payload: {beers: aBeers}
        }
    }

    export function submitBeer(aBeer: BeerDTO): SubmitBeer {
        return {
            type: ActionTypes.SUBMIT_BEER,
            payload: {beer: aBeer},
        }
    }

    export function submitBeerSuccess(aIsSuccessful: boolean): SubmitBeerSuccess {
        return {
            type: ActionTypes.SUBMIT_BEER_SUCCESS,
            payload: {isSuccessful: aIsSuccessful}
        }
    }

    export function setViewState(aView: Views): SetView {
        return {
            type: ActionTypes.SET_VIEW,
            payload: {view: aView},
        };
    }

    export function setSelectedBeer(aBeer:Beer): SetSelectedBeer {
        return {
            type: ActionTypes.SET_SELECTED_BEER,
            payload: {beer: aBeer}
        }
    }
    export function getBeers(aIsFetching:boolean): GetBeers {
        return {
            type: ActionTypes.GET_BEERS,
            payload: {isFetching: aIsFetching }
        }
    }
}
