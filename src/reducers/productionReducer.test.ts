import {ProductionActions} from '../actions/actions';
import {initialProductionState, productionReducer} from './productionReducer';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ToggleState} from '../enums/eToggleState';
import {ConfirmStates} from '../enums/eConfirmStates';

const status = (): BrewingStatus => ({
    elapsedTime: 0,
    process: {state: ProcessState.ACTIVE},
    currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE},
    temperature: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {},
});

describe('productionReducer waterStatus', () => {
    it('starts with the complete new WaterStatus contract', () => {
        expect(initialProductionState.waterStatus).toEqual({filledLiters: 0, targetLiters: 0, openClose: false});
    });

    it('stores filledLiters and targetLiters without swapping fields', () => {
        const waterStatus = {filledLiters: 0.0286, targetLiters: 16.6, openClose: true};

        const nextState = productionReducer(initialProductionState, ProductionActions.setWaterStatus(waterStatus));

        expect(nextState.waterStatus).toEqual(waterStatus);
    });

    it('clears a previous request failure when a new water fill starts', () => {
        const failedState = {...initialProductionState, isWaterFillingSuccessful: false};

        const nextState = productionReducer(failedState, ProductionActions.startWaterFilling(2));

        expect(nextState.liters).toBe(2);
        expect(nextState.isWaterFillingSuccessful).toBe(true);
    });
});

describe('productionReducer socket connection', () => {
    it('stores a connected socket id and clears it on disconnect', () => {
        const connected = productionReducer(initialProductionState, ProductionActions.socketConnectionChanged(true, 'abc123'));
        expect(connected.socketConnection).toEqual({connected: true, socketId: 'abc123'});
        const disconnected = productionReducer(connected, ProductionActions.socketConnectionChanged(false));
        expect(disconnected.socketConnection).toEqual({connected: false, socketId: undefined});
    });

    it('replaces the previous id after reconnect', () => {
        const first = productionReducer(initialProductionState, ProductionActions.socketConnectionChanged(true, 'abc123'));
        const disconnected = productionReducer(first, ProductionActions.socketConnectionChanged(false));
        const reconnected = productionReducer(disconnected, ProductionActions.socketConnectionChanged(true, 'xyz789'));
        expect(reconnected.socketConnection).toEqual({connected: true, socketId: 'xyz789'});
    });
});

describe('productionReducer brewingStatus alarms', () => {
    it('stores replacement realtime snapshots idempotently', () => {
        const snapshot = {alarms: [{type: AlarmType.EQUIPMENT_ALARM, active: true}]};
        const active = productionReducer(initialProductionState, ProductionActions.alarmStateChanged(snapshot));
        const repeated = productionReducer(active, ProductionActions.alarmStateChanged(snapshot));
        const cleared = productionReducer(repeated, ProductionActions.alarmStateChanged({alarms: []}));
        expect(repeated.realtimeState.alarms).toEqual(snapshot.alarms);
        expect(cleared.realtimeState.alarms).toEqual([]);
    });
    it('keeps realtime alarms independent from process status polling', () => {
        const activeAlarm = {type: AlarmType.EQUIPMENT_ALARM, active: true};
        const alarmState = productionReducer(initialProductionState, ProductionActions.alarmStateChanged({alarms: [activeAlarm]}));
        const polledState = productionReducer(alarmState, ProductionActions.setBrewingStatus(status()));
        expect(polledState.realtimeState.alarms).toEqual([activeAlarm]);
    });
});

describe('productionReducer agitator state', () => {
    it('stores the toggle state represented by the agitator command', () => {
        const agitatorCommand = {
            isTurnOn: true,
            rotationsPerMinute: 30,
            runningTime: 60,
            breakTime: 15,
            isIntervalTurnOn: false,
            isHeatingAndStirringTurnOn: false,
        };

        const nextState = productionReducer(initialProductionState, ProductionActions.toggleAgitator(agitatorCommand));

        expect(nextState.currentAgitatorState).toBe(ToggleState.ON);
    });
});

describe('productionReducer confirm lifecycle', () => {
    it('sets pending for a request and clears it on success', () => {
        const pending = productionReducer(initialProductionState, ProductionActions.confirm(ConfirmStates.IODINE));
        expect(pending.isConfirmPending).toBe(true);

        const succeeded = productionReducer(pending, ProductionActions.confirmSuccess());
        expect(succeeded.isConfirmPending).toBe(false);
        expect(succeeded.confirmError).toBeUndefined();
    });

    it('clears pending on failure while preserving the current waiting status', () => {
        const waitingStatus = {...status(), waiting: {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true}};
        const waiting = productionReducer(initialProductionState, ProductionActions.setBrewingStatus(waitingStatus));
        const pending = productionReducer(waiting, ProductionActions.confirm(ConfirmStates.IODINE));
        const failed = productionReducer(pending, ProductionActions.confirmFailure('HTTP 500'));

        expect(failed.isConfirmPending).toBe(false);
        expect(failed.confirmError).toBe('HTTP 500');
        expect(failed.brewingStatus?.waiting).toEqual(waitingStatus.waiting);
    });
});

describe('productionReducer next-step lifecycle', () => {
    it('blocks while pending and clears pending after failure', () => {
        const pending = productionReducer(initialProductionState, ProductionActions.nextProcedureStep());
        expect(pending.isNextProcedureStepPending).toBe(true);
        const failed = productionReducer(pending, ProductionActions.nextProcedureStepFailure('HTTP 500'));
        expect(failed.isNextProcedureStepPending).toBe(false);
        expect(failed.nextProcedureStepError).toBe('HTTP 500');
    });
});

describe('productionReducer stale status', () => {
    it('marks an existing status stale while offline and clears stale on a fresh status', () => {
        const withStatus = productionReducer(initialProductionState, ProductionActions.setBrewingStatus(status()));
        const offline = productionReducer(withStatus, ProductionActions.isBackenAvailable({isBackenAvailable: false, statusText: 'offline'}));
        expect(offline.brewingStatus).toBe(withStatus.brewingStatus);
        expect(offline.isBrewingStatusStale).toBe(true);
        const refreshed = productionReducer(offline, ProductionActions.setBrewingStatus(status()));
        expect(refreshed.isBrewingStatusStale).toBe(false);
    });
});

it('makes a brewing start failure visible and releases polling pending state', () => {
    const pending = productionReducer(initialProductionState, ProductionActions.sendBrewingData({} as any));
    const failed = productionReducer(pending, ProductionActions.brewingStartFailure('HTTP 500'));
    expect(failed.isPollingRunning).toBe(false);
    expect(failed.brewingStartError).toBe('HTTP 500');
});
