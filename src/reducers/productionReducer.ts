import { ProductionActions } from '../actions/actions';
import AllProductionActions = ProductionActions.AllProductionActions;
import { ToggleState } from '../enums/eToggleState';
import { BrewingStatus } from '../model/BrewingStatus';
import { isProcessAborted, isProcessFinished, isProcessIdle, isProcessInError } from '../utils/brewingStatus/selectors';
import { ConfirmStates } from '../enums/eConfirmStates';
import { WaterStatus } from '../components/Controlls/WaterControll/WaterControl';
import {AgitatorRealtimeState, AlarmRealtimeState, RealtimeControllerState, TemperatureSensorRealtimeState} from '../model/RealtimeControllerState';
import {AgitatorSettings} from '../model/AgitatorSettings';
import {BrewRecoveryState} from '../model/BrewRecovery';
import {CommunicationPhase, ConfirmationPhase, PROCESS_REALTIME_ENABLED, validMetadata, validStatus} from '../utils/brewingStatus/snapshot';
import {getStatusChangeKey} from '../utils/brewingStatus/selectors';

const agitatorSnapshotsEqual = (left?: AgitatorRealtimeState, right?: AgitatorRealtimeState): boolean =>
    left === right || (!!left && !!right
        && left.mode === right.mode
        && left.paused === right.paused
        && left.operation === right.operation
        && left.intervalPhase === right.intervalPhase
        && left.intervalProgressPercent === right.intervalProgressPercent
        && left.actualOutputOn === right.actualOutputOn
        && left.speedPercent === right.speedPercent
        && left.runningMinutes === right.runningMinutes
        && left.breakMinutes === right.breakMinutes);

const alarmSnapshotsEqual = (left: AlarmRealtimeState['alarms'], right: AlarmRealtimeState['alarms']): boolean =>
    left === right || (left.length === right.length && left.every((alarm, index) => {
        const candidate = right[index];
        return alarm.type === candidate.type && alarm.active === candidate.active;
    }));

const temperatureSensorSnapshotsEqual = (left?: TemperatureSensorRealtimeState, right?: TemperatureSensorRealtimeState): boolean =>
    left === right || (!!left && !!right && left.current === right.current && left.health === right.health && left.sensorId === right.sensorId);

const agitatorDefaultsEqual = (left?: AgitatorSettings, right?: AgitatorSettings): boolean =>
    left === right || (!!left && !!right && left.speed === right.speed && left.intervalOnMinutes === right.intervalOnMinutes && left.intervalOffMinutes === right.intervalOffMinutes);

export interface BackendAvailable {
    isBackenAvailable: boolean;
    statusText: string;
}

export interface ProductionReducerState {
    communication: {phase: CommunicationPhase; generation: number; lastMessageAt: number; retiredEpochs: string[]; socketEpoch?: string};
    confirmation: {httpPending?: boolean; phase?: ConfirmationPhase; baselineKey?: string; baselineRevision?: number; baselineEpoch?: string; baselineProcess?: string; syncWaiting?: boolean};
    temperature: number;
    agitatorSpeed: number;
    currentAgitatorSpeed: number;
    currentAgitatorState: ToggleState;
    agitatorIsRunning: ToggleState;
    liters: number;
    isWaterFillingSuccessful: boolean;
    isWaterStopping: boolean;
    waterFillingError?: string;
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
    agitatorDefaults?: AgitatorSettings;
    brewRecovery: BrewRecoveryState;
}

