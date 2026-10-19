import { BrewingStatus, ProcessMode, ProcessPhase } from '../../model/brewingStatus.types';
import { getStatusChangeKey } from '../brewingStatus/selectors';
import {ProcessTimelineHistory, RecordedPhase, TimelineClock} from '../../model/ProcessTimeline';

export interface TimelineMeasurement {
  measurementSequence?: number;
  processElapsedSeconds?: number;
  measuredAt?: string;
  phaseSequence?: number;
  elapsedTime: number;
  Temperature: number | null;
  TargetTemperature: number | null;
  stepIndex?: number;
  stepPhase?: ProcessPhase;
  stepMode?: ProcessMode;
  stepName?: string;
  collectionSequence?: number;
}

export interface TimelineSnapshot {
  readonly version: number;
  /** Measurements are ordered ascending by collectionSequence and are immutable after collection. */
  readonly measurements: readonly TimelineMeasurement[];
  readonly phases: readonly RecordedPhase[];
  readonly timeline?: TimelineClock;
}

type BrewingStatusGrouped = {
  [statusKey: string]: TimelineMeasurement[];
};

export const MAX_MEASUREMENTS_PER_STATUS_GROUP = 1000;
export const MAX_TOTAL_MEASUREMENTS = 5000;

class DataCollector {
  private timelineClock?: TimelineClock;
  private phases: readonly RecordedPhase[] = Object.freeze([]);
  private serverCursor = 0;
  private brewingStatus: BrewingStatus | null = null;
  private groupedData: BrewingStatusGrouped = {};
  private lastStatusKey: string | null = null;
  private collectionSequence = 0;
  private timelineMeasurements: TimelineMeasurement[] = [];
  private timelineVersion = 0;
  private cachedTimelineSnapshot: TimelineSnapshot | null = null;

  setBrewingStatus(aStatus: BrewingStatus): void {
    // A modern status update is not a physical sensor acquisition.
    if (aStatus.timeline) {
      this.beginTimeline(aStatus.timeline);
      return;
    }
    if (this.timelineClock) {
      // A restarted controller's initial IDLE snapshot is not a measurement
      // belonging to the retained brew. Preserve it for explicit recovery.
      if (aStatus.process.state === 'IDLE') return;
      this.reset(); // Explicit legacy controller/process, never mix coordinate systems.
    }
    const aStatusKey = getStatusChangeKey(aStatus);
    const aCurrentMeasurement: TimelineMeasurement = Object.freeze({
      elapsedTime: aStatus.elapsedTime,
      // Compatibility output for existing charts and exports.
      Temperature: typeof aStatus.temperature.current === 'number' && Number.isFinite(aStatus.temperature.current) ? aStatus.temperature.current : null,
      TargetTemperature: typeof aStatus.temperature.target === 'number' && Number.isFinite(aStatus.temperature.target) ? aStatus.temperature.target : null,
      stepIndex: aStatus.currentStep.index,
      stepPhase: aStatus.currentStep.phase,
      stepMode: aStatus.currentStep.mode,
      stepName: aStatus.currentStep.name,
      collectionSequence: this.collectionSequence,
    });

    if (!this.groupedData[aStatusKey]) {
      this.groupedData[aStatusKey] = [];
    }

    const aLastStored = this.groupedData[aStatusKey].at(-1);
    if (!aLastStored || this.lastStatusKey !== aStatusKey || aLastStored.Temperature !== aCurrentMeasurement.Temperature || aLastStored.TargetTemperature !== aCurrentMeasurement.TargetTemperature) {
      this.groupedData[aStatusKey].push(aCurrentMeasurement);
      this.timelineMeasurements.push(aCurrentMeasurement);
      this.collectionSequence += 1;
      this.trimStatusGroup(aStatusKey);
      this.trimGlobalMeasurements();
      this.timelineVersion += 1;
      this.cachedTimelineSnapshot = null;
    }

    this.lastStatusKey = aStatusKey;
    this.brewingStatus = aStatus;
  }

  reset(): void {
    const timelineChanged = this.timelineMeasurements.length > 0 || this.phases.length > 0 || !!this.timelineClock;
    this.timelineClock = undefined;
    this.phases = Object.freeze([]);
    this.serverCursor = 0;
    this.brewingStatus = null;
    this.groupedData = {};
    this.lastStatusKey = null;
    this.collectionSequence = 0;
    this.timelineMeasurements = [];
    if (timelineChanged) {
      this.timelineVersion += 1;
      this.cachedTimelineSnapshot = null;
    }
  }

  getMeasurementCount(): number {
    return Object.values(this.groupedData).reduce((aTotal, aMeasurements) => aTotal + aMeasurements.length, 0);
  }

  beginTimeline(clock: TimelineClock): void {
    if (this.timelineClock?.timelineId === clock.timelineId) return;
    this.reset();
    this.timelineClock = Object.freeze({...clock});
    this.timelineVersion += 1;
    this.cachedTimelineSnapshot = null;
  }

  getHistoryCursor(): {afterSequence: number; retentionVersion?: number} {
    return {afterSequence: this.serverCursor, retentionVersion: this.timelineClock?.retentionVersion};
  }

