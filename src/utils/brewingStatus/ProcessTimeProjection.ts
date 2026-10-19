import {BrewingStatus, ProcessMode} from '../../model/brewingStatus.types';
import {getCurrentStepIdentity} from './selectors';
import {TimeAnchorState, monotonicNow, sameProcess} from './streams';
import {BrewingDisplayTime, createBrewingDisplayTimeAnchor, projectBrewingDisplayTime} from '../../containers/Production/utils/productionCountdown';

/** Display only. Never dispatches a command or completes a process step. */
export class ProcessTimeProjection {
  private sample?: {identity: string; at: number; elapsed: number; step: number; duration?: number;
    running: boolean; stepRunning: boolean; correction: number; stepCorrection: number};
  private legacy?: ReturnType<typeof createBrewingDisplayTimeAnchor>;
  private fallbackProcess?: {status: BrewingStatus; at: number; elapsed: number; running: boolean};

  synchronize(status?: BrewingStatus, anchor?: TimeAnchorState, now = monotonicNow()) {
    if (status?.timeline && this.fallbackProcess?.status !== status) {
      this.fallbackProcess = {status, at: now, elapsed: status.timeline.processElapsedSeconds, running: status.timeline.running};
    } else if (!status?.timeline) this.fallbackProcess = undefined;
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
    const processRunning = anchor.processRunning ?? status.timeline?.running ?? anchor.running;
    const elapsed = anchor.processElapsedSeconds !== undefined ? anchor.processElapsedSeconds + (processRunning ? age : 0)
      : this.fallbackElapsed(now) ?? anchor.elapsedTime + (processRunning ? age : 0);
    const step = anchor.stepElapsedTime + (anchor.stepRunning ? age : 0);
    const smooth = (difference: number) => Math.abs(difference) <= 2 ? difference : 0;
    this.sample = {identity, at: now, elapsed, step, duration: anchor.duration ?? undefined,
      running: processRunning, stepRunning: anchor.stepRunning,
      correction: this.sample?.identity === identity && previous ? smooth(previous.elapsed - elapsed) : 0,
      stepCorrection: this.sample?.identity === identity && previous ? smooth(previous.step - step) : 0};
  }

  private fallbackElapsed(now: number) {
    const s = this.fallbackProcess;
    return s ? s.elapsed + (s.running ? Math.max(0, (now - s.at) / 1000) : 0) : undefined;
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
    if (!value) {
      const legacy = projectBrewingDisplayTime(status, this.legacy, now);
      const elapsed = this.fallbackElapsed(now) ?? status?.timeline?.processElapsedSeconds;
      return elapsed === undefined ? legacy : {...legacy, processElapsedSeconds: Math.floor(elapsed)};
    }
    const duration = this.sample!.duration;
    const step = duration !== undefined && duration > 0 ? Math.min(duration, value.step) : value.step;
    return {processElapsedSeconds: Math.floor(value.elapsed), stepElapsedSeconds: Math.floor(step),
      remainingSeconds: duration !== undefined && duration > 0 && (this.sample!.stepRunning || status?.currentStep.mode === ProcessMode.TIMER_RUNNING)
        ? Math.max(0, Math.ceil(duration - step)) : undefined};
  }
}
