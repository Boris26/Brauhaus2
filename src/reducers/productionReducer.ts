import { ProductionActions } from '../actions/actions';
import AllProductionActions = ProductionActions.AllProductionActions;
import { ToggleState } from '../enums/eToggleState';
import { BrewingStatus } from '../model/BrewingStatus';
import { isProcessAborted, isProcessFinished, isProcessIdle, isProcessInError } from '../utils/brewingStatus/selectors';
import { ConfirmStates } from '../enums/eConfirmStates';
import { WaterStatus } from '../components/Controlls/WaterControll/WaterControl';
import {RealtimeControllerState} from '../model/RealtimeControllerState';

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
    isBackenAvailable: boolean;
    waterStatus: WaterStatus;
    isPollingRunning: boolean;
    overHeat: boolean;
    isConfirmPending: boolean;
    confirmError?: string;
    isNextProcedureStepPending: boolean;
    nextProcedureStepError?: string;
    isBrewingStatusStale: boolean;
    brewingStartError?: string;
    socketConnection: {
        connected: boolean;
        socketId?: string;
    };
    realtimeState: RealtimeControllerState;
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
    isBackenAvailable:  false,
    waterStatus: { filledLiters: 0, targetLiters: 0, openClose: false },
    isPollingRunning: false,
    overHeat: false,
    isConfirmPending: false,
    confirmError: undefined,
    isNextProcedureStepPending: false,
    nextProcedureStepError: undefined,
    isBrewingStatusStale: false,
    socketConnection: {connected: false},
    realtimeState: {alarms: [], alarmsReceived: false}
};

