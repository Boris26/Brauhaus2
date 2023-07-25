import {Beer, Yeast} from "../model/Beer";
import {Views} from "../enums/eViews";
import {BeerDTO} from "../model/BeerDTO";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {Yeasts} from "../model/Yeast";
import {ToggleState} from "../enums/eToggleState";

export namespace BeerActions {

    export enum ActionTypes {
        SUBMIT_BEER = 'BeerActions.SUBMIT_BEER',
        SUBMIT_NEW_MALT = 'BeerActions.SUBMIT_NEW_MALT',
        SUBMIT_NEW_HOP = 'BeerActions.SUBMIT_NEW_HOP',
        SUBMIT_NEW_YEAST = 'BeerActions.SUBMIT_NEW_YEAST',
        SUBMIT_BEER_SUCCESS = 'BeerActions.SUBMIT_BEER_SUCCESS',
        SUBMIT_NEW_MALT_SUCCESS = 'BeerActions.SUBMIT_NEW_MALT_SUCCESS',
        SUBMIT_NEW_HOP_SUCCESS = 'BeerActions.SUBMIT_NEW_HOP_SUCCESS',
        SUBMIT_NEW_YEAST_SUCCESS = 'BeerActions.SUBMIT_NEW_YEAST_SUCCESS',
        GET_BEERS = 'BeerActions.GET_BEERS',
        GET_BEERS_SUCCESS = 'BeerActions.GET_BEERS_SUCCESS',
        SET_SELECTED_BEER = 'BeerActions.SET_SELECTED_BEER',
        GET_MALTS = 'BeerActions.GET_MALTS',
        GET_HOPS = 'BeerActions.GET_HOPS',
        GET_YEASTS = 'BeerActions.GET_YEASTS',
        GET_MALTS_SUCCESS = 'BeerActions.GET_MALTS_SUCCESS',
        GET_HOPS_SUCCESS = 'BeerActions.GET_HOPS_SUCCESS',
        GET_YEASTS_SUCCESS = 'BeerActions.GET_YEASTS_SUCCESS',
        SET_IS_SUBMIT_SUCCESSFUL = 'BeerActions.SET_IS_SUBMIT_SUCCESSFUL',
    }

    export interface SetIsSubmitSuccessful {
        readonly type: ActionTypes.SET_IS_SUBMIT_SUCCESSFUL
        payload: {
            isSubmitSuccessful: boolean
            message: string
            type: string
        }
    }

    export interface SubmitNewMalt {
        readonly type: ActionTypes.SUBMIT_NEW_MALT
        payload: {
            malt: Malts
        }
    }
    export interface SubmitNewYeast {
        readonly type: ActionTypes.SUBMIT_NEW_YEAST
        payload: {
            yeast: Yeasts
        }
    }
    export interface SubmitNewHop {
        readonly type: ActionTypes.SUBMIT_NEW_HOP
        payload: {
            hop: Hops
        }
    }
    export interface SubmitNewMaltSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_MALT_SUCCESS
        payload: {
            isSubmitMaltSuccessful: boolean
        }
    }

    export interface SubmitNewHopSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_HOP_SUCCESS
        payload: {
            isSubmitHopSuccessful: boolean
        }
    }

    export interface SubmitNewYeastSuccess {
        readonly type: ActionTypes.SUBMIT_NEW_YEAST_SUCCESS
        payload: {
            isSubmitYeastSuccessful: boolean
        }
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
            isSubmitBeerSuccessful: boolean
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

    export type AllBeerActions =
        SubmitBeer |
        SubmitBeerSuccess |
        SubmitNewMalt |
        SubmitNewMaltSuccess |
        SubmitNewHop |
        SubmitNewHopSuccess |
        SubmitNewYeast |
        SubmitNewYeastSuccess |
        GetBeers |
        GetBeersSuccess|
        GetMalts |
        GetHops |
        GetYeasts|
        GetMaltsSuccess |
        GetHopsSuccess |
        GetYeastsSuccess |
        SetIsSubmitSuccessful |
        SetSelectedBeer;


    export function isSubmitSuccessful(aIsSuccessful: boolean, aMessage: string, aType: string): SetIsSubmitSuccessful {
        return {
            type: ActionTypes.SET_IS_SUBMIT_SUCCESSFUL,
            payload: {isSubmitSuccessful: aIsSuccessful, message: aMessage, type: aType}
        }
    }
    export function submitMaltSuccess(aIsSuccessful: boolean): SubmitNewMaltSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_MALT_SUCCESS,
            payload: {isSubmitMaltSuccessful: aIsSuccessful}
        }
    }

    export function submitHopSuccess(aIsSuccessful: boolean): SubmitNewHopSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_HOP_SUCCESS,
            payload: {isSubmitHopSuccessful: aIsSuccessful}
        }
    }

    export function submitYeastSuccess(aIsSuccessful: boolean): SubmitNewYeastSuccess {
        return {
            type: ActionTypes.SUBMIT_NEW_YEAST_SUCCESS,
            payload: {isSubmitYeastSuccessful: aIsSuccessful}
        }
    }
    export function submitNewMalt(aMalt: Malts): SubmitNewMalt {
        return {
            type: ActionTypes.SUBMIT_NEW_MALT,
            payload: {malt: aMalt}
        }
    }

    export function submitNewHop(aHop: Hops): SubmitNewHop {
        return {
            type: ActionTypes.SUBMIT_NEW_HOP,
            payload: {hop: aHop}
        }
    }

    export function submitNewYeast(aYeast: Yeasts): SubmitNewYeast {
        return {
            type: ActionTypes.SUBMIT_NEW_YEAST,
            payload: {yeast: aYeast}
        }
    }

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
            payload: {isSubmitBeerSuccessful: aIsSuccessful}
        }
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

