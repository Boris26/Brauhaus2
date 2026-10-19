import {Beer} from '../../../model/Beer';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState} from '../../../model/brewingStatus.types';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import {createProcessSteps, getActiveProcessStepIndex, ProcessListEntryType, ProcessListStep} from '../../../utils/brewingStatus/processSteps';
import {RecordedPhase, TimelineClock} from '../../../model/ProcessTimeline';

export interface TimelineStep extends ProcessListStep {
    id?: string;
    startSeconds: number;
    endSeconds: number;
    targetTemperature?: number;
    showLabel: boolean;
}

export interface TimelinePoint {
    measurementSequence?: number;
    measuredAt?: string;
    /** Explicit absence between retained samples, never a temperature reading. */
    gap?: boolean;
    elapsedSeconds: number;
    actualTemperature?: number | null;
    targetTemperature?: number | null;
}

export interface TemperatureTimelineModel {
    activeTimerDuration?: number;
    clockOffsetSeconds: number;
    activeStepIndex: number;
    steps: TimelineStep[];
    points: TimelinePoint[];
    nowSeconds: number;
    endSeconds: number;
    axisEndSeconds: number;
    axisTicks: number[];
    progressPercent: number;
}

export interface TemperatureTimelineModelOptions {
    phases?: readonly RecordedPhase[];
    historyClock?: TimelineClock;
    /** Skip defensive input sorting only for collectionSequence-ordered snapshots. */
    measurementsOrderedByCollection?: boolean;
    /** Locally projected marker positions; measurements remain controller samples. */
    displayNowSeconds?: number;
    displayCurrentStepElapsedSeconds?: number;
}

const DEFAULT_UNTIMED_STEP_SECONDS = 5 * 60;
const MIN_LABEL_SECONDS = 3 * 60;
const AXIS_TICK_INTERVALS_SECONDS = [5, 10, 15, 30, 60].map(minutes => minutes * 60);
const TARGET_AXIS_INTERVAL_COUNT = 4;
const pointCache = new WeakMap<TimelineMeasurement, TimelinePoint>();

export const buildStableTimeAxis = (contentEndSeconds: number): {axisEndSeconds: number; axisTicks: number[]} => {
    const requiredInterval = contentEndSeconds / TARGET_AXIS_INTERVAL_COUNT;
    const tickInterval = AXIS_TICK_INTERVALS_SECONDS.find(interval => interval >= requiredInterval)
        ?? AXIS_TICK_INTERVALS_SECONDS.at(-1)!;
    const axisEndSeconds = Math.max(tickInterval, Math.ceil(contentEndSeconds / tickInterval) * tickInterval);
    const axisTicks = Array.from({length: Math.floor(axisEndSeconds / tickInterval) + 1}, (_, index) => index * tickInterval);
    return {axisEndSeconds, axisTicks};
};

const safeNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
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