  applyTimelineHistory(history: ProcessTimelineHistory): boolean {
    if (this.timelineClock && history.timeline.timelineId !== this.timelineClock.timelineId) return false;
    if (history.nextSequence < this.serverCursor || (this.timelineClock
      && history.timeline.retentionVersion < this.timelineClock.retentionVersion)) return false;
    this.beginTimeline(history.timeline);
    const previousMeasurements = this.timelineMeasurements;
    let rangeIndex = 0;
    const retained = history.reset ? [] : previousMeasurements.filter(p => {
      if (!history.retainedRanges) return true;
      const seq = p.measurementSequence!;
      while (rangeIndex < history.retainedRanges.length && history.retainedRanges[rangeIndex][1] < seq) rangeIndex++;
      return rangeIndex < history.retainedRanges.length && history.retainedRanges[rangeIndex][0] <= seq;
    });
    const known = new Set(retained.map(p => p.measurementSequence));
    const previousById = new Map(previousMeasurements.map(p => [p.measurementSequence, p]));
    const added = history.measurements.filter(p => !known.has(p.sequence)).map(p => previousById.get(p.sequence) ?? Object.freeze({
      elapsedTime: p.elapsedTime, processElapsedSeconds: p.processElapsedSeconds, measurementSequence: p.sequence,
      measuredAt: p.measuredAt, Temperature: p.temperature, TargetTemperature: p.targetTemperature,
      stepIndex: p.stepIndex, stepPhase: p.stepPhase, stepMode: p.stepMode, stepName: p.stepName,
      phaseSequence: p.phaseSequence, collectionSequence: p.sequence,
    }));
    const measurements = retained.concat(added).sort((a, b) => a.measurementSequence! - b.measurementSequence!).slice(-MAX_TOTAL_MEASUREMENTS);
    const changed = measurements.length !== previousMeasurements.length
      || measurements.some((p, index) => p.measurementSequence !== previousMeasurements[index]?.measurementSequence)
      || JSON.stringify(this.phases) !== JSON.stringify(history.phases)
      || this.timelineClock?.durable !== history.timeline.durable;
    this.serverCursor = history.nextSequence;
    this.timelineClock = Object.freeze({...history.timeline});
    if (!changed) return false;
    this.timelineMeasurements = measurements;
    this.phases = Object.freeze(history.phases.map(p => Object.freeze({...p})));
    this.groupedData = {};
    for (const p of measurements) {
      const key = `ACTIVE|${p.stepIndex}|${p.stepPhase}|${p.stepMode}|${p.stepName ?? ''}|NONE`;
      (this.groupedData[key] ??= []).push(p);
    }
    this.timelineVersion += 1;
    this.cachedTimelineSnapshot = null;
    return true;
  }

  private trimStatusGroup(aStatusKey: string): void {
    const aStatusGroup = this.groupedData[aStatusKey];
    if (aStatusGroup.length > MAX_MEASUREMENTS_PER_STATUS_GROUP) {
      // Keep the first sample as the stable process-boundary anchor while
      // trimming old temperature detail behind it.
      const removedMeasurements = new Set(aStatusGroup.splice(1, aStatusGroup.length - MAX_MEASUREMENTS_PER_STATUS_GROUP));
      this.timelineMeasurements = this.timelineMeasurements.filter(measurement => !removedMeasurements.has(measurement));
    }
  }

  private trimGlobalMeasurements(): void {
    while (this.timelineMeasurements.length > MAX_TOTAL_MEASUREMENTS) {
      // Prefer dropping the oldest detail point while retaining the first
      // process-boundary sample of every status group for export readability.
      const removableDetails = new Set(
        Object.values(this.groupedData).flatMap((group) => group.length > 1 ? group.slice(1) : [])
      );
      let removalIndex = this.timelineMeasurements.findIndex((measurement) => removableDetails.has(measurement));
      if (removalIndex < 0) removalIndex = 0;

      const [removed] = this.timelineMeasurements.splice(removalIndex, 1);
      for (const [statusKey, group] of Object.entries(this.groupedData)) {
        const groupIndex = group.indexOf(removed);
        if (groupIndex < 0) continue;
        group.splice(groupIndex, 1);
        if (group.length === 0) delete this.groupedData[statusKey];
        break;
      }
    }
  }

  getTimelineSnapshot(): TimelineSnapshot {
    if (this.cachedTimelineSnapshot === null) {
      this.cachedTimelineSnapshot = Object.freeze({
        version: this.timelineVersion,
        measurements: Object.freeze(this.timelineMeasurements.slice()),
        phases: this.phases,
        timeline: this.timelineClock,
      });
    }
    return this.cachedTimelineSnapshot;
  }

  getTimelineMeasurements(): readonly TimelineMeasurement[] {
    return this.getTimelineSnapshot().measurements;
  }

  getAllDataAsBlob(): Blob {
    const json = this.getAllDataAsJSONString();
    return new Blob([json], { type: 'application/json' });
  }

  getAllDataAsJSONString(): string {
    return JSON.stringify({ groupedData: this.groupedData, ...(this.timelineClock ? {
      schemaVersion: 2, timeline: this.timelineClock, phases: this.phases, measurements: this.timelineMeasurements,
    } : {}) }, null, 2);
  }
}

export const dataCollector = new DataCollector();
