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

    it('preserves a sensor snapshot that arrives before the connected notification', () => {
        const snapshot = {current: 19, health: 'OK' as const, sensorId: '28-1'};
        const withSnapshot = productionReducer(initialProductionState, ProductionActions.temperatureSensorStateChanged(snapshot));

        const connected = productionReducer(withSnapshot, ProductionActions.socketConnectionChanged(true, 'abc123'));

        expect(connected.socketConnection).toEqual({connected: true, socketId: 'abc123'});
        expect(connected.realtimeState.temperatureSensor).toEqual(snapshot);
    });

    it('clears the previous sensor snapshot on disconnect and waits for a fresh reconnect snapshot', () => {
        const connected = productionReducer(initialProductionState, ProductionActions.socketConnectionChanged(true, 'abc123'));
        const missing = productionReducer(connected, ProductionActions.temperatureSensorStateChanged({current: null, health: 'MISSING', sensorId: '28-1'}));
        expect(missing.realtimeState.temperatureSensor).toEqual({current: null, health: 'MISSING', sensorId: '28-1'});

        const disconnected = productionReducer(missing, ProductionActions.socketConnectionChanged(false));
        expect(disconnected.realtimeState.temperatureSensor).toBeUndefined();

        const reconnected = productionReducer(disconnected, ProductionActions.socketConnectionChanged(true, 'xyz789'));
        expect(reconnected.realtimeState.temperatureSensor).toBeUndefined();

        const recovered = productionReducer(reconnected, ProductionActions.temperatureSensorStateChanged({current: 55.8, health: 'OK', sensorId: '28-1'}));
        expect(recovered.realtimeState.temperatureSensor?.current).toBe(55.8);
    });
});

describe('productionReducer brewingStatus alarms', () => {
    it('stores replacement realtime snapshots idempotently', () => {
        const snapshot = {alarms: [{type: AlarmType.EQUIPMENT_ALARM, active: true}]};
        const active = productionReducer(initialProductionState, ProductionActions.alarmStateChanged(snapshot));
        const repeated = productionReducer(active, ProductionActions.alarmStateChanged(snapshot));
        const cleared = productionReducer(repeated, ProductionActions.alarmStateChanged({alarms: []}));
        expect(repeated.realtimeState.alarms).toEqual(snapshot.alarms);
        expect(repeated).toBe(active);
        expect(cleared.realtimeState.alarms).toEqual([]);
    });
    it('keeps realtime alarms independent from process status polling', () => {
        const activeAlarm = {type: AlarmType.EQUIPMENT_ALARM, active: true};
        const alarmState = productionReducer(initialProductionState, ProductionActions.alarmStateChanged({alarms: [activeAlarm]}));
        const polledState = productionReducer(alarmState, ProductionActions.setBrewingStatus(status()));
        expect(polledState.realtimeState.alarms).toEqual([activeAlarm]);
    });
});

