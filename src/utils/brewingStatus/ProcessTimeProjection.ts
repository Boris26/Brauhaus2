import {BrewingStatus} from '../../model/brewingStatus.types';
import {getCurrentStepIdentity} from './selectors';
import {TimeAnchorState, monotonicNow, sameProcess} from './streams';
import {BrewingDisplayTime, createBrewingDisplayTimeAnchor, projectBrewingDisplayTime} from '../../containers/Production/utils/productionCountdown';

/** Display only. Never dispatches a command or completes a process step. */
export class ProcessTimeProjection {
  private sample?: {identity: string; at: number; elapsed: number; step: number; duration?: number;
    running: boolean; stepRunning: boolean; correction: number; stepCorrection: number};
  private legacy?: ReturnType<typeof createBrewingDisplayTimeAnchor>;

  synchronize(status?: BrewingStatus, anchor?: TimeAnchorState, now = monotonicNow()) {
    if (!status || !anchor || !sameProcess(status.snapshotMetadata, anchor)
      || anchor.stateRevision !== status.snapshotMetadata?.stateRevision
      || anchor.phase !== status.currentStep.phase || anchor.mode !== status.currentStep.mode
      || anchor.stepIndex !== status.currentStep.index || (anchor.stepId ?? null) !== (status.currentStep.stepId ?? null)) {
      this.sample = undefined;
      this.legacy = createBrewingDisplayTimeAnchor(status, now);
      return;
    }
    const identity = `${anchor.controllerEpoch}/${anchor.processInstanceId}/${anchor.stepId ?? anchor.stepIndex}/${getCurrentStepIdentity(status)}/${anchor.duration}/${anchor.running}/${anchor.stepRunning}`;
    const previous = this.raw(now);
    const age = Math.max(0, (now - anchor.receivedAtMs) / 1000) + anchor.sampleAgeSeconds;
    const elapsed = anchor.elapsedTime + (anchor.running ? age : 0);
    const step = anchor.stepElapsedTime + (anchor.stepRunning ? age : 0);
    const smooth = (difference: number) => Math.abs(difference) <= 2 ? difference : 0;
    this.sample = {identity, at: now, elapsed, step, duration: anchor.duration ?? undefined,
      running: anchor.running, stepRunning: anchor.stepRunning,
      correction: this.sample?.identity === identity && previous ? smooth(previous.elapsed - elapsed) : 0,
      stepCorrection: this.sample?.identity === identity && previous ? smooth(previous.step - step) : 0};
  }

  private raw(now: number) {
    const s = this.sample;
    if (!s) return undefined;
    const delta = Math.max(0, (now - s.at) / 1000);
    const correction = (offset: number) => Math.abs(offset) < 0.25 ? offset : offset * Math.max(0, 1 - delta / 10);
    return {elapsed: Math.max(0, s.elapsed + (s.running ? delta : 0) + correction(s.correction)),
      step: Math.max(0, s.step + (s.stepRunning ? delta : 0) + correction(s.stepCorrection))};
  }

  project(status?: BrewingStatus, now = monotonicNow()): BrewingDisplayTime {
    const value = this.raw(now);
    if (!value) return projectBrewingDisplayTime(status, this.legacy, now);
    const duration = this.sample!.duration;
    const step = duration !== undefined && duration > 0 ? Math.min(duration, value.step) : value.step;
    return {processElapsedSeconds: Math.floor(value.elapsed), stepElapsedSeconds: Math.floor(step),
      remainingSeconds: duration !== undefined && duration > 0 && this.sample!.stepRunning
        ? Math.max(0, Math.ceil(duration - step)) : undefined};
  }
}
