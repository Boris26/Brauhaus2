import {ProductionActions} from '../actions/actions';
import {initialProductionState, productionReducer} from './productionReducer';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ToggleState} from '../enums/eToggleState';
import {ConfirmStates} from '../enums/eConfirmStates';

const statusWithAlarms = (alarms: BrewingStatus['alarms']): BrewingStatus => ({
    elapsedTime: 0,
    currentTime: 0,
    process: {state: ProcessState.ACTIVE},
    currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE},
    temperature: {},
    hardware: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {},
    alarms,
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

describe('productionReducer brewingStatus alarms', () => {
    it('replaces the complete status so an ended alarm is removed on the next poll', () => {
        const activeAlarm = {type: AlarmType.EQUIPMENT_ALARM, active: true};
        const alarmState = productionReducer(initialProductionState, ProductionActions.setBrewingStatus(statusWithAlarms([activeAlarm])));

        expect(alarmState.brewingStatus?.alarms).toEqual([activeAlarm]);

        const clearedState = productionReducer(alarmState, ProductionActions.setBrewingStatus(statusWithAlarms([])));
        expect(clearedState.brewingStatus?.alarms).toEqual([]);
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
        const waitingStatus = {...statusWithAlarms([]), waiting: {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true}};
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
        const withStatus = productionReducer(initialProductionState, ProductionActions.setBrewingStatus(statusWithAlarms([])));
        const offline = productionReducer(withStatus, ProductionActions.isBackenAvailable({isBackenAvailable: false, statusText: 'offline'}));
        expect(offline.brewingStatus).toBe(withStatus.brewingStatus);
        expect(offline.isBrewingStatusStale).toBe(true);
        const refreshed = productionReducer(offline, ProductionActions.setBrewingStatus(statusWithAlarms([])));
        expect(refreshed.isBrewingStatusStale).toBe(false);
    });
});

it('makes a brewing start failure visible and releases polling pending state', () => {
    const pending = productionReducer(initialProductionState, ProductionActions.sendBrewingData({} as any));
    const failed = productionReducer(pending, ProductionActions.brewingStartFailure('HTTP 500'));
    expect(failed.isPollingRunning).toBe(false);
    expect(failed.brewingStartError).toBe('HTTP 500');
});
