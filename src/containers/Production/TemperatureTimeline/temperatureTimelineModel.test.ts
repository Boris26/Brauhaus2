import {RestExecutionMode} from '../../../enums/eRestExecutionMode';
import {Beer} from '../../../model/Beer';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import {buildTemperatureTimelineModel} from './temperatureTimelineModel';
import {ProcedureType} from '../../../enums/eProcedureType';

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
    process: {state: ProcessState.ACTIVE},
    currentStep: {index: 6, count: 7, phase: ProcessPhase.MASHING_OUT, mode: ProcessMode.HEATING, name: 'Aufheizen für Abmaischen', elapsedTime: 120},
    temperature: {current: 34, target: 45},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
    ...overrides
});

const point = (elapsedTime: number, stepIndex: number, stepPhase: ProcessPhase, stepMode: ProcessMode): TimelineMeasurement => ({
    elapsedTime, Temperature: 34, TargetTemperature: 45,
    stepIndex, stepPhase, stepMode
});

const expectMonotonicSteps = (model: ReturnType<typeof buildTemperatureTimelineModel>) => {
    model.steps.forEach((step, index) => {
        expect(step.endSeconds).toBeGreaterThanOrEqual(step.startSeconds);
        if (index > 0) expect(step.startSeconds).toBeGreaterThanOrEqual(model.steps[index - 1].endSeconds);
    });
};