const buildAuthoritativeModel = (processSteps: ProcessListStep[], status: BrewingStatus,
    measurements: readonly TimelineMeasurement[], options: TemperatureTimelineModelOptions): TemperatureTimelineModel => {
    const clock = status.timeline!;
    const nowSeconds = options.displayNowSeconds ?? clock.processElapsedSeconds;
    const points: TimelinePoint[] = [];
    measurements.forEach((p, index) => {
        if (p.processElapsedSeconds === undefined) return; // Never reinterpret legacy local coordinates.
        const previous = measurements[index - 1];
        if (previous?.measurementSequence !== undefined && p.measurementSequence !== undefined
            && p.measurementSequence > previous.measurementSequence + 1) {
            points.push({elapsedSeconds: previous.processElapsedSeconds!, gap: true});
        }
        let point = pointCache.get(p);
        if (!point) {
            point = {elapsedSeconds: p.processElapsedSeconds, actualTemperature: p.Temperature === null ? null : safeNumber(p.Temperature),
                targetTemperature: p.TargetTemperature === null ? null : safeNumber(p.TargetTemperature), measuredAt: p.measuredAt, measurementSequence: p.measurementSequence};
            pointCache.set(p, point);
        }
        points.push(point);
    });
    const phases = (options.phases ?? []).filter(p => p.sequence <= clock.phaseSequence || p.startSeconds <= nowSeconds);
    // An authoritative phase boundary is valid even before the history read finishes.
    const currentPhase: RecordedPhase = {sequence: clock.phaseSequence, startSeconds: clock.phaseStartedAtSeconds,
        endSeconds: null, stepIndex: status.currentStep.index, stepPhase: status.currentStep.phase,
        stepMode: status.currentStep.mode, stepName: status.currentStep.name, targetTemperature: status.temperature.target ?? null};
    let source: readonly RecordedPhase[] = phases.length ? phases : [currentPhase];
    if (phases.length && phases.at(-1)!.sequence < clock.phaseSequence) {
        source = phases.map((p, index) => index === phases.length - 1 && p.endSeconds === null
            ? {...p, endSeconds: clock.phaseStartedAtSeconds} : p).concat(currentPhase);
    }
    const steps: TimelineStep[] = [];
    let lastRecipeIndex = -1;
    source.forEach(phase => {
        const recipeIndex = getActiveProcessStepIndex(processSteps, phase.stepIndex ?? 0,
            {index: phase.stepIndex, phase: phase.stepPhase, mode: phase.stepMode, name: phase.stepName});
        const planned = processSteps[recipeIndex] ?? {name: phase.stepMode === ProcessMode.HEATING
            ? `Aufheizen für ${phase.stepName ?? phase.stepPhase}` : phase.stepName ?? phase.stepPhase,
            entryType: phase.stepMode === ProcessMode.HEATING ? ProcessListEntryType.HEATING : ProcessListEntryType.PROCESS, phase: phase.stepPhase};
        const previous = steps.at(-1);
        const end = phase.endSeconds ?? Math.max(nowSeconds, phase.startSeconds);
        if (previous && recipeIndex === lastRecipeIndex && previous.endSeconds === phase.startSeconds) {
            previous.endSeconds = end;
        } else {
            steps.push({...planned, id: `observed-${phase.sequence}`, startSeconds: phase.startSeconds,
                endSeconds: end, showLabel: false, targetTemperature: safeNumber(phase.targetTemperature)});
        }
        lastRecipeIndex = recipeIndex;
    });
    const activeStepIndex = status.process.state === ProcessState.ACTIVE && steps.length ? steps.length - 1 : -1;
    const activeTimerDuration = status.currentStep.mode === ProcessMode.TIMER_RUNNING ? safeNumber(status.currentStep.duration) : undefined;
    if (activeStepIndex >= 0) {
        const active = steps[activeStepIndex];
        const remaining = safeNumber(status.currentStep.remainingTime)
            ?? Math.max(0, (activeTimerDuration ?? 0) - (safeNumber(status.currentStep.elapsedTime) ?? 0));
        const estimatedEnd = activeTimerDuration !== undefined ? clock.processElapsedSeconds + remaining
            : active.startSeconds + getPlannedDuration(active);
        active.endSeconds = Math.max(active.endSeconds, nowSeconds + 1, estimatedEnd);
        let cursor = active.endSeconds;
        processSteps.slice(lastRecipeIndex + 1).forEach((planned, index) => {
            const endSeconds = cursor + getPlannedDuration(planned);
            steps.push({...planned, id: `planned-${lastRecipeIndex + 1 + index}`, startSeconds: cursor,
                endSeconds, showLabel: false, targetTemperature: planned.detail?.temperature});
            cursor = endSeconds;
        });
    }
    steps.forEach(step => {step.showLabel = step.entryType !== ProcessListEntryType.HEATING && step.endSeconds - step.startSeconds >= MIN_LABEL_SECONDS;});
    const endSeconds = Math.max(nowSeconds, steps.at(-1)?.endSeconds ?? 0, points.at(-1)?.elapsedSeconds ?? 0, 60);
    return {steps, points, nowSeconds, endSeconds, clockOffsetSeconds: 0, activeStepIndex, activeTimerDuration,
        ...buildStableTimeAxis(endSeconds), progressPercent: status.process.state === ProcessState.FINISHED ? 100 : nowSeconds * 100 / endSeconds};
};

