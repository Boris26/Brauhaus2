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

        expect(model.steps).toHaveLength(15);
        expect(model.steps[11].name).toBe('Aufheizen für Abmaischen');
        expect(model.nowSeconds).toBeGreaterThanOrEqual(model.steps[11].startSeconds);
        expect(model.nowSeconds).toBeLessThanOrEqual(model.steps[11].endSeconds);
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
});