export namespace ApplicationActions {
    export enum ActionTypes {

        SET_VIEW = 'ApplicationActions.SET_VIEW',
        OPEN_ERROR_DIALOG = 'ApplicationActions.OPEN_ERROR_DIALOG',
    }
    export interface SetView {
        readonly type: ActionTypes.SET_VIEW
        payload: { view: Views }
    }

    export interface OpenDialog {
        readonly type: ActionTypes.OPEN_ERROR_DIALOG
        payload:{
            open: boolean,
            header: string,
            content: string
        }
    }

    export type AllApplicationActions =

        SetView|
        OpenDialog
        ;
    export function setViewState(aView: Views): SetView {
        return {
            type: ActionTypes.SET_VIEW,
            payload: {view: aView},
        };
    }

    export function openErrorDialog(aOpen: boolean, aHeader: string, aContent: string): OpenDialog {
        return {
            type: ActionTypes.OPEN_ERROR_DIALOG,
            payload: {open: aOpen, header: aHeader, content: aContent}
        }
    }
}

export namespace ProductionActions {
    export enum ActionTypes {
        GET_TEMPERATURES = 'ProductionActions.GET_TEMPERATURES',
        SET_TEMPERATURE = 'ProductionActions.SET_TEMPERATURES',
        SET_AGITATOR_SPEED = 'ProductionActions.SET_AGITATOR_SPEED',
        TOGGLE_AGITATOR = 'ProductionActions.TOGGLE_AGITATOR',
    }

    export interface ToggleAgitator {
        readonly type: ActionTypes.TOGGLE_AGITATOR
        payload: {agitatorState: ToggleState}
    }

    export interface SetAgitatorSpeed {
        readonly type: ActionTypes.SET_AGITATOR_SPEED
        payload: {agitatorSpeed: number}
    }


    export interface SetTemperatures {
        readonly type: ActionTypes.SET_TEMPERATURE
        payload: {temperature: number}
    }

    export interface GetTemperatures {
        readonly type: ActionTypes.GET_TEMPERATURES
    }

    export type AllProductionActions =
        GetTemperatures |
        SetTemperatures |
        SetAgitatorSpeed |
        ToggleAgitator;

    export function toggleAgitator(aAgitatorState: ToggleState): ToggleAgitator {
        return {
            type: ActionTypes.TOGGLE_AGITATOR,
            payload: {agitatorState: aAgitatorState}
        }
    }
    export function setAgitatorSpeed(aAgitatorSpeed: number): SetAgitatorSpeed {
        return {
            type: ActionTypes.SET_AGITATOR_SPEED,
            payload: {agitatorSpeed: aAgitatorSpeed}
        }
    }
    export function getTemperatures(): GetTemperatures {
        return {
            type: ActionTypes.GET_TEMPERATURES,
        }
    }

    export function setTemperature(aTemperature: number): SetTemperatures {
        return {
            type: ActionTypes.SET_TEMPERATURE,
            payload: {temperature: aTemperature}
        }
    }
}
