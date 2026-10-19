import {Beer} from '../../../model/Beer';
import {ProcessMode} from '../../../model/brewingStatus.types';
import {dataCollector} from '../../../utils/DataCollector/dataCollector';
import {clock, history, modernStatus, phase, reading} from '../../../testUtils/processTimeline';
import {buildTemperatureTimelineModel, projectTemperatureTimeline} from './temperatureTimelineModel';

const beer = {fermentation: [{type: 'Rast 1', temperature: 65, time: 20}], cookingTime: 60, cookingTemperatur: 99} as Beer;
beforeEach(() => dataCollector.reset());
const model = (page = history([reading(1)]), status = modernStatus()) => {
    dataCollector.applyTimelineHistory(page);
    const snapshot = dataCollector.getTimelineSnapshot();
    return buildTemperatureTimelineModel(beer, status, snapshot.measurements, 0, {phases: snapshot.phases});
};

it('uses the authoritative process clock independently of the last sample and recipe plan', () => {
    const value = model(history([reading(1, 65, 720)]), modernStatus({timeline: clock({processElapsedSeconds: 725})}));
    expect(value.nowSeconds).toBe(725);
    expect(value.points.at(-1)).toMatchObject({elapsedSeconds: 720, actualTemperature: 65});
    expect(projectTemperatureTimeline(value, 726).nowSeconds).toBe(726);
});

it('does not overwrite real or missing readings with stale semantic status temperatures', () => {
    const value = model(history([reading(1, 65), reading(2, null)]));
    expect(value.points).toHaveLength(2);
    expect(value.points[0].actualTemperature).toBe(65);
    expect(value.points[1].actualTemperature).toBeNull();
});

it('retains separate acquisitions in the same second', () => {
    const value = model(history([reading(1, 60, 0.1), reading(2, 60, 0.2)]));
    expect(value.points.map(p => p.elapsedSeconds)).toEqual([0.1, 0.2]);
});

it('grows overdue heat-up and moves only future bands, without rebuilding historical samples', () => {
    const base = model(history([reading(1, 60, 10)]), modernStatus({timeline: clock({processElapsedSeconds: 10})}));
    const later = projectTemperatureTimeline(base, 400);
    expect(later.steps[base.activeStepIndex].endSeconds).toBeGreaterThan(400);
    expect(later.steps[base.activeStepIndex + 1].startSeconds).toBeGreaterThan(400);
    expect(base.points[0].elapsedSeconds).toBe(10);
    expect(base.points).toHaveLength(1);
});

it('keeps actual HEATING → TIMER_RUNNING boundaries when the local timer resets', () => {
    const phases = [phase({endSeconds: 400}), phase({sequence: 2, startSeconds: 400, stepMode: ProcessMode.TIMER_RUNNING})];
    const value = model(history([reading(1, 64, 399), {...reading(2, 65, 401), elapsedTime: 1}], {phases}),
        modernStatus({elapsedTime: 1, timeline: clock({processElapsedSeconds: 401, phaseSequence: 2, phaseStartedAtSeconds: 400}),
            currentStep: {...modernStatus().currentStep, mode: ProcessMode.TIMER_RUNNING, elapsedTime: 1}}));
    const later = projectTemperatureTimeline(value, 500);
    expect(later.steps[0]).toBe(value.steps[0]);
    expect(later.steps[0].endSeconds).toBe(400);
    expect(later.steps[1].startSeconds).toBe(400);
    expect(value.points.map(p => p.elapsedSeconds)).toEqual([399, 401]);
});

it('marks removed history as a line break instead of bridging missing observations', () => {
    const value = model(history([reading(1), reading(100)]));
    expect(value.points).toHaveLength(3);
    expect(value.points[1]).toEqual({elapsedSeconds: 1, gap: true});
});

it('uses a newly received authoritative phase boundary before the next history read', () => {
    const current = modernStatus({timeline: clock({processElapsedSeconds: 401, phaseSequence: 2, phaseStartedAtSeconds: 400}),
        currentStep: {...modernStatus().currentStep, mode: ProcessMode.TIMER_RUNNING}});
    const value = model(history([reading(1, 64, 399)], {phases: [phase()]}), current);
    expect(value.steps[0].endSeconds).toBe(400);
    expect(value.steps[1].startSeconds).toBe(400);
});

it('does not plot an unobserved default fallback temperature at process start', () => {
    expect(buildTemperatureTimelineModel(undefined, undefined, [], 0).points).toEqual([]);
});

it('plans only the remaining timer segment after recovery and keeps past data fixed', () => {
    const current = modernStatus({timeline: clock({processElapsedSeconds: 600, phaseStartedAtSeconds: 600}),
        currentStep: {...modernStatus().currentStep, mode: ProcessMode.TIMER_RUNNING, elapsedTime: 1000, remainingTime: 200}});
    const value = model(history([{...reading(1, 65, 600), elapsedTime: 1000}],
        {phases: [phase({startSeconds: 600, stepMode: ProcessMode.TIMER_RUNNING})]}), current);
    const projected = projectTemperatureTimeline(value, 650, 1050);
    expect(projected.steps[0].endSeconds).toBe(800);
    expect(value.points[0].elapsedSeconds).toBe(600);
});
