import {BrewingStatus} from '../../model/brewingStatus.types';
import {ControllerTimeAnchor, SnapshotMetadata} from './snapshot';

export interface TelemetryState {
  controllerEpoch: string;
  processInstanceId: string;
  stateRevision: number;
  telemetryRevision: number;
  temperature: BrewingStatus['temperature'];
  elapsedTime: number;
}
export interface TimeAnchorState extends ControllerTimeAnchor {
  controllerEpoch: string;
  processInstanceId: string;
  stateRevision: number;
  receivedAtMs: number;
}
export const monotonicNow = () => performance.now();
export const revisionValid = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export const sameProcess = (left?: Pick<SnapshotMetadata, 'controllerEpoch' | 'processInstanceId'>,
                           right?: Pick<SnapshotMetadata, 'controllerEpoch' | 'processInstanceId'>) =>
  !!left && !!right && left.controllerEpoch === right.controllerEpoch && left.processInstanceId === right.processInstanceId;

export const acceptTelemetry = (metadata: SnapshotMetadata, temperature: BrewingStatus['temperature'], elapsedTime: number,
                                previous?: TelemetryState): TelemetryState | undefined => {
  if (!revisionValid(metadata.telemetryRevision) || !temperature
    || ![temperature.current, temperature.target].every(v => v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v)))
    || !Number.isFinite(elapsedTime) || elapsedTime < 0) return previous;
  if (sameProcess(previous, metadata) && previous!.telemetryRevision >= metadata.telemetryRevision!) return previous;
  return {controllerEpoch: metadata.controllerEpoch, processInstanceId: metadata.processInstanceId,
    stateRevision: metadata.stateRevision, telemetryRevision: metadata.telemetryRevision!, temperature, elapsedTime};
};

export const acceptTimeAnchor = (metadata: SnapshotMetadata, previous?: TimeAnchorState, status?: BrewingStatus): TimeAnchorState | undefined => {
  const anchor = metadata.timeAnchor;
  if (!anchor || !revisionValid(anchor.sequence) || anchor.sequence !== metadata.timeAnchorSequence
    || ![anchor.elapsedTime, anchor.stepElapsedTime, anchor.sampleAgeSeconds].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)
    || ![anchor.duration, anchor.remainingTime].every(v => v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0))
    || typeof anchor.running !== 'boolean' || typeof anchor.stepRunning !== 'boolean') return previous;
  if (status && (anchor.phase !== status.currentStep.phase || anchor.mode !== status.currentStep.mode
    || anchor.stepIndex !== status.currentStep.index || (anchor.stepId ?? null) !== (status.currentStep.stepId ?? null)
    || (anchor.duration ?? null) !== (status.currentStep.duration ?? null))) return previous;
  if (sameProcess(previous, metadata) && previous!.sequence >= anchor.sequence) return previous;
  return {...anchor, controllerEpoch: metadata.controllerEpoch, processInstanceId: metadata.processInstanceId,
    stateRevision: metadata.stateRevision, receivedAtMs: monotonicNow()};
};
