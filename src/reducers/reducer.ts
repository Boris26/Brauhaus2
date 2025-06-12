import {combineReducers} from 'redux';
import {Views} from "../enums/eViews";
import {Beer, Yeast} from "../model/Beer";
import {BeerRepository} from "../repositorys/BeerRepository";
import {ProductionRepository} from "../repositorys/ProductionRepository";
import {ApplicationActions, BeerActions, ProductionActions} from "../actions/actions";
import AllBeerActions = BeerActions.AllBeerActions;
import {BeerDTO} from "../model/BeerDTO";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import AllApplicationActions = ApplicationActions.AllApplicationActions;
import AllProductionActions = ProductionActions.AllProductionActions;
import {ToggleState} from "../enums/eToggleState";
import {BrewingStatus} from "../model/BrewingStatus";
import {ConfirmStates} from "../enums/eConfirmStates";
import {WaterStatus} from "../components/Controlls/WaterControll/WaterControl";
import {GenericPdfGenerator} from "../utils/pdf/GenericPdfGenerator";
import {finishedBrewStrategy} from "../utils/pdf/finishedBrewStrategy";
import {FinishedBrew} from "../model/FinishedBrew";

export interface ApplicationReducerState {
    view: Views;
    errorDialogHeader: string,
    errorDialogMessage: string,
    errorDialogOpen: boolean
}

export interface BackendAvailable {
    isBackenAvailable: boolean,
    statusText: string
}

export interface BeerDataReducerState {
    beers: Beer[] | undefined
    beer: BeerDTO | undefined
    malts: Malts[] | undefined
    hops: Hops[] | undefined
    yeasts: Yeast[] | undefined
    isSuccessful: boolean,
    isFetching: boolean,
    isSubmitMaltSuccessful: boolean | undefined,
    isSubmitHopSuccessful: boolean | undefined,
    isSubmitYeastSuccessful: boolean | undefined,
    isSubmitSuccessful: boolean | undefined,
    message: string | undefined,
    type: string | undefined,
    selectedBeer?: Beer,
    beerToBrew?: Beer | undefined,
    finishedBrews?: FinishedBrew[] | undefined
}

export interface ProductionReducerState {
    temperature: number,
    agitatorSpeed: number,
    currentAgitatorSpeed: number,
    currentAgitatorState: ToggleState,
    agitatorIsRunning: ToggleState,
    liters: number,
    isWaterFillingSuccessful: boolean,
    isToggleAgitatorSuccess: boolean,
    brewingStatus: BrewingStatus | undefined,
    confirmState: ConfirmStates | undefined,
    isBackenAvailable: BackendAvailable,
    waterStatus: WaterStatus,
    isPollingRunning: boolean
}

export const initialProductionState: ProductionReducerState =
    {
        temperature: 0,
        currentAgitatorSpeed: 5,
        currentAgitatorState: ToggleState.OFF,
        agitatorSpeed: 0,
        agitatorIsRunning: ToggleState.OFF,
        liters: 0,
        isWaterFillingSuccessful: true,
        isToggleAgitatorSuccess: true,
        brewingStatus: undefined,
        confirmState: undefined,
        isBackenAvailable: {isBackenAvailable: true, statusText: ""},
        waterStatus: {liters: 0, openClose: false},
        isPollingRunning: false
    }

export const initialApplicationState: ApplicationReducerState =
    {
        view: Views.MAIN,
        errorDialogHeader: "",
        errorDialogMessage: "",
        errorDialogOpen: false
    }

export const initialBeerState: BeerDataReducerState =
    {
        beers: undefined,
        beer: undefined,
        malts: undefined,
        hops: undefined,
        yeasts: undefined,
        isSuccessful: false,
        isFetching: false,
        isSubmitMaltSuccessful: true,
        isSubmitHopSuccessful: true,
        isSubmitYeastSuccessful: true,
        isSubmitSuccessful: true,
        message: undefined,
        type: undefined
    }


