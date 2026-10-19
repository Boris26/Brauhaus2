import {ProcessMode, ProcessPhase} from './brewingStatus.types';
import type {TimelineMeasurement} from '../utils/DataCollector/dataCollector';

export interface RecordedTimelineExport {
    schemaVersion: 2;
    timeline: TimelineClock;
    phases: RecordedPhase[];
    measurements: TimelineMeasurement[];
}

export interface TimelineClock {
    schemaVersion: 1;
    timelineId: string;
    processElapsedSeconds: number;
    running: boolean;
    startedAt: string;
    origin: 'PROCESS_START' | 'RECOVERY';
    phaseSequence: number;
    phaseStartedAtSeconds: number;
    historyCursor: number;
    retentionVersion: number;
    durable: boolean;
}

export interface RecordedPhase {
    sequence: number;
    startSeconds: number;
    endSeconds: number | null;
    stepIndex?: number;
    stepId?: string | null;
    stepPhase: ProcessPhase;
    stepMode: ProcessMode;
    stepName?: string;
    targetTemperature: number | null;
}

export interface RecordedTemperature {
    sequence: number;
    processElapsedSeconds: number;
    measuredAt: string;
    temperature: number | null;
    targetTemperature: number | null;
    /** Original local status seconds, retained for legacy exports only. */
    elapsedTime: number;
    phaseSequence: number;
    stepIndex?: number;
    stepId?: string | null;
    stepPhase: ProcessPhase;
    stepMode: ProcessMode;
    stepName?: string;
}

export interface ProcessTimelineHistory {
    retainedRanges?: [number, number][];
    controllerEpoch: string;
    processInstanceId: string;
    timeline: TimelineClock;
    reset: boolean;
    nextSequence: number;
    measurements: RecordedTemperature[];
    phases: RecordedPhase[];
}

const seconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const sequence = (v: unknown): v is number => seconds(v) && Number.isSafeInteger(v);
const temperature = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
export const validTimelineClock = (v: any): v is TimelineClock => !!v && v.schemaVersion === 1
    && typeof v.timelineId === 'string' && v.timelineId.length > 0 && seconds(v.processElapsedSeconds)
    && typeof v.running === 'boolean' && typeof v.durable === 'boolean'
    && typeof v.startedAt === 'string' && Number.isFinite(Date.parse(v.startedAt))
    && ['PROCESS_START', 'RECOVERY'].includes(v.origin) && sequence(v.phaseSequence)
    && seconds(v.phaseStartedAtSeconds) && sequence(v.historyCursor) && sequence(v.retentionVersion);

export const parseProcessTimelineHistory = (v: any): ProcessTimelineHistory | undefined => {
    if (!v || !validTimelineClock(v.timeline) || typeof v.controllerEpoch !== 'string'
        || typeof v.processInstanceId !== 'string' || typeof v.reset !== 'boolean' || !sequence(v.nextSequence)
        || v.nextSequence !== v.timeline.historyCursor || !Array.isArray(v.measurements) || v.measurements.length > 5000
        || !Array.isArray(v.phases)) return undefined;
    if (v.retainedRanges !== undefined) {
        if (!Array.isArray(v.retainedRanges) || v.retainedRanges.length > 5000) return undefined;
        let end = 0;
        for (const range of v.retainedRanges) {
            if (!Array.isArray(range) || range.length !== 2 || !sequence(range[0]) || !sequence(range[1])
                || range[0] <= end || range[1] < range[0] || range[1] > v.nextSequence) return undefined;
            end = range[1];
        }
    }
    let previous = 0;
    let previousTime = -1;
    let rangeIndex = 0;
    for (const p of v.measurements) {
        if (!p || !sequence(p.sequence) || p.sequence <= previous || p.sequence > v.nextSequence
            || !seconds(p.processElapsedSeconds) || p.processElapsedSeconds < previousTime
            || !seconds(p.elapsedTime) || !sequence(p.phaseSequence)
            || typeof p.measuredAt !== 'string' || !Number.isFinite(Date.parse(p.measuredAt))
            || !temperature(p.temperature) || !temperature(p.targetTemperature)
            || !Object.values(ProcessPhase).includes(p.stepPhase) || !Object.values(ProcessMode).includes(p.stepMode)) return undefined;
        if (v.retainedRanges) {
            while (rangeIndex < v.retainedRanges.length && v.retainedRanges[rangeIndex][1] < p.sequence) rangeIndex++;
            if (rangeIndex >= v.retainedRanges.length || v.retainedRanges[rangeIndex][0] > p.sequence) return undefined;
        }
        previous = p.sequence;
        previousTime = p.processElapsedSeconds;
    }
    let lastEnd = 0;
    previous = 0;
    for (const p of v.phases) {
        if (!p || !sequence(p.sequence) || p.sequence <= previous || !seconds(p.startSeconds) || p.startSeconds < lastEnd
            || (p.endSeconds !== null && (!seconds(p.endSeconds) || p.endSeconds < p.startSeconds))
            || !Object.values(ProcessPhase).includes(p.stepPhase) || !Object.values(ProcessMode).includes(p.stepMode)
            || !temperature(p.targetTemperature)) return undefined;
        previous = p.sequence;
        lastEnd = p.endSeconds ?? p.startSeconds;
    }
    return v;
};

/** Versioned archives never pass through the old local-time accumulation. */
export const parseRecordedTimelineExport = (v: any): RecordedTimelineExport | undefined => {
    if (!v || v.schemaVersion !== 2 || !Array.isArray(v.measurements) || v.measurements.some((p: unknown) => !p || typeof p !== 'object')) return undefined;
    const validated = parseProcessTimelineHistory({controllerEpoch: 'archive', processInstanceId: 'archive',
        timeline: v.timeline, reset: true, nextSequence: v.timeline?.historyCursor, phases: v.phases,
        measurements: v.measurements.map((p: TimelineMeasurement) => ({...p, sequence: p.measurementSequence,
            temperature: p.Temperature, targetTemperature: p.TargetTemperature}))});
    return validated ? v : undefined;
};