/** Lightweight clock projection; historical samples and completed bands retain their references. */
export const projectTemperatureTimeline = (model: TemperatureTimelineModel, nowSeconds: number, stepElapsedSeconds?: number) => {
    const active = model.steps[model.activeStepIndex];
    const timerEnd = model.activeTimerDuration !== undefined && stepElapsedSeconds !== undefined
        ? nowSeconds + Math.max(0, model.activeTimerDuration - stepElapsedSeconds) : undefined;
    const growth = active ? Math.max(nowSeconds + 1, timerEnd ?? active.endSeconds) - active.endSeconds : 0;
    const steps = growth === 0 ? model.steps : model.steps.map((step, index) => index < model.activeStepIndex ? step
        : index === model.activeStepIndex ? {...step, endSeconds: step.endSeconds + growth}
        : {...step, startSeconds: step.startSeconds + growth, endSeconds: step.endSeconds + growth});
    const endSeconds = Math.max(nowSeconds, steps.at(-1)?.endSeconds ?? model.endSeconds, 60);
    return {steps, nowSeconds, endSeconds, ...buildStableTimeAxis(endSeconds)};
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
    if (brewingStatus?.timeline) return buildAuthoritativeModel(processSteps, brewingStatus, measurements, options);
    if (options.historyClock) {
        const previous = options.phases?.at(-1);
        const retained: BrewingStatus = {elapsedTime: 0, timeline: {...options.historyClock, running: false},
            process: {state: ProcessState.ACTIVE}, currentStep: {index: previous?.stepIndex,
                phase: previous?.stepPhase ?? brewingStatus?.currentStep.phase ?? ProcessPhase.NONE,
                mode: previous?.stepMode ?? brewingStatus?.currentStep.mode ?? ProcessMode.NONE},
            temperature: {}, waiting: {waitingFor: 'NONE', canConfirm: false}, error: {}};
        return buildAuthoritativeModel([], retained, measurements,
            {...options, displayNowSeconds: options.historyClock.processElapsedSeconds});
    }
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

    const authoritativeStatusElapsed = Math.max(0, safeNumber(brewingStatus?.elapsedTime) ?? 0);
    const statusElapsed = Math.max(authoritativeStatusElapsed, safeNumber(options.displayNowSeconds) ?? authoritativeStatusElapsed);
    const lastObserved = normalized.at(-1)?.timelineSeconds ?? 0;
    // Legacy reconstruction is approximate, but the marker still belongs to
    // the status clock, never to the latest temperature-change timestamp.
    let nowSeconds = offset + statusElapsed;

    // If collection started in the middle of a brew and elapsedTime is step-local,
    // place the current step after all preceding planned bands instead of at x=0.
    const plannedBeforeCurrent = processSteps.slice(0, Math.max(0, activeIndex)).reduce((sum, step) => sum + getPlannedDuration(step), 0);
    const currentStepElapsed = Math.max(0, safeNumber(options.displayCurrentStepElapsedSeconds) ?? safeNumber(brewingStatus?.currentStep.elapsedTime) ?? statusElapsed);
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

    const pointsBySecond = new Map<number, TimelinePoint>();
    normalized.forEach(measurement => {
        const elapsedSeconds = Math.floor(measurement.timelineSeconds);
        pointsBySecond.set(elapsedSeconds, {
            elapsedSeconds,
            actualTemperature: safeNumber(measurement.Temperature),
            targetTemperature: safeNumber(measurement.TargetTemperature)
        });
    });
    // Keep the current temperature point at the last authoritative status time;
    // only the separate "now" marker is allowed to advance locally.
    if (measurements.length === 0 && brewingStatus) {
        const authoritativePointSeconds = Math.floor(Math.max(0, nowSeconds - (statusElapsed - authoritativeStatusElapsed)));
        pointsBySecond.set(authoritativePointSeconds, {elapsedSeconds: authoritativePointSeconds,
            actualTemperature: safeNumber(brewingStatus.temperature.current),
            targetTemperature: safeNumber(brewingStatus?.temperature.target)});
    }

    const finished = brewingStatus?.process.state === ProcessState.FINISHED;
    const endSeconds = Math.max(nowSeconds, lastObserved, normalized.at(-1)?.timelineSeconds ?? 0, steps.at(-1)?.endSeconds ?? 0, 60);
    const {axisEndSeconds, axisTicks} = buildStableTimeAxis(endSeconds);
    const progressPercent = finished ? 100 : Math.min(100, Math.max(0, nowSeconds * 100 / endSeconds));
    // normalized is chronological in both paths. Map preserves first insertion
    // order when the value for an already observed second is replaced.
    return {steps, points: Array.from(pointsBySecond.values()), nowSeconds, endSeconds, axisEndSeconds, axisTicks, progressPercent,
        clockOffsetSeconds: nowSeconds - statusElapsed, activeStepIndex: finished ? -1 : activeIndex,
        activeTimerDuration: brewingStatus?.currentStep.mode === ProcessMode.TIMER_RUNNING ? safeNumber(brewingStatus.currentStep.duration) : undefined};
};