const applicationReducer = (aState: ApplicationReducerState = initialApplicationState, aAction: AllApplicationActions) => {
    switch (aAction.type) {
        case ApplicationActions.ActionTypes.SET_VIEW: {
            return {...aState, view: aAction.payload.view};
        }

        case ApplicationActions.ActionTypes.OPEN_ERROR_DIALOG: {
            return {
                ...aState,
                errorDialogHeader: aAction.payload.header,
                errorDialogMessage: aAction.payload.content,
                errorDialogOpen: aAction.payload.open
            };
        }
        default:
            return aState;
    }

};

const beerDataReducer = (aState: BeerDataReducerState = initialBeerState, aAction: AllBeerActions) => {
    switch (aAction.type) {
        case BeerActions.ActionTypes.SUBMIT_BEER: {
            BeerRepository.submitBeer(aAction.payload.beer).then(r => {
                return {...aState};
            });
           return {...aState};
        }


        case BeerActions.ActionTypes.GET_BEERS_SUCCESS: {
            return {...aState, beers: aAction.payload.beers};
        }


        case BeerActions.ActionTypes.GET_BEERS: {
            BeerRepository.getBeers().then(r => {
                return {...aState, isFetching: aAction.payload.isFetching};
            });
           return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.SET_SELECTED_BEER: {
            return {...aState, selectedBeer: aAction.payload.beer};
        }

        case BeerActions.ActionTypes.SUBMIT_BEER_SUCCESS: {
            return {...aState, isSuccessful: aAction.payload.isSubmitBeerSuccessful};
        }

        case BeerActions.ActionTypes.GET_MALTS: {
            BeerRepository.getMalts();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_HOPS: {
            BeerRepository.getHops();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_YEASTS: {
            BeerRepository.getYeasts();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_MALTS_SUCCESS: {
            return {...aState, malts: aAction.payload.malts, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.GET_HOPS_SUCCESS: {
            console.log(aAction.payload.hops);
            return {...aState, hops: aAction.payload.hops, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.GET_YEASTS_SUCCESS: {
            return {...aState, yeasts: aAction.payload.yeasts, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_MALT: {
            BeerRepository.submitMalt(aAction.payload.malt);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_HOP: {
            BeerRepository.submitHop(aAction.payload.hop);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_YEAST: {
            BeerRepository.submitYeast(aAction.payload.yeast);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_MALT_SUCCESS: {
            return {...aState, isSubmitMaltSuccessful: aAction.payload.isSubmitMaltSuccessful};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_HOP_SUCCESS: {
            return {...aState, isSubmitHopSuccessful: aAction.payload.isSubmitHopSuccessful};
        }
        case BeerActions.ActionTypes.SUBMIT_NEW_YEAST_SUCCESS: {
            return {...aState, isSubmitYeastSuccessful: aAction.payload.isSubmitYeastSuccessful};
        }

        case BeerActions.ActionTypes.SET_IS_SUBMIT_SUCCESSFUL: {
            return {...aState, isSubmitSuccessful: aAction.payload.isSubmitSuccessful};
        }

        case BeerActions.ActionTypes.SET_BEER_TO_BREW: {
            return {...aState, beerToBrew: aAction.payload.beer};
        }

        case BeerActions.ActionTypes.EXPORT_FINISHED_BREWS: {
            const pdfGenerator = new GenericPdfGenerator<FinishedBrew>();
            pdfGenerator.generate(aAction.payload.brews, finishedBrewStrategy, "finished_brews.pdf")
                .then(() => {
                    console.log("PDF export successful");
                })
                .catch((error) => {
                    console.error("Error generating PDF:", error);
                });
            return {...aState};
        }

        case BeerActions.ActionTypes.GET_FINISHED_BEERS: {
            BeerRepository.getFinishedBeers().then(r => {
                return {...aState, isFetching: aAction.payload.isFetching};
            });
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_FINISHED_BEERS_SUCCESS: {
            return {...aState, finishedBrews: aAction.payload.finishedBeers};
        }

        case BeerActions.ActionTypes.UPDATE_ACTIVE_BEER: {
            const updatedBrew = aAction.payload.beer;
            BeerRepository.updateFinishedBeer(updatedBrew).then((value) => {
                console.log("Updated brew:", value);
                return { ...aState };
            });
            let finishedBrews = aState.finishedBrews ? [...aState.finishedBrews] : [];
            const idx = finishedBrews.findIndex(b => b.id === updatedBrew.id);
            if (idx !== -1) {
                finishedBrews[idx] = updatedBrew;
            } else {
                finishedBrews.push(updatedBrew);
            }
            return { ...aState, finishedBrews };
        }

        default:
            return aState;
    }
};

const productionReducer = (aState: ProductionReducerState = initialProductionState, aAction: AllProductionActions) => {
    switch (aAction.type) {
        case ProductionActions.ActionTypes.GET_TEMPERATURES: {
            ProductionRepository.getTemperature();
            return {...aState};
        }
        case ProductionActions.ActionTypes.SET_TEMPERATURE: {
            return {...aState, temperature: aAction.payload.temperature};
        }

        case ProductionActions.ActionTypes.TOGGLE_AGITATOR: {
            ProductionRepository.toggleAgitator(aAction.payload.agitatorState);
            return {...aState, currentAgitatorState: aAction.payload.agitatorState};
        }

        case ProductionActions.ActionTypes.SET_AGITATOR_SPEED: {
            ProductionRepository.setAgitatorSpeed(aAction.payload.agitatorSpeed);
            return {...aState, currentAgitatorSpeed: aAction.payload.agitatorSpeed};
        }
        case ProductionActions.ActionTypes.SET_AGITATOR_IS_RUNNING: {
            return {...aState, agitatorIsRunning: aAction.payload.agitatorIsRunning};
        }

        case ProductionActions.ActionTypes.START_WATER_FILLING: {
            ProductionRepository.fillWaterAutomatic(aAction.payload.liters);
            return {...aState, liters: aAction.payload.liters};
        }

        case ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS: {
            return {...aState, isWaterFillingSuccessful: aAction.payload.isWaterFillingSuccessful};
        }

        case ProductionActions.ActionTypes.TOGGLE_AGITATOR_SUCCESS: {
            return {...aState, isToggleAgitatorSuccess: aAction.payload.isToggleAgitatorSuccess}
        }
        case ProductionActions.ActionTypes.SEND_BREWING_DATA: {
            ProductionRepository.sendBrewingData(aAction.payload.brewingData);
            return {...aState, isPollingRunning: true};
        }
        case ProductionActions.ActionTypes.SET_BREWING_STATUS: {
            return {...aState, brewingStatus: aAction.payload.brewingStatus};
        }
        case ProductionActions.ActionTypes.START_POLLING: {
            ProductionRepository.startBrewingStatusPolling();
            return {...aState, isPollingRunning: true};
        }
        case ProductionActions.ActionTypes.STOP_POLLING: {
            ProductionRepository.stopBrewingStatusPolling();
            return {...aState};
        }

        case ProductionActions.ActionTypes.CONFIRM: {
            ProductionRepository.confirm(aAction.payload.confirmState);
            return {...aState,};
        }

        case ProductionActions.ActionTypes.CHECK_IS_BACKEND_AVAILABLE: {
            ProductionRepository.checkIsBackendAvailable()
            return {...aState};
        }

        case ProductionActions.ActionTypes.IS_BACKEND_AVAILABLE : {
            return {...aState, isBackenAvailable: aAction.payload.isBackenAvailable}
        }

        case ProductionActions.ActionTypes.SET_WATER_STATUS : {
            return {...aState, waterStatus: aAction.payload.waterStatus}
        }


        default:
            return aState;
    }
};

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
    productionReducer: productionReducer
});
