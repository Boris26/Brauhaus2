import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ProcessTimelineHistory, RecordedPhase, RecordedTemperature, TimelineClock} from '../model/ProcessTimeline';

export const clock = (overrides: Partial<TimelineClock> = {}): TimelineClock => ({schemaVersion: 1, timelineId: 'timeline-1',
    processElapsedSeconds: 600, running: true, startedAt: '2026-10-19T08:00:00Z', origin: 'PROCESS_START',
    phaseSequence: 1, phaseStartedAtSeconds: 0, historyCursor: 0, retentionVersion: 0, durable: true, ...overrides});

export const modernStatus = (overrides: Partial<BrewingStatus> = {}): BrewingStatus => ({elapsedTime: 0,
    snapshotMetadata: {schemaVersion: 1, controllerEpoch: 'epoch', processInstanceId: 'run', revision: 1, stateRevision: 1, telemetryRevision: 1},
    timeline: clock(), process: {state: ProcessState.ACTIVE},
    currentStep: {index: 1, stepId: null, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING, name: 'Rast 1', elapsedTime: 0, duration: 1200},
    temperature: {current: 64, target: 65}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {}, ...overrides});

export const phase = (overrides: Partial<RecordedPhase> = {}): RecordedPhase => ({sequence: 1, startSeconds: 0,
    endSeconds: null, stepIndex: 1, stepId: null, stepPhase: ProcessPhase.RAST, stepMode: ProcessMode.HEATING,
    stepName: 'Rast 1', targetTemperature: 65, ...overrides});

export const reading = (sequence: number, temperature: number | null = 60, seconds = sequence): RecordedTemperature => ({sequence,
    processElapsedSeconds: seconds, measuredAt: new Date(Date.parse('2026-10-19T08:00:00Z') + sequence * 1000).toISOString(),
    temperature, targetTemperature: 65, elapsedTime: seconds, phaseSequence: 1,
    stepIndex: 1, stepPhase: ProcessPhase.RAST, stepMode: ProcessMode.HEATING, stepName: 'Rast 1'});

export const history = (measurements: RecordedTemperature[] = [], overrides: Partial<ProcessTimelineHistory> = {}): ProcessTimelineHistory => ({
    controllerEpoch: 'epoch', processInstanceId: 'run', timeline: clock({historyCursor: measurements.at(-1)?.sequence ?? 0}),
    reset: true, nextSequence: measurements.at(-1)?.sequence ?? 0, measurements, phases: [phase()], ...overrides});
