import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState} from '../../model/brewingStatus.types';
import {normalizeBrewingStatus} from './normalizeBrewingStatus';
import {validTimelineClock} from '../../model/ProcessTimeline';

export interface SnapshotMetadata {
  schemaVersion: 1;
  controllerEpoch: string;
  processInstanceId: string;
  revision: number;
  stateRevision: number;
  telemetryRevision?: number;
  timeAnchorSequence?: number;
  timeAnchor?: ControllerTimeAnchor;
}
export interface ControllerTimeAnchor {
  timelineId?: string;
  processElapsedSeconds?: number;
  processRunning?: boolean;
  sequence: number;
  stepId?: string | null;
  stepIndex?: number;
  phase: string;
  mode: string;
  elapsedTime: number;
  stepElapsedTime: number;
  remainingTime?: number | null;
  duration?: number | null;
  running: boolean;
  stepRunning: boolean;
  sampleAgeSeconds: number;
}
export type StatusSource = 'http' | 'socket' | 'sync' | 'telemetry';
export type CommunicationPhase = 'Connected' | 'Disconnected' | 'Reconnecting' | 'Synchronizing' | 'Synchronized';
export type ConfirmationPhase = 'CommandPending' | 'CommandAccepted' | 'AwaitingStateTransition' | 'Completed' | 'Failed';
export const PROCESS_REALTIME_ENABLED = process.env.REACT_APP_PROCESS_REALTIME !== 'false';

const object = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: any) => typeof value === 'number' && Number.isFinite(value);
const optionalNumber = (value: any) => value === undefined || value === null || finite(value);
export const validMetadata = (value: any): value is SnapshotMetadata & Record<string, any> => object(value)
  && value.schemaVersion === 1
  && typeof value.controllerEpoch === 'string' && value.controllerEpoch.length > 0
  && typeof value.processInstanceId === 'string' && value.processInstanceId.length > 0
  && Number.isSafeInteger(value.revision) && value.revision >= 0
  && Number.isSafeInteger(value.stateRevision) && value.stateRevision >= 0 && value.stateRevision <= value.revision
  && (value.telemetryRevision === undefined || (Number.isSafeInteger(value.telemetryRevision) && value.telemetryRevision >= 0))
  && (value.timeAnchorSequence === undefined || (Number.isSafeInteger(value.timeAnchorSequence) && value.timeAnchorSequence >= 0));

export const validStatus = (value: any): boolean => object(value)
  && (value.timeline === undefined || validTimelineClock(value.timeline))
  && finite(value.elapsedTime) && value.elapsedTime >= 0
  && object(value.process) && Object.values(ProcessState).includes(value.process.state)
  && object(value.currentStep) && Object.values(ProcessPhase).includes(value.currentStep.phase)
  && Object.values(ProcessMode).includes(value.currentStep.mode)
  && ['index', 'count', 'duration', 'elapsedTime', 'remainingTime'].every(key => optionalNumber(value.currentStep[key]))
  && object(value.temperature) && optionalNumber(value.temperature.current) && optionalNumber(value.temperature.target)
  && object(value.waiting) && typeof value.waiting.waitingFor === 'string' && typeof value.waiting.canConfirm === 'boolean'
  && object(value.error);

export const parseSnapshot = (value: unknown): BrewingStatus | undefined => {
  if (!validMetadata(value) || !validStatus((value as any).status)) return undefined;
  const {schemaVersion, controllerEpoch, processInstanceId, revision, stateRevision} = value;
  return {...normalizeBrewingStatus((value as any).status),
    snapshotMetadata: {schemaVersion, controllerEpoch, processInstanceId, revision, stateRevision,
      ...((value as any).telemetryRevision !== undefined ? {telemetryRevision: (value as any).telemetryRevision} : {}),
      ...((value as any).timeAnchorSequence !== undefined ? {timeAnchorSequence: (value as any).timeAnchorSequence} : {}),
      ...((value as any).timeAnchor ? {timeAnchor: (value as any).timeAnchor} : {})}};
};

export const statusFromResponse = (response: {data: unknown; headers?: any}): BrewingStatus => {
  const headers = response.headers ?? {};
  const epoch = headers['x-controller-epoch'];
  const anyMetadata = ['x-controller-epoch', 'x-process-instance', 'x-status-revision', 'x-state-revision'].some(key => headers[key] !== undefined);
  if (!anyMetadata) return normalizeBrewingStatus(response.data); // Explicit older-controller compatibility.
  const result = parseSnapshot({schemaVersion: 1, controllerEpoch: epoch,
    processInstanceId: headers['x-process-instance'],
    revision: /^\d+$/.test(headers['x-status-revision']) ? Number(headers['x-status-revision']) : NaN,
    stateRevision: /^\d+$/.test(headers['x-state-revision']) ? Number(headers['x-state-revision']) : NaN,
    ...(headers['x-telemetry-revision'] !== undefined ? {telemetryRevision: Number(headers['x-telemetry-revision'])} : {}),
    ...(headers['x-time-anchor-sequence'] !== undefined ? {timeAnchorSequence: Number(headers['x-time-anchor-sequence'])} : {}),
    ...(headers['x-time-anchor'] ? {timeAnchor: JSON.parse(headers['x-time-anchor'])} : {}),
    status: response.data});
  if (!result) throw new Error('Ungültiger versionierter Controllerstatus');
  return result;
};

export const mergeTelemetry = (value: any, current?: BrewingStatus): BrewingStatus | undefined => {
  const metadata = current?.snapshotMetadata;
  if (!current || !metadata || !validMetadata(value)
    || value.controllerEpoch !== metadata.controllerEpoch || value.processInstanceId !== metadata.processInstanceId
    || value.stateRevision !== metadata.stateRevision || value.revision <= metadata.revision
    || !finite(value.elapsedTime) || !object(value.temperature) || !object(value.timing)
    || !optionalNumber(value.temperature.current) || !optionalNumber(value.temperature.target)
    || !optionalNumber(value.timing.elapsedTime) || !optionalNumber(value.timing.remainingTime)
    || value.temperature.target !== current.temperature.target) return undefined;
  return {...current, elapsedTime: value.elapsedTime, temperature: {current: value.temperature.current, target: value.temperature.target},
    currentStep: {...current.currentStep, elapsedTime: value.timing.elapsedTime, remainingTime: value.timing.remainingTime},
    snapshotMetadata: {...metadata, revision: value.revision}};
};
