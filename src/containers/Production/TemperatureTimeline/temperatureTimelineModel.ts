import {Beer} from '../../../model/Beer';
import {BrewingStatus, ProcessState} from '../../../model/brewingStatus.types';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import {createProcessSteps, getActiveProcessStepIndex, ProcessListEntryType, ProcessListStep} from '../ProcessList/ProcessList';

export interface TimelineStep extends ProcessListStep {
    startSeconds: number;
    endSeconds: number;
    targetTemperature?: number;
    showLabel: boolean;
}

export interface TimelinePoint {
    elapsedSeconds: number;
    actualTemperature?: number;
    targetTemperature?: number;
}

export interface TemperatureTimelineModel {
    steps: TimelineStep[];
    points: TimelinePoint[];
    nowSeconds: number;
    endSeconds: number;
    axisEndSeconds: number;
    axisTicks: number[];
    progressPercent: number;
}

export interface TemperatureTimelineModelOptions {
    /** Skip defensive input sorting only for collectionSequence-ordered snapshots. */
    measurementsOrderedByCollection?: boolean;
}

const DEFAULT_UNTIMED_STEP_SECONDS = 5 * 60;
const MIN_LABEL_SECONDS = 3 * 60;
const AXIS_TICK_INTERVALS_SECONDS = [5, 10, 15, 30, 60].map(minutes => minutes * 60);
const TARGET_AXIS_INTERVAL_COUNT = 4;

const buildStableTimeAxis = (contentEndSeconds: number): {axisEndSeconds: number; axisTicks: number[]} => {
    const requiredInterval = contentEndSeconds / TARGET_AXIS_INTERVAL_COUNT;
    const tickInterval = AXIS_TICK_INTERVALS_SECONDS.find(interval => interval >= requiredInterval)
        ?? AXIS_TICK_INTERVALS_SECONDS.at(-1)!;
    const axisEndSeconds = Math.max(tickInterval, Math.ceil(contentEndSeconds / tickInterval) * tickInterval);
    const axisTicks = Array.from({length: Math.floor(axisEndSeconds / tickInterval) + 1}, (_, index) => index * tickInterval);
    return {axisEndSeconds, axisTicks};
};

const safeNumber = (value: unknown): number | undefined => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getPlannedDuration = (step: ProcessListStep): number => {
    if (step.entryType === ProcessListEntryType.DISPLAY) return DEFAULT_UNTIMED_STEP_SECONDS;
    const duration = safeNumber(step.detail?.duration);
    // Recipe rest durations are stored in minutes; cooking is already converted by createProcessSteps.
    if (duration !== undefined && duration > 0) {
        return step.phase === 'COOKING' ? duration : duration * 60;
    }
    return DEFAULT_UNTIMED_STEP_SECONDS;
};

const getMeasurementStepIndex = (steps: ProcessListStep[], measurement: TimelineMeasurement): number => {
    return getActiveProcessStepIndex(steps, measurement.stepIndex ?? 0, {
        index: measurement.stepIndex,
        phase: measurement.stepPhase,
        mode: measurement.stepMode,
        name: measurement.stepName
    });
};

/**
 * Builds one cumulative axis for status samples, process bands and the now marker.
 * elapsedTime is monotonic on newer controllers but older/history payloads may reset
 * at status transitions; a decrease is therefore converted into a cumulative offset.
 */