export const initialProductionState: ProductionReducerState = {
    communication: {phase: 'Disconnected', generation: 0, lastMessageAt: 0, retiredEpochs: []},
    confirmation: {},
    temperature: 0,
    currentAgitatorSpeed: 5,
    currentAgitatorState: ToggleState.OFF,
    agitatorSpeed: 0,
    agitatorIsRunning: ToggleState.OFF,
    liters: 0,
    isWaterFillingSuccessful: true,
    isWaterStopping: false,
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
    realtimeState: {alarms: [], alarmsReceived: false},
    brewRecovery: {available: false, recovery: null, resumePending: false, discardPending: false, requestGeneration: 0}
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
            return { ...aState, liters: aAction.payload.liters, isWaterFillingSuccessful: true, waterFillingError: undefined };
        }
        case ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS: {
            return { ...aState, isWaterFillingSuccessful: aAction.payload.isWaterFillingSuccessful,
                waterFillingError: aAction.payload.error,
                waterStatus: aAction.payload.waterStatus ?? aState.waterStatus };
        }
        case ProductionActions.ActionTypes.STOP_WATER_FILLING:
            return {...aState, isWaterStopping: true};
        case ProductionActions.ActionTypes.STOP_WATER_FILLING_FINISHED:
            return {...aState, isWaterStopping: false,
                waterStatus: aAction.payload.waterStatus ?? aState.waterStatus,
                isWaterFillingSuccessful: aAction.payload.success,
                waterFillingError: aAction.payload.error};

        case ProductionActions.ActionTypes.SEND_BREWING_DATA: {
            return { ...aState, brewingStartError: undefined };
        }
        case ProductionActions.ActionTypes.BREWING_START_FAILURE: {
            return {...aState, isPollingRunning: false, brewingStartError: aAction.payload.error};
        }
        case ProductionActions.ActionTypes.SET_BREWING_STATUS: {
            const status = aAction.payload.brewingStatus;
            if (!status) return aState;
            const {source = 'http', generation} = aAction.payload;
            if (generation !== undefined && generation !== aState.communication.generation) return aState;
            const incoming = status.snapshotMetadata;
            const previous = aState.brewingStatus?.snapshotMetadata;
            let communication = aState.communication;
            if (incoming) {
                if (!validMetadata(incoming) || !validStatus(status)) return aState;
                if (source === 'socket') communication = {...communication, socketEpoch: incoming.controllerEpoch, lastMessageAt: Date.now()};
                if (source === 'telemetry') communication = {...communication, lastMessageAt: Date.now()};
                if (communication.retiredEpochs.includes(incoming.controllerEpoch)) return aState;
                if (previous && incoming.controllerEpoch !== previous.controllerEpoch && source !== 'sync') {
                    return {...aState, communication: {...communication, phase: 'Synchronizing'}};
                }
                if (previous && incoming.controllerEpoch === previous.controllerEpoch && incoming.revision < previous.revision) return aState;
                const socketSynchronized = PROCESS_REALTIME_ENABLED && aState.socketConnection.connected
                    && (source === 'socket' || (source === 'sync' && communication.socketEpoch === incoming.controllerEpoch));
                if (socketSynchronized) communication = {...communication, phase: 'Synchronized', lastMessageAt: Date.now()};
                if (previous && incoming.controllerEpoch === previous.controllerEpoch && incoming.revision === previous.revision) {
                    return communication === aState.communication ? aState : {...aState, communication};
                }
                if (previous && incoming.controllerEpoch !== previous.controllerEpoch) {
                    communication = {...communication, retiredEpochs: [...communication.retiredEpochs, previous.controllerEpoch]};
                }
            } else if (previous) return aState; // Unversioned responses cannot downgrade a versioned controller.
            const terminal = isProcessIdle(status) || isProcessFinished(status) || isProcessAborted(status) || isProcessInError(status);
            const processReplaced = aState.isConfirmPending && incoming && aState.confirmation.baselineEpoch
                && (incoming.controllerEpoch !== aState.confirmation.baselineEpoch || incoming.processInstanceId !== aState.confirmation.baselineProcess);
            const transitioned = aState.isConfirmPending && aState.confirmation.baselineKey !== undefined
                && `${getStatusChangeKey(status)}|${status.waiting.canConfirm}` !== aState.confirmation.baselineKey;
            return {...aState, brewingStatus: status, communication,
                isBrewingStatusStale: false, isPollingRunning: terminal ? false : aState.isPollingRunning,
                ...(processReplaced ? {isConfirmPending: !!aState.confirmation.httpPending,
                    confirmError: 'Controller oder Brauprozess wurde geändert. Die Bestätigung wurde nicht erneut gesendet.',
                    confirmation: {...aState.confirmation, phase: 'Failed', syncWaiting: false}} : transitioned ? {isConfirmPending: !!aState.confirmation.httpPending, confirmError: undefined, confirmation: {...aState.confirmation, phase: 'Completed', syncWaiting: false}} : {})};
        }
        case ProductionActions.ActionTypes.COMMUNICATION_PHASE:
            return {...aState, communication: {...aState.communication, phase: aAction.payload.phase, socketEpoch: undefined}};
        case ProductionActions.ActionTypes.STATUS_STREAM_STALE:
            return {...aState, isBrewingStatusStale: !!aState.brewingStatus,
                communication: {...aState.communication, phase: 'Synchronizing', socketEpoch: undefined}};
        case ProductionActions.ActionTypes.STATUS_HEARTBEAT: {
            const heartbeat = aAction.payload;
            if (!heartbeat || typeof heartbeat !== 'object') return aState;
            const metadata = aState.brewingStatus?.snapshotMetadata;
            if (!metadata || !aState.socketConnection.connected || heartbeat.controllerEpoch !== metadata.controllerEpoch
                || heartbeat.processInstanceId !== metadata.processInstanceId || !Number.isSafeInteger(heartbeat.revision)) return aState;
            return {...aState, communication: {...aState.communication, lastMessageAt: Date.now(),
                phase: PROCESS_REALTIME_ENABLED && heartbeat.revision <= metadata.revision ? 'Synchronized' : aState.communication.phase}};
        }
        case ProductionActions.ActionTypes.CONFIRM_ACCEPTED:
            if (aState.confirmation.phase === 'Completed' || aState.confirmation.phase === 'Failed') return aState;
            return {...aState, confirmation: {...aState.confirmation, phase: 'CommandAccepted'}};
        case ProductionActions.ActionTypes.CONFIRM_SYNC_WAIT:
            if (!aState.isConfirmPending) return aState;
            return {...aState, confirmation: {...aState.confirmation, syncWaiting: true}};
        case ProductionActions.ActionTypes.START_POLLING: {
            if (PROCESS_REALTIME_ENABLED && aState.communication.phase === 'Synchronized') return aState;
            return { ...aState, isPollingRunning: true };
        }
        case ProductionActions.ActionTypes.STOP_POLLING: {
            return { ...aState, isPollingRunning: false };
        }
        case ProductionActions.ActionTypes.CONFIRM: {
            if (aState.isConfirmPending) return aState;
            return {...aState, isConfirmPending: true, confirmError: undefined, confirmation: {
                phase: 'CommandPending', httpPending: true, baselineKey: `${getStatusChangeKey(aState.brewingStatus)}|${aState.brewingStatus?.waiting.canConfirm}`,
                baselineRevision: aState.brewingStatus?.snapshotMetadata?.revision,
                baselineEpoch: aState.brewingStatus?.snapshotMetadata?.controllerEpoch,
                baselineProcess: aState.brewingStatus?.snapshotMetadata?.processInstanceId,
            }};
        }
        case ProductionActions.ActionTypes.CONFIRM_SUCCESS: {
            if (aState.confirmation.phase === 'Completed' || aState.confirmation.phase === 'Failed') return {...aState, isConfirmPending: false, confirmation: {...aState.confirmation, httpPending: false}};
            return {...aState, isConfirmPending: true, confirmError: undefined,
                confirmation: {...aState.confirmation, phase: 'AwaitingStateTransition', httpPending: false}};
        }
        case ProductionActions.ActionTypes.CONFIRM_FAILURE: {
            if (aState.confirmation.phase === 'Completed') return aState;
            return {...aState, isConfirmPending: false, confirmError: aAction.payload.error,
                confirmation: {...aState.confirmation, phase: 'Failed', httpPending: false}};
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
                isBrewingStatusStale: !aAction.payload.connected && !!aState.brewingStatus ? true : aState.isBrewingStatusStale,
                communication: {...aState.communication,
                    generation: aState.communication.generation + 1,
                    phase: aAction.payload.connected ? 'Synchronizing' : 'Disconnected',
                    socketEpoch: undefined, lastMessageAt: Date.now()},
                socketConnection: {
                    connected: aAction.payload.connected,
                    socketId: aAction.payload.connected ? aAction.payload.socketId : undefined
                },
                realtimeState: aAction.payload.connected
                    ? aState.realtimeState
                    : {...aState.realtimeState, temperatureSensor: undefined}
            };
        }
        case ProductionActions.ActionTypes.HEATING_RUNNING_CHANGED:
            if (aState.realtimeState.heatingRunning === aAction.payload.running) return aState;
            return {...aState, realtimeState: {...aState.realtimeState, heatingRunning: aAction.payload.running}};
        case ProductionActions.ActionTypes.AGITATOR_STATE_CHANGED:
            if (agitatorSnapshotsEqual(aState.realtimeState.agitator, aAction.payload)) return aState;
            return {...aState, realtimeState: {...aState.realtimeState, agitator: aAction.payload}};
        case ProductionActions.ActionTypes.ALARM_STATE_CHANGED:
            if (aState.realtimeState.alarmsReceived && alarmSnapshotsEqual(aState.realtimeState.alarms, aAction.payload.alarms)) return aState;
            return {...aState, realtimeState: {...aState.realtimeState, alarms: aAction.payload.alarms, alarmsReceived: true}};
        case ProductionActions.ActionTypes.TEMPERATURE_SENSOR_STATE_CHANGED:
            if (temperatureSensorSnapshotsEqual(aState.realtimeState.temperatureSensor, aAction.payload)) return aState;
            return {...aState, realtimeState: {...aState.realtimeState, temperatureSensor: aAction.payload}};
        case ProductionActions.ActionTypes.AGITATOR_DEFAULTS_CHANGED:
            if (agitatorDefaultsEqual(aState.agitatorDefaults, aAction.payload)) return aState;
            return {...aState, agitatorDefaults: aAction.payload};
        case ProductionActions.ActionTypes.BREW_RECOVERY_STATE_CHANGED: {
            const next = aAction.payload;
            if (aState.brewRecovery.available === next.available
                && JSON.stringify(aState.brewRecovery.recovery) === JSON.stringify(next.recovery)
                && aState.brewRecovery.error === next.error) return aState;
            return {...aState, brewRecovery: {...aState.brewRecovery, ...next, resumePending: false, discardPending: false,
                    requestGeneration: aState.brewRecovery.requestGeneration + 1, error: next.error, errorOperation: undefined}};
        }
        case ProductionActions.ActionTypes.RESUME_BREW_RECOVERY:
            if (!aState.brewRecovery.available || aState.brewRecovery.resumePending || aState.brewRecovery.discardPending) return aState;
            return {...aState, brewRecovery: {...aState.brewRecovery, resumePending: true,
                    requestGeneration: aState.brewRecovery.requestGeneration + 1, error: undefined, errorOperation: undefined}};
        case ProductionActions.ActionTypes.RESUME_BREW_RECOVERY_SUCCESS:
            if (aAction.payload.requestGeneration !== aState.brewRecovery.requestGeneration) return aState;
            // The command acknowledgement is not proof that the process runs.
            return aState;
        case ProductionActions.ActionTypes.RESUME_BREW_RECOVERY_FAILURE:
            if (aAction.payload.requestGeneration !== aState.brewRecovery.requestGeneration || !aState.brewRecovery.available) return aState;
            return {...aState, brewRecovery: {...aState.brewRecovery, resumePending: false, error: aAction.payload.error, errorOperation: 'resume'}};
        case ProductionActions.ActionTypes.DISCARD_BREW_RECOVERY:
            if (!aState.brewRecovery.available || aState.brewRecovery.resumePending || aState.brewRecovery.discardPending) return aState;
            return {...aState, brewRecovery: {...aState.brewRecovery, discardPending: true,
                    requestGeneration: aState.brewRecovery.requestGeneration + 1, error: undefined, errorOperation: undefined}};
        case ProductionActions.ActionTypes.DISCARD_BREW_RECOVERY_SUCCESS:
            if (aAction.payload.requestGeneration !== aState.brewRecovery.requestGeneration) return aState;
            return {...aState, brewRecovery: {available: false, recovery: null, resumePending: false, discardPending: false,
                    requestGeneration: aState.brewRecovery.requestGeneration + 1}};
        case ProductionActions.ActionTypes.DISCARD_BREW_RECOVERY_FAILURE:
            if (aAction.payload.requestGeneration !== aState.brewRecovery.requestGeneration || !aState.brewRecovery.available) return aState;
            return {...aState, brewRecovery: {...aState.brewRecovery, discardPending: false, error: aAction.payload.error, errorOperation: 'discard'}};
        case ProductionActions.ActionTypes.BREW_SESSION_RUNNING_RECEIVED:
            if (!aState.brewRecovery.available && !aState.brewRecovery.recovery && !aState.brewRecovery.resumePending
                && !aState.brewRecovery.discardPending && !aState.brewRecovery.error) return aState;
            return {...aState, brewRecovery: {available: false, recovery: null, resumePending: false, discardPending: false,
                    requestGeneration: aState.brewRecovery.requestGeneration + 1}};
        case ProductionActions.ActionTypes.WEBSOCKET_DISCONNECT: {
            return {...aState, socketConnection: {connected: false}, realtimeState: {...aState.realtimeState, temperatureSensor: undefined}};
        }

        default:
            return aState;
    }
};

export default productionReducer;
export { productionReducer };
