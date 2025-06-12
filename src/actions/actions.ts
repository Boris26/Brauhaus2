import {Beer, Yeast} from "../model/Beer";
import {Views} from "../enums/eViews";
import {BeerDTO} from "../model/BeerDTO";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {Yeasts} from "../model/Yeast";
import {ToggleState} from "../enums/eToggleState";
import {MashAgitatorStates} from "../model/MashAgitator";
import {BrewingData} from "../model/BrewingData";
import {BrewingStatus} from "../model/BrewingStatus";
import {ConfirmStates} from "../enums/eConfirmStates";
import {BackendAvailable} from "../reducers/reducer";
import {WaterStatus} from "../components/Controlls/WaterControll/WaterControl";
import {FinishedBrew} from "../model/FinishedBrew";

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
        SET_BEER_TO_BREW = 'BeerActions.SET_BEER_TO_BREW',
        EXPORT_FINISHED_BREWS = 'BeerActions.EXPORT_FINISHED_BREWS',
        UPDATE_ACTIVE_BEER = 'BeerActions.UPDATE_ACTIVE_BEER',
        GET_FINISHED_BEERS = 'BeerActions.GET_FINISHED_BEERS',
        GET_FINISHED_BEERS_SUCCESS = 'BeerActions.GET_FINISHED_BEERS_SUCCESS',
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

    export interface SetBeerToBrew {
        readonly type: ActionTypes.SET_BEER_TO_BREW
        payload: { beer: Beer | undefined }
    }

    export interface ExportFinishedBrews {
        readonly type: ActionTypes.EXPORT_FINISHED_BREWS
        payload: {
            brews: FinishedBrew[]
        }
    }
    export interface UpdateActiveBeer {
        readonly type: ActionTypes.UPDATE_ACTIVE_BEER
        payload: {
            beer: FinishedBrew
        }
    }

    export interface GetFinishedBeers {
        readonly type: ActionTypes.GET_FINISHED_BEERS
        payload: {
            isFetching: boolean
        }
    }
    export interface GetFinishedBeersSuccess {
        readonly type: ActionTypes.GET_FINISHED_BEERS_SUCCESS
        payload: {
            finishedBeers: FinishedBrew[] | null
        }
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
        GetBeersSuccess |
        GetMalts |
        GetHops |
        GetYeasts |
        GetMaltsSuccess |
        GetHopsSuccess |
        GetYeastsSuccess |
        SetIsSubmitSuccessful |
        SetSelectedBeer|
        SetBeerToBrew|
        ExportFinishedBrews |
        UpdateActiveBeer |
        GetFinishedBeers |
        GetFinishedBeersSuccess;


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

    export function getYeasts(aIsFetching: boolean): GetYeasts {
        return {
            type: ActionTypes.GET_YEASTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getHops(aIsFetching: boolean): GetHops {
        return {
            type: ActionTypes.GET_HOPS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getHopsSuccess(aHops: Hops[] | null, aIsSuccessful: boolean): GetHopsSuccess {
        return {
            type: ActionTypes.GET_HOPS_SUCCESS,
            payload: {hops: aHops, isSuccessful: aIsSuccessful}
        }
    }

    export function getYeastsSuccess(aYeasts: Yeast[] | null, aIsSuccessful: boolean): GetYeastsSuccess {
        return {
            type: ActionTypes.GET_YEASTS_SUCCESS,
            payload: {yeasts: aYeasts, isSuccessful: aIsSuccessful}
        }
    }

    export function getMalts(aIsFetching: boolean): GetMalts {
        return {
            type: ActionTypes.GET_MALTS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function getMaltsSuccess(aMalts: Malts[] | null, aIsSuccessful: boolean): BeerActions.GetMaltsSuccess {
        return {
            type: ActionTypes.GET_MALTS_SUCCESS,
            payload: {malts: aMalts, isSuccessful: aIsSuccessful}
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

    export function setSelectedBeer(aBeer: Beer): SetSelectedBeer {
        return {
            type: ActionTypes.SET_SELECTED_BEER,
            payload: {beer: aBeer}
        }
    }

    export function getBeers(aIsFetching: boolean): GetBeers {
        return {
            type: ActionTypes.GET_BEERS,
            payload: {isFetching: aIsFetching}
        }
    }

    export function setBeerToBrew(aBeer: Beer | undefined): SetBeerToBrew {
        return {
            type: ActionTypes.SET_BEER_TO_BREW,
            payload: {beer: aBeer}
        }
    }
    export function exportFinishedBrewsToPdf(aFinishedBrews: FinishedBrew[]): ExportFinishedBrews {
        return {
            type: BeerActions.ActionTypes.EXPORT_FINISHED_BREWS,
            payload: {brews: aFinishedBrews}
        }
    }

    export function updateActiveBeer(aFinishedBrew: FinishedBrew): UpdateActiveBeer {
        return {
            type: BeerActions.ActionTypes.UPDATE_ACTIVE_BEER,
            payload: {beer: aFinishedBrew}
        }
    }

    export function getFinishedBeers(aIsFetching: boolean): GetFinishedBeers {
        return {
            type: BeerActions.ActionTypes.GET_FINISHED_BEERS,
            payload: {isFetching: aIsFetching}
        }
    }
    export function getFinishedBeersSuccess(aFinishedBeers: FinishedBrew[] | null): GetFinishedBeersSuccess {
        return {
            type: BeerActions.ActionTypes.GET_FINISHED_BEERS_SUCCESS,
            payload: {finishedBeers: aFinishedBeers}
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
        payload: {
            open: boolean,
            header: string,
            content: string
        }
    }

    export type AllApplicationActions =

        SetView |
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
        SET_AGITATOR_IS_RUNNING = 'ProductionActions.SET_AGITATOR_IS_RUNNING',
        TOGGLE_AGITATOR = 'ProductionActions.TOGGLE_AGITATOR',
        TOGGLE_AGITATOR_SUCCESS = 'ProductionActions.TOGGLE_AGITATOR_SUCCESS',
        START_WATER_FILLING = 'ProductionActions.START_WATER_FILLING',
        START_WATER_FILLING_SUCCESS = 'ProductionActions.START_WATER_FILLING_SUCCESS',
        SEND_BREWING_DATA = 'ProductionActions.SEND_BREWING_DATA',
        SET_BREWING_STATUS = 'ProductionActions.SET_BREWING_STATUS',
        START_POLLING = 'ProductionActions.START_POLLING',
        STOP_POLLING = 'ProductionActions.STOP_POLLING',
        CONFIRM = 'ProductionActions.CONFIRM',
        CHECK_IS_BACKEND_AVAILABLE = 'ProductionActions.CHECK_IS_BACKEND_AVAILABLE',
        IS_BACKEND_AVAILABLE = 'ProductionActions.IS_BACKEND_AVAILABLE',
        SET_WATER_STATUS = 'ProductionActions.'
    }

    export interface SetWaterStatus {
        readonly type: ActionTypes.SET_WATER_STATUS
        payload: { waterStatus: WaterStatus }
    }

    export interface IsBackendAvailable {
        readonly type: ActionTypes.IS_BACKEND_AVAILABLE
        payload: { isBackenAvailable: BackendAvailable }
    }

    export interface CheckIsBackendAvailable {
        readonly type: ActionTypes.CHECK_IS_BACKEND_AVAILABLE

    }

    export interface Confirm {
        readonly type: ActionTypes.CONFIRM
        payload: { confirmState: ConfirmStates }
    }

    export interface StartPolling {
        readonly type: ActionTypes.START_POLLING
    }

    export interface StopPolling {
        readonly type: ActionTypes.STOP_POLLING
    }

    export interface SetBrewingStatus {
        readonly type: ActionTypes.SET_BREWING_STATUS
        payload: { brewingStatus: BrewingStatus }
    }

    export interface SendBrewingData {
        readonly type: ActionTypes.SEND_BREWING_DATA
        payload: { brewingData: BrewingData }
    }

    export interface ToggleAgitatorSuccess {
        readonly type: ActionTypes.TOGGLE_AGITATOR_SUCCESS
        payload: { isToggleAgitatorSuccess: boolean }
    }

    export interface StartWaterFillingSuccess {
        readonly type: ActionTypes.START_WATER_FILLING_SUCCESS
        payload: { isWaterFillingSuccessful: boolean }
    }

    export interface StartWaterFilling {
        readonly type: ActionTypes.START_WATER_FILLING
        payload: { liters: number }
    }

    export interface SetAgitatorIsRunning {
        readonly type: ActionTypes.SET_AGITATOR_IS_RUNNING
        payload: { agitatorIsRunning: ToggleState }
    }

    export interface ToggleAgitator {
        readonly type: ActionTypes.TOGGLE_AGITATOR
        payload: {
            agitatorState: MashAgitatorStates
        }
    }

    export interface SetAgitatorSpeed {
        readonly type: ActionTypes.SET_AGITATOR_SPEED
        payload: { agitatorSpeed: number }
    }


    export interface SetTemperatures {
        readonly type: ActionTypes.SET_TEMPERATURE
        payload: { temperature: number }
    }

    export interface GetTemperatures {
        readonly type: ActionTypes.GET_TEMPERATURES
    }

    export type AllProductionActions =
        GetTemperatures |
        SetTemperatures |
        SetAgitatorSpeed |
        SetAgitatorIsRunning |
        StartWaterFillingSuccess |
        StartWaterFilling |
        ToggleAgitatorSuccess |
        ToggleAgitator |
        SetBrewingStatus |
        StartPolling |
        StopPolling |
        Confirm |
        SendBrewingData |
        CheckIsBackendAvailable |
        IsBackendAvailable |
        SetWaterStatus;

    export function setWaterStatus(aWaterStatus: WaterStatus): ProductionActions.SetWaterStatus {
        return {
            type: ActionTypes.SET_WATER_STATUS,
            payload: {waterStatus: aWaterStatus}
        }
    }

    export function isBackenAvailable(aBackenAvailable: BackendAvailable): ProductionActions.IsBackendAvailable {
        return {
            type: ActionTypes.IS_BACKEND_AVAILABLE,
            payload: {isBackenAvailable: aBackenAvailable}
        }
    }

    export function checkIsBackenAvailable(): ProductionActions.CheckIsBackendAvailable {
        return {
            type: ActionTypes.CHECK_IS_BACKEND_AVAILABLE,


        }
    }

    export function confirm(aConfirmState: ConfirmStates): ProductionActions.Confirm {
        return {
            type: ActionTypes.CONFIRM,
            payload: {confirmState: aConfirmState}
        }
    }

    export function startPolling(): StartPolling {
        return {
            type: ActionTypes.START_POLLING,
        }
    }

    export function stopPolling(): StopPolling {
        return {
            type: ActionTypes.STOP_POLLING,
        }
    }

    export function setBrewingStatus(aBrewingStatus: BrewingStatus): SetBrewingStatus {
        return {
            type: ActionTypes.SET_BREWING_STATUS,
            payload: {brewingStatus: aBrewingStatus}
        }
    }

    export function sendBrewingData(aBrewingData: BrewingData): SendBrewingData {
        return {
            type: ActionTypes.SEND_BREWING_DATA,
            payload: {brewingData: aBrewingData}
        }
    }

    export function toggleAgitatorSuccess(aIsSuccess: boolean): ToggleAgitatorSuccess {
        return {
            type: ActionTypes.TOGGLE_AGITATOR_SUCCESS,
            payload: {isToggleAgitatorSuccess: aIsSuccess}
        }
    }

    export function startWaterFilling(aLiters: number): StartWaterFilling {
        return {
            type: ActionTypes.START_WATER_FILLING,
            payload: {liters: aLiters}
        }
    }

    export function startWaterFillingSuccess(aIsSuccessful: boolean): StartWaterFillingSuccess {
        return {
            type: ActionTypes.START_WATER_FILLING_SUCCESS,
            payload: {isWaterFillingSuccessful: aIsSuccessful}
        }
    }

    export function setAgitatorIsRunning(aAgitatorIsRunning: ToggleState): SetAgitatorIsRunning {
        return {
            type: ActionTypes.SET_AGITATOR_IS_RUNNING,
            payload: {agitatorIsRunning: aAgitatorIsRunning}
        }
    }

    export function toggleAgitator(aAgitatorState: MashAgitatorStates): ToggleAgitator {
        return {
            type: ActionTypes.TOGGLE_AGITATOR,
            payload: {
                agitatorState: aAgitatorState
            }
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
