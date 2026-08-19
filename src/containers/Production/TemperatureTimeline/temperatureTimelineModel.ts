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
    progressPercent: number;
}

const DEFAULT_UNTIMED_STEP_SECONDS = 5 * 60;
const MIN_LABEL_SECONDS = 3 * 60;

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
    measurements: TimelineMeasurement[],
    fallbackTemperature: number
): TemperatureTimelineModel => {
    const processSteps = selectedBeer ? createProcessSteps(selectedBeer) : [];
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
    }).sort((left, right) => left.timelineSeconds - right.timelineSeconds);

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

    const steps: TimelineStep[] = [];
    let cursor = 0;
    processSteps.forEach((step, index) => {
        const observedStart = observedStarts.get(index);
        const nextObservedStart = observedStarts.get(index + 1);
        const startSeconds = Math.max(cursor, observedStart ?? cursor);
        let endSeconds = nextObservedStart ?? startSeconds + getPlannedDuration(step);
        if (index === activeIndex) endSeconds = Math.max(endSeconds, nowSeconds);
        if (index < activeIndex && nextObservedStart === undefined) endSeconds = Math.max(endSeconds, startSeconds + getPlannedDuration(step));
        endSeconds = Math.max(startSeconds + 1, endSeconds);
        steps.push({...step, startSeconds, endSeconds, targetTemperature: step.detail?.temperature, showLabel: endSeconds - startSeconds >= MIN_LABEL_SECONDS});
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
    const progressPercent = finished ? 100 : Math.min(100, Math.max(0, nowSeconds * 100 / endSeconds));
    return {steps, points: Array.from(pointsBySecond.values()).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds), nowSeconds, endSeconds, progressPercent};
};
