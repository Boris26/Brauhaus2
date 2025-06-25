import { ProductionActions } from '../actions/actions';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import AllProductionActions = ProductionActions.AllProductionActions;
import { ToggleState } from '../enums/eToggleState';
import { BrewingStatus } from '../model/BrewingStatus';
import { ConfirmStates } from '../enums/eConfirmStates';
import { WaterStatus } from '../components/Controlls/WaterControll/WaterControl';

export interface BackendAvailable {
    isBackenAvailable: boolean;
    statusText: string;
}

export interface ProductionReducerState {
    temperature: number;
    agitatorSpeed: number;
    currentAgitatorSpeed: number;
    currentAgitatorState: ToggleState;
    agitatorIsRunning: ToggleState;
    liters: number;
    isWaterFillingSuccessful: boolean;
    isToggleAgitatorSuccess: boolean;
    brewingStatus: BrewingStatus | undefined;
    confirmState: ConfirmStates | undefined;
    isBackenAvailable: BackendAvailable;
    waterStatus: WaterStatus;
    isPollingRunning: boolean;
}

export const initialProductionState: ProductionReducerState = {
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
    isBackenAvailable: { isBackenAvailable: true, statusText: '' },
    waterStatus: { liters: 0, openClose: false },
    isPollingRunning: false,
};

const productionReducer = (
    aState: ProductionReducerState = initialProductionState,
    aAction: AllProductionActions
) => {
    switch (aAction.type) {
        case ProductionActions.ActionTypes.GET_TEMPERATURES: {
            ProductionRepository.getTemperature();
            return { ...aState };
        }
        case ProductionActions.ActionTypes.SET_TEMPERATURE: {
            return { ...aState, temperature: aAction.payload.temperature };
        }
        case ProductionActions.ActionTypes.TOGGLE_AGITATOR: {
            ProductionRepository.toggleAgitator(aAction.payload.agitatorState);
            return { ...aState, currentAgitatorState: aAction.payload.agitatorState };
        }
        case ProductionActions.ActionTypes.SET_AGITATOR_SPEED: {
            ProductionRepository.setAgitatorSpeed(aAction.payload.agitatorSpeed);
            return { ...aState, currentAgitatorSpeed: aAction.payload.agitatorSpeed };
        }
        case ProductionActions.ActionTypes.SET_AGITATOR_IS_RUNNING: {
            return { ...aState, agitatorIsRunning: aAction.payload.agitatorIsRunning };
        }
        case ProductionActions.ActionTypes.START_WATER_FILLING: {
            ProductionRepository.fillWaterAutomatic(aAction.payload.liters);
            return { ...aState, liters: aAction.payload.liters };
        }
        case ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS: {
            return { ...aState, isWaterFillingSuccessful: aAction.payload.isWaterFillingSuccessful };
        }
        case ProductionActions.ActionTypes.TOGGLE_AGITATOR_SUCCESS: {
            return { ...aState, isToggleAgitatorSuccess: aAction.payload.isToggleAgitatorSuccess };
        }
        case ProductionActions.ActionTypes.SEND_BREWING_DATA: {
            ProductionRepository.sendBrewingData(aAction.payload.brewingData);
            return { ...aState, isPollingRunning: true };
        }
        case ProductionActions.ActionTypes.SET_BREWING_STATUS: {
            return { ...aState, brewingStatus: aAction.payload.brewingStatus };
        }
        case ProductionActions.ActionTypes.START_POLLING: {
            ProductionRepository.startBrewingStatusPolling();
            return { ...aState, isPollingRunning: true };
        }
        case ProductionActions.ActionTypes.STOP_POLLING: {
            ProductionRepository.stopBrewingStatusPolling();
            return { ...aState };
        }
        case ProductionActions.ActionTypes.CONFIRM: {
            ProductionRepository.confirm(aAction.payload.confirmState);
            return { ...aState };
        }
        case ProductionActions.ActionTypes.CHECK_IS_BACKEND_AVAILABLE: {
            ProductionRepository.checkIsBackendAvailable();
            return { ...aState };
        }
        case ProductionActions.ActionTypes.IS_BACKEND_AVAILABLE: {
            return { ...aState, isBackenAvailable: aAction.payload.isBackenAvailable };
        }
        case ProductionActions.ActionTypes.SET_WATER_STATUS: {
            return { ...aState, waterStatus: aAction.payload.waterStatus };
        }
        default:
            return aState;
    }
};

export default productionReducer;
export { productionReducer };
