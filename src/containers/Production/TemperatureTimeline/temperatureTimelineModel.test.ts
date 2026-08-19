import {RestExecutionMode} from '../../../enums/eRestExecutionMode';
import {Beer} from '../../../model/Beer';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import {buildTemperatureTimelineModel} from './temperatureTimelineModel';

const beer = {
    cookingTime: 60,
    cookingTemperatur: 99,
    fermentation: [
        {type: 'Einmaischen', temperature: 57},
        ...[1, 2, 3, 4].map(index => ({type: `Rast ${index}`, temperature: 60 + index * 3, time: 20, executionMode: RestExecutionMode.TIMED})),
        {type: 'Abmaischen', temperature: 78}
    ]
} as Beer;

const status = (overrides: Partial<BrewingStatus> = {}): BrewingStatus => ({
    elapsedTime: 120,
    currentTime: 1783885211,
    process: {state: ProcessState.ACTIVE},
    currentStep: {index: 6, count: 7, phase: ProcessPhase.MASHING_OUT, mode: ProcessMode.HEATING, name: 'Aufheizen für Abmaischen', elapsedTime: 120},
    temperature: {current: 34, target: 45},
    hardware: {}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
    ...overrides
});

const point = (elapsedTime: number, stepIndex: number, stepPhase: ProcessPhase, stepMode: ProcessMode): TimelineMeasurement => ({
    elapsedTime, currentTime: 0, Temperature: 34, TargetTemperature: 45,
    stepIndex, stepPhase, stepMode
});

describe('temperature timeline model', () => {
    it('places a late-started collector in the same process band as the process overview', () => {
        const model = buildTemperatureTimelineModel(beer, status(), [point(120, 6, ProcessPhase.MASHING_OUT, ProcessMode.HEATING)], 0);

        expect(model.steps).toHaveLength(14);
        expect(model.steps[10].name).toBe('Aufheizen für Abmaischen');
        expect(model.nowSeconds).toBeGreaterThanOrEqual(model.steps[10].startSeconds);
        expect(model.nowSeconds).toBeLessThanOrEqual(model.steps[10].endSeconds);
        expect(model.points.at(-1)?.elapsedSeconds).toBe(model.nowSeconds);
        expect(model.progressPercent).toBeGreaterThan(50);
    });

    it('normalizes resetting step elapsed values into one cumulative axis', () => {
        const measurements = [
            point(300, 1, ProcessPhase.MASHING_IN, ProcessMode.HEATING),
            point(20, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING),
            point(600, 2, ProcessPhase.RAST, ProcessMode.TIMER_RUNNING),
            point(40, 3, ProcessPhase.RAST, ProcessMode.HEATING)
        ];
        const active = status({elapsedTime: 40, currentStep: {index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING, elapsedTime: 40}});
        const model = buildTemperatureTimelineModel(beer, active, measurements, 0);
        const xValues = model.points.map(item => item.elapsedSeconds);

        expect(xValues).toEqual([...xValues].sort((left, right) => left - right));
        expect(model.nowSeconds).toBe(940);
        expect(model.steps[4].startSeconds).toBeLessThanOrEqual(model.nowSeconds);
        expect(model.steps[4].endSeconds).toBeGreaterThanOrEqual(model.nowSeconds);
    });

    it('uses 100 percent for a finished brew', () => {
        const model = buildTemperatureTimelineModel(beer, status({process: {state: ProcessState.FINISHED}}), [], 0);
        expect(model.progressPercent).toBe(100);
    });

    it('shows thermal process rows, hides heating labels and omits display-only rows', () => {
        const model = buildTemperatureTimelineModel(beer, status(), [], 0);
        const heating = model.steps.find(step => step.entryType === 'HEATING');
        const rast = model.steps.find(step => step.name === 'Rast 1');

        expect(heating).toBeDefined();
        expect(heating?.showLabel).toBe(false);
        expect(rast?.showLabel).toBe(true);
        expect(model.steps.some(step => step.entryType === 'DISPLAY')).toBe(false);
        expect(model.steps.some(step => step.name === 'Jod Probe')).toBe(false);
    });

    it('does not allocate time or a boundary for a display-only process row', () => {
        const model = buildTemperatureTimelineModel(beer, undefined, [], 0);
        const lastRast = model.steps.find(step => step.name === 'Rast 4');
        const mashOutHeating = model.steps.find(step => step.name === 'Aufheizen für Abmaischen');

        expect(lastRast).toBeDefined();
        expect(mashOutHeating?.startSeconds).toBe(lastRast?.endSeconds);
    });

    it('grows an overdue heating phase, shifts only future rows and keeps now inside the active row', () => {
        const atFiveMinutes = status({
            elapsedTime: 300,
            currentStep: {index: 6, phase: ProcessPhase.MASHING_OUT, mode: ProcessMode.HEATING, elapsedTime: 300}
        });
        const atSevenMinutes = status({
            elapsedTime: 420,
            currentStep: {index: 6, phase: ProcessPhase.MASHING_OUT, mode: ProcessMode.HEATING, elapsedTime: 420}
        });
        const fiveMinuteModel = buildTemperatureTimelineModel(beer, atFiveMinutes, [point(300, 6, ProcessPhase.MASHING_OUT, ProcessMode.HEATING)], 0);
        const sevenMinuteModel = buildTemperatureTimelineModel(beer, atSevenMinutes, [point(420, 6, ProcessPhase.MASHING_OUT, ProcessMode.HEATING)], 0);
        const activeAtFive = fiveMinuteModel.steps[10];
        const activeAtSeven = sevenMinuteModel.steps[10];

        expect(activeAtSeven.startSeconds).toBe(activeAtFive.startSeconds);
        expect(activeAtSeven.endSeconds - activeAtSeven.startSeconds).toBe(420);
        expect(sevenMinuteModel.steps[9]).toEqual(fiveMinuteModel.steps[9]);
        expect(sevenMinuteModel.steps[11].startSeconds - fiveMinuteModel.steps[11].startSeconds).toBe(120);
        expect(sevenMinuteModel.nowSeconds).toBeGreaterThanOrEqual(activeAtSeven.startSeconds);
        expect(sevenMinuteModel.nowSeconds).toBeLessThanOrEqual(activeAtSeven.endSeconds);
        expect(sevenMinuteModel.endSeconds - fiveMinuteModel.endSeconds).toBe(120);
    });

    it('keeps observed boundaries stable when intermediate temperature detail is removed', () => {
        const fullHistory = [
            point(0, 1, ProcessPhase.MASHING_IN, ProcessMode.HEATING),
            point(120, 1, ProcessPhase.MASHING_IN, ProcessMode.HEATING),
            point(300, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING),
            point(360, 2, ProcessPhase.RAST, ProcessMode.HEATING)
        ];
        const trimmedHistory = [fullHistory[0], fullHistory[2], fullHistory[3]];
        const active = status({elapsedTime: 360, currentStep: {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING, elapsedTime: 60}});
        const beforeTrim = buildTemperatureTimelineModel(beer, active, fullHistory, 0);
        const afterTrim = buildTemperatureTimelineModel(beer, active, trimmedHistory, 0);

        expect(afterTrim.steps.slice(0, 3)).toEqual(beforeTrim.steps.slice(0, 3));
    });
});