describe('temperature timeline model', () => {
    it('advances only the now marker while retaining authoritative temperature-point time', () => {
        const timed = status({
            elapsedTime: 120,
            currentStep: {index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, duration: 600, elapsedTime: 120, remainingTime: 480},
        });
        const model = buildTemperatureTimelineModel(undefined, timed, [], 34, {displayNowSeconds: 125, displayCurrentStepElapsedSeconds: 125});

        expect(model.nowSeconds).toBe(125);
        expect(model.points).toEqual([{elapsedSeconds: 120, actualTemperature: 34, targetTemperature: 45}]);
    });
    it('keeps multiple and consecutive decoctions as independent fallback-duration bands', () => {
        const decoctionBeer = {...beer, fermentation: [
            {type: 'Einmaischen', temperature: 57},
            {type: 'Dekoktion 1', temperature: 64, executionMode: RestExecutionMode.CONFIRMATION_HOLD, procedureType: ProcedureType.DECOCTION},
            {type: 'Dekoktion 2', temperature: 66, executionMode: RestExecutionMode.CONFIRMATION_HOLD, procedureType: ProcedureType.DECOCTION},
            {type: 'Rast 1', temperature: 68, time: 20, executionMode: RestExecutionMode.TIMED, procedureType: ProcedureType.RAST},
            {type: 'Abmaischen', temperature: 78}
        ]} as Beer;
        const active = status({currentStep: {index: 3, phase: ProcessPhase.DECOCTION, mode: ProcessMode.WAITING, name: 'Dekoktion 2', elapsedTime: 0}});
        const model = buildTemperatureTimelineModel(decoctionBeer, active, [], 20);
        const mashBands = model.steps.filter(step => step.entryType === 'PROCESS' && [ProcessPhase.RAST, ProcessPhase.DECOCTION].includes(step.phase!));

        expect(mashBands.map(step => [step.name, step.phase])).toEqual([
            ['Dekoktion 1', ProcessPhase.DECOCTION],
            ['Dekoktion 2', ProcessPhase.DECOCTION],
            ['Rast 1', ProcessPhase.RAST]
        ]);
        expect(mashBands.every(step => step.endSeconds > step.startSeconds)).toBe(true);
    });
    it.each([500, 2000, 5000])('keeps the ordered fast path equivalent for %i chronological measurements', (measurementCount) => {
        const measurements = Array.from({length: measurementCount}, (_, index) => ({
            ...point(index, 1, ProcessPhase.MASHING_IN, ProcessMode.HEATING),
            collectionSequence: index
        }));
        const currentStatus = status({elapsedTime: measurementCount - 1});

        const defensiveModel = buildTemperatureTimelineModel(undefined, currentStatus, measurements, 0);
        const orderedModel = buildTemperatureTimelineModel(undefined, currentStatus, measurements, 0, {measurementsOrderedByCollection: true});

        expect(orderedModel).toEqual(defensiveModel);
        expect(orderedModel.points).toHaveLength(measurementCount);
    });

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

    it('keeps the visible time axis stable across polls inside one rounded boundary', () => {
        const models = [601, 602, 603, 604].map(elapsedTime => buildTemperatureTimelineModel(
            undefined,
            status({elapsedTime, currentStep: {...status().currentStep, index: 0, elapsedTime}}),
            [point(elapsedTime, 0, ProcessPhase.MASHING_IN, ProcessMode.HEATING)],
            0
        ));

        expect(new Set(models.map(model => model.axisEndSeconds))).toHaveSize(1);
        models.slice(1).forEach(model => expect(model.axisTicks).toEqual(models[0].axisTicks));
    });

    it('extends the visible time axis only after crossing its rounded boundary', () => {
        const before = buildTemperatureTimelineModel(undefined, status({elapsedTime: 899}), [], 0);
        const after = buildTemperatureTimelineModel(undefined, status({elapsedTime: 901}), [], 0);

        expect(before.axisEndSeconds).toBe(900);
        expect(after.axisEndSeconds).toBe(1200);
        expect(after.axisTicks.at(-1)).toBe(after.axisEndSeconds);
    });

    it('lets an overdue process grow while retaining one stable tick grid per boundary', () => {
        const at601 = buildTemperatureTimelineModel(beer, status({elapsedTime: 601, currentStep: {...status().currentStep, elapsedTime: 601}}), [point(601, 6, ProcessPhase.MASHING_OUT, ProcessMode.HEATING)], 0);
        const at604 = buildTemperatureTimelineModel(beer, status({elapsedTime: 604, currentStep: {...status().currentStep, elapsedTime: 604}}), [point(604, 6, ProcessPhase.MASHING_OUT, ProcessMode.HEATING)], 0);

        expect(at604.endSeconds).toBeGreaterThan(at601.endSeconds);
        expect(at604.axisEndSeconds).toBe(at601.axisEndSeconds);
        expect(at604.axisTicks).toEqual(at601.axisTicks);
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

    it('keeps now in Rast 1 when its heating phase was skipped between polls', () => {
        const measurements = [
            point(0, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING),
            point(2, 2, ProcessPhase.RAST, ProcessMode.TIMER_RUNNING)
        ];
        const active = status({
            elapsedTime: 2,
            currentStep: {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 1', elapsedTime: 2}
        });
        const model = buildTemperatureTimelineModel(beer, active, measurements, 0);
        const skippedHeating = model.steps[2];
        const activeRast = model.steps[3];

        expect(activeRast.name).toBe('Rast 1');
        expect(activeRast.startSeconds).toBeLessThanOrEqual(model.nowSeconds);
        expect(activeRast.endSeconds).toBeGreaterThanOrEqual(model.nowSeconds);
        expect(skippedHeating.endSeconds - skippedHeating.startSeconds).toBeLessThan(300);
        expect(model.steps.slice(0, 3).every(step => step.endSeconds <= activeRast.startSeconds)).toBe(true);
        expectMonotonicSteps(model);
    });

    it('derives the active start from current step elapsed time when no current sample exists', () => {
        const active = status({
            elapsedTime: 130,
            currentStep: {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 1', elapsedTime: 10}
        });
        const model = buildTemperatureTimelineModel(beer, active, [point(100, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING)], 0);
        const activeRast = model.steps[3];

        expect(activeRast.startSeconds).toBe(120);
        expect(activeRast.startSeconds).toBeLessThanOrEqual(model.nowSeconds);
        expect(activeRast.endSeconds).toBeGreaterThanOrEqual(model.nowSeconds);
        expectMonotonicSteps(model);
    });

    it('uses a two-second observed heating window without replacing it with five minutes', () => {
        const measurements = [
            point(100, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING),
            point(100, 2, ProcessPhase.RAST, ProcessMode.HEATING),
            point(102, 2, ProcessPhase.RAST, ProcessMode.TIMER_RUNNING)
        ];
        const active = status({
            elapsedTime: 102,
            currentStep: {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 1', elapsedTime: 0}
        });
        const model = buildTemperatureTimelineModel(beer, active, measurements, 0);

        expect(model.steps[2].endSeconds - model.steps[2].startSeconds).toBe(2);
        expectMonotonicSteps(model);
    });

    it('lets a later non-adjacent anchor bound completed estimates and preserves future plans', () => {
        const measurements = [
            point(0, 1, ProcessPhase.MASHING_IN, ProcessMode.WAITING),
            point(30, 2, ProcessPhase.RAST, ProcessMode.TIMER_RUNNING)
        ];
        const active = status({
            elapsedTime: 30,
            currentStep: {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 1', elapsedTime: 0}
        });
        const model = buildTemperatureTimelineModel(beer, active, measurements, 0);

        expect(model.steps[1].endSeconds).toBeLessThanOrEqual(model.steps[3].startSeconds);
        expect(model.steps[2].endSeconds).toBe(model.steps[3].startSeconds);
        expect(model.steps[4].endSeconds - model.steps[4].startSeconds).toBe(300);
        expect(model.steps[5].endSeconds - model.steps[5].startSeconds).toBe(20 * 60);
        expectMonotonicSteps(model);
    });
});
