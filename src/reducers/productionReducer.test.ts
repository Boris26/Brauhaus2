import {ProductionActions} from '../actions/actions';
import {initialProductionState, productionReducer} from './productionReducer';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';

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