const productionReducer = (
    aState: ProductionReducerState = initialProductionState,
    aAction: AllProductionActions
): ProductionReducerState => {
    switch (aAction.type) {

        case ProductionActions.ActionTypes.SET_TEMPERATURE: {
            return { ...aState, temperature: aAction.payload.temperature };
        }
        case ProductionActions.ActionTypes.TOGGLE_AGITATOR: {
            return {
                ...aState,
                currentAgitatorState: aAction.payload.agitatorState.isTurnOn ? ToggleState.ON : ToggleState.OFF
            };
        }
        case ProductionActions.ActionTypes.TOGGLE_AGITATOR_SUCCESS: {
            return { ...aState, isToggleAgitatorSuccess: aAction.payload.isToggleAgitatorSuccess };
        }
        case ProductionActions.ActionTypes.SET_AGITATOR_SPEED: {
            return { ...aState, currentAgitatorSpeed: aAction.payload.agitatorSpeed };
        }
        case ProductionActions.ActionTypes.SET_AGITATOR_IS_RUNNING: {
            return { ...aState, agitatorIsRunning: aAction.payload.agitatorIsRunning };
        }
        case ProductionActions.ActionTypes.START_WATER_FILLING: {
            return { ...aState, liters: aAction.payload.liters, isWaterFillingSuccessful: true };
        }
        case ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS: {
            return { ...aState, isWaterFillingSuccessful: aAction.payload.isWaterFillingSuccessful };
        }

        case ProductionActions.ActionTypes.SEND_BREWING_DATA: {
            return { ...aState, brewingStartError: undefined };
        }
        case ProductionActions.ActionTypes.BREWING_START_FAILURE: {
            return {...aState, isPollingRunning: false, brewingStartError: aAction.payload.error};
        }
        case ProductionActions.ActionTypes.SET_BREWING_STATUS: {
            const aBrewingStatus = aAction.payload.brewingStatus;
            const aIsTerminalOrIdle = isProcessIdle(aBrewingStatus) || isProcessFinished(aBrewingStatus) || isProcessAborted(aBrewingStatus) || isProcessInError(aBrewingStatus);
            return { ...aState, brewingStatus: aBrewingStatus, isBrewingStatusStale: false, isPollingRunning: aIsTerminalOrIdle ? false : aState.isPollingRunning };
        }
        case ProductionActions.ActionTypes.START_POLLING: {
            return { ...aState, isPollingRunning: true };
        }
        case ProductionActions.ActionTypes.STOP_POLLING: {
            return { ...aState, isPollingRunning: false };
        }
        case ProductionActions.ActionTypes.CONFIRM: {
            return { ...aState, isConfirmPending: true, confirmError: undefined };
        }
        case ProductionActions.ActionTypes.CONFIRM_SUCCESS: {
            return { ...aState, isConfirmPending: false, confirmError: undefined };
        }
        case ProductionActions.ActionTypes.CONFIRM_FAILURE: {
            return { ...aState, isConfirmPending: false, confirmError: aAction.payload.error };
        }
        case ProductionActions.ActionTypes.NEXT_PROCEDURE_STEP: {
            return {...aState, isNextProcedureStepPending: true, nextProcedureStepError: undefined};
        }
        case ProductionActions.ActionTypes.NEXT_PROCEDURE_STEP_SUCCESS: {
            return {...aState, isNextProcedureStepPending: false, nextProcedureStepError: undefined};
        }
        case ProductionActions.ActionTypes.NEXT_PROCEDURE_STEP_FAILURE: {
            const error = aAction.payload.error instanceof Error ? aAction.payload.error.message : String(aAction.payload.error);
            return {...aState, isNextProcedureStepPending: false, nextProcedureStepError: error};
        }
        case ProductionActions.ActionTypes.CHECK_IS_BACKEND_AVAILABLE: {
            return { ...aState };
        }
        case ProductionActions.ActionTypes.IS_BACKEND_AVAILABLE: {
            const aIsBackenAvailable = aAction.payload.isBackenAvailable.isBackenAvailable;
            const isBrewingStatusStale = aIsBackenAvailable
                ? aState.isBrewingStatusStale
                : aState.brewingStatus !== undefined;
            if (aState.isBackenAvailable === aIsBackenAvailable && aState.isBrewingStatusStale === isBrewingStatusStale) {
                return aState;
            }
            return { ...aState, isBackenAvailable: aIsBackenAvailable, isBrewingStatusStale };
        }
        case ProductionActions.ActionTypes.SET_WATER_STATUS: {
            return { ...aState, waterStatus: aAction.payload.waterStatus };
        }
        case ProductionActions.ActionTypes.OVERHEAT_RECEIVED: {
            console.warn('Overheat received, setting overHeat to true');
            return { ...aState, overHeat: true };
        }
        case ProductionActions.ActionTypes.SOCKET_CONNECTION_CHANGED: {
            return {
                ...aState,
                socketConnection: {
                    connected: aAction.payload.connected,
                    socketId: aAction.payload.connected ? aAction.payload.socketId : undefined
                },
                realtimeState: {...aState.realtimeState, temperatureSensor: undefined}
            };
        }
        case ProductionActions.ActionTypes.HEATING_RUNNING_CHANGED:
            return {...aState, realtimeState: {...aState.realtimeState, heatingRunning: aAction.payload.running}};
        case ProductionActions.ActionTypes.AGITATOR_STATE_CHANGED:
            return {...aState, realtimeState: {...aState.realtimeState, agitator: aAction.payload}};
        case ProductionActions.ActionTypes.ALARM_STATE_CHANGED:
            return {...aState, realtimeState: {...aState.realtimeState, alarms: aAction.payload.alarms, alarmsReceived: true}};
        case ProductionActions.ActionTypes.TEMPERATURE_SENSOR_STATE_CHANGED:
            return {...aState, realtimeState: {...aState.realtimeState, temperatureSensor: aAction.payload}};
        case ProductionActions.ActionTypes.WEBSOCKET_DISCONNECT: {
            return {...aState, socketConnection: {connected: false}, realtimeState: {...aState.realtimeState, temperatureSensor: undefined}};
        }

        default:
            return aState;
    }
};

export default productionReducer;
export { productionReducer };