export const buildTemperatureTimelineModel = (
    selectedBeer: Beer | undefined,
    brewingStatus: BrewingStatus | undefined,
    measurements: readonly TimelineMeasurement[],
    fallbackTemperature: number,
    options: TemperatureTimelineModelOptions = {}
): TemperatureTimelineModel => {
    // DISPLAY rows belong to the process overview, but have no independent
    // thermal duration and must not consume space on the temperature axis.
    const processSteps = selectedBeer
        ? createProcessSteps(selectedBeer).filter(step => step.entryType !== ProcessListEntryType.DISPLAY)
        : [];
    const activeIndex = processSteps.length && brewingStatus
        ? getActiveProcessStepIndex(processSteps, brewingStatus.currentStep.index ?? 0, brewingStatus.currentStep)
        : -1;

    let offset = 0;
    let previousRaw = 0;
    const normalized = measurements.map((measurement, index) => {
        const raw = Math.max(0, safeNumber(measurement.elapsedTime) ?? 0);
        if (index > 0 && raw < previousRaw) offset += previousRaw;
        previousRaw = raw;
        return {...measurement, timelineSeconds: offset + raw};
    });
    if (!options.measurementsOrderedByCollection) {
        normalized.sort((left, right) => left.timelineSeconds - right.timelineSeconds);
    }

    const observedStarts = new Map<number, number>();
    normalized.forEach(measurement => {
        if (measurement.stepIndex === undefined) return;
        const index = getMeasurementStepIndex(processSteps, measurement);
        observedStarts.set(index, Math.min(observedStarts.get(index) ?? Number.POSITIVE_INFINITY, measurement.timelineSeconds));
    });

    const statusElapsed = Math.max(0, safeNumber(brewingStatus?.elapsedTime) ?? 0);
    const lastObserved = normalized.at(-1)?.timelineSeconds ?? 0;
    let nowSeconds = Math.max(statusElapsed, lastObserved);

    // If collection started in the middle of a brew and elapsedTime is step-local,
    // place the current step after all preceding planned bands instead of at x=0.
    const plannedBeforeCurrent = processSteps.slice(0, Math.max(0, activeIndex)).reduce((sum, step) => sum + getPlannedDuration(step), 0);
    const currentStepElapsed = Math.max(0, safeNumber(brewingStatus?.currentStep.elapsedTime) ?? statusElapsed);
    if (activeIndex > 0 && !Array.from(observedStarts.keys()).some(index => index < activeIndex)) {
        const shift = Math.max(0, plannedBeforeCurrent + currentStepElapsed - nowSeconds);
        normalized.forEach(measurement => { measurement.timelineSeconds += shift; });
        nowSeconds += shift;
        observedStarts.set(activeIndex, plannedBeforeCurrent);
    }

    // The controller-owned current step is a hard boundary. An observed start is
    // preferred; otherwise derive it from the step-local elapsed time. Estimates
    // for completed rows must never move this boundary into the future.
    const activeStartSeconds = activeIndex >= 0
        ? Math.max(0, observedStarts.get(activeIndex) ?? nowSeconds - currentStepElapsed)
        : undefined;
    if (activeIndex >= 0 && activeStartSeconds !== undefined) {
        observedStarts.set(activeIndex, Math.min(nowSeconds, activeStartSeconds));
    }

    const nextObservedStartByIndex: Array<number | undefined> = new Array(processSteps.length);
    let nextObservedStart: number | undefined;
    for (let index = processSteps.length - 1; index >= 0; index -= 1) {
        nextObservedStartByIndex[index] = nextObservedStart;
        const observedStart = observedStarts.get(index);
        if (observedStart !== undefined) nextObservedStart = observedStart;
    }

    const steps: TimelineStep[] = [];
    let cursor = 0;
    processSteps.forEach((step, index) => {
        const observedStart = observedStarts.get(index);
        const nextObservedStart = nextObservedStartByIndex[index];
        const hardCurrentBoundary = index < activeIndex ? activeStartSeconds : undefined;
        const latestEnd = hardCurrentBoundary === undefined
            ? nextObservedStart
            : Math.min(hardCurrentBoundary, nextObservedStart ?? hardCurrentBoundary);
        const startSeconds = latestEnd === undefined
            ? Math.max(cursor, observedStart ?? cursor)
            : Math.min(latestEnd, Math.max(cursor, observedStart ?? cursor));
        let endSeconds = observedStarts.get(index + 1) ?? startSeconds + getPlannedDuration(step);
        if (latestEnd !== undefined) endSeconds = Math.min(endSeconds, latestEnd);
        if (index === activeIndex) endSeconds = Math.max(endSeconds, nowSeconds);
        // Completed, unobserved rows may collapse to zero real seconds. Current
        // and future rows retain their estimates (including active heating).
        endSeconds = Math.max(startSeconds + (index < activeIndex ? 0 : 1), endSeconds);
        steps.push({
            ...step,
            startSeconds,
            endSeconds,
            targetTemperature: step.detail?.temperature,
            showLabel: step.entryType !== ProcessListEntryType.HEATING && endSeconds - startSeconds >= MIN_LABEL_SECONDS
        });
        cursor = endSeconds;
    });

    const currentActual = safeNumber(brewingStatus?.temperature.current) ?? safeNumber(fallbackTemperature);
    const currentTarget = safeNumber(brewingStatus?.temperature.target);
    const pointsBySecond = new Map<number, TimelinePoint>();
    normalized.forEach(measurement => {
        const elapsedSeconds = Math.floor(measurement.timelineSeconds);
        pointsBySecond.set(elapsedSeconds, {
            elapsedSeconds,
            actualTemperature: safeNumber(measurement.Temperature),
            targetTemperature: safeNumber(measurement.TargetTemperature)
        });
    });
    pointsBySecond.set(Math.floor(nowSeconds), {
        ...(pointsBySecond.get(Math.floor(nowSeconds)) ?? {elapsedSeconds: Math.floor(nowSeconds)}),
        actualTemperature: currentActual,
        targetTemperature: currentTarget
    });

    const finished = brewingStatus?.process.state === ProcessState.FINISHED;
    const endSeconds = Math.max(nowSeconds, steps.at(-1)?.endSeconds ?? 0, 60);
    const {axisEndSeconds, axisTicks} = buildStableTimeAxis(endSeconds);
    const progressPercent = finished ? 100 : Math.min(100, Math.max(0, nowSeconds * 100 / endSeconds));
    // normalized is chronological in both paths. Map preserves first insertion
    // order when the value for an already observed second is replaced.
    return {steps, points: Array.from(pointsBySecond.values()), nowSeconds, endSeconds, axisEndSeconds, axisTicks, progressPercent};
};