describe('productionReducer realtime snapshot deduplication', () => {
    it('retains the Redux state reference for semantically identical contract snapshots', () => {
        const agitator = {mode: 'AUTOMATIC' as const, paused: false, operation: 'INTERVAL' as const, intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 60, runningMinutes: 2, breakMinutes: 3};
        const sensor = {current: 65.2, health: 'OK' as const, sensorId: '28-1'};
        const defaults = {speed: 60, intervalOnMinutes: 2, intervalOffMinutes: 3};
        const heated = productionReducer(initialProductionState, ProductionActions.heatingRunningChanged({running: true}));
        const withAgitator = productionReducer(heated, ProductionActions.agitatorStateChanged(agitator));
        const withSensor = productionReducer(withAgitator, ProductionActions.temperatureSensorStateChanged(sensor));
        const withDefaults = productionReducer(withSensor, ProductionActions.agitatorDefaultsChanged(defaults));

        expect(productionReducer(heated, ProductionActions.heatingRunningChanged({running: true}))).toBe(heated);
        expect(productionReducer(withAgitator, ProductionActions.agitatorStateChanged({...agitator}))).toBe(withAgitator);
        expect(productionReducer(withSensor, ProductionActions.temperatureSensorStateChanged({...sensor}))).toBe(withSensor);
        expect(productionReducer(withDefaults, ProductionActions.agitatorDefaultsChanged({...defaults}))).toBe(withDefaults);
    });

    it('creates new state for changed realtime contract fields', () => {
        const heated = productionReducer(initialProductionState, ProductionActions.heatingRunningChanged({running: true}));
        expect(productionReducer(heated, ProductionActions.heatingRunningChanged({running: false}))).not.toBe(heated);

        const sensor = productionReducer(initialProductionState, ProductionActions.temperatureSensorStateChanged({current: 65, health: 'OK', sensorId: '28-1'}));
        expect(productionReducer(sensor, ProductionActions.temperatureSensorStateChanged({current: 66, health: 'OK', sensorId: '28-1'}))).not.toBe(sensor);
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
    expect(pending.isPollingRunning).toBe(false);
    const failed = productionReducer(pending, ProductionActions.brewingStartFailure('HTTP 500'));
    expect(failed.isPollingRunning).toBe(false);
    expect(failed.brewingStartError).toBe('HTTP 500');
});


describe('productionReducer persistent agitator defaults', () => {
    it('stores defaults separately from realtime agitator state', () => {
        const defaults = {speed: 75, intervalOnMinutes: 5, intervalOffMinutes: 2};
        const nextState = productionReducer(initialProductionState, ProductionActions.agitatorDefaultsChanged(defaults));
        expect(nextState.agitatorDefaults).toEqual(defaults);
        expect(nextState.realtimeState.agitator).toBeUndefined();
    });
});

describe('productionReducer brew recovery lifecycle', () => {
    const snapshot: any = {available: true, recovery: {version: 1, brewSession: {beerId: 'beer-1', plannedVolume: 25, plannedBrewhouseEfficiency: 70}, status: {currentStep: {name: 'Maltoserast'}}, updatedAt: '2026-01-01T12:00:00Z'}};

    it('replaces and clears snapshots idempotently', () => {
        const active = productionReducer(initialProductionState, ProductionActions.brewRecoveryStateChanged(snapshot));
        expect(active.brewRecovery).toMatchObject(snapshot);
        expect(productionReducer(active, ProductionActions.brewRecoveryStateChanged({...snapshot, recovery: {...snapshot.recovery}}))).toBe(active);
        expect(productionReducer(active, ProductionActions.brewRecoveryStateChanged({available: false, recovery: null})).brewRecovery.available).toBe(false);
    });

    it('tracks resume and discard pending failures without clearing recovery', () => {
        const active = productionReducer(initialProductionState, ProductionActions.brewRecoveryStateChanged(snapshot));
        const resume = productionReducer(active, ProductionActions.resumeBrewRecovery());
        expect(resume.brewRecovery.resumePending).toBe(true);
        expect(productionReducer(resume, ProductionActions.resumeBrewRecoveryFailure('HTTP 409')).brewRecovery).toMatchObject({available: true, resumePending: false, error: 'HTTP 409'});
        const discard = productionReducer(active, ProductionActions.discardBrewRecovery());
        expect(discard.brewRecovery.discardPending).toBe(true);
        expect(productionReducer(discard, ProductionActions.discardBrewRecoveryFailure('offline')).brewRecovery).toMatchObject({available: true, discardPending: false, error: 'offline'});
    });

    it('clears stale recovery whenever brew-session-running is received', () => {
        const active = productionReducer(initialProductionState, ProductionActions.brewRecoveryStateChanged(snapshot));
        expect(productionReducer(active, ProductionActions.brewSessionRunningReceived()).brewRecovery).toEqual({available: false, recovery: null, resumePending: false, discardPending: false});
    });
});
