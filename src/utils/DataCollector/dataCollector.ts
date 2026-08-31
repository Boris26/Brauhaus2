import { BrewingStatus, ProcessMode, ProcessPhase } from '../../model/brewingStatus.types';
import { getStatusChangeKey } from '../brewingStatus/selectors';

export interface TimelineMeasurement {
  elapsedTime: number;
  Temperature: number;
  TargetTemperature: number;
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
}

type BrewingStatusGrouped = {
  [statusKey: string]: TimelineMeasurement[];
};

export const MAX_MEASUREMENTS_PER_STATUS_GROUP = 1000;
export const MAX_TOTAL_MEASUREMENTS = 5000;

class DataCollector {
  private brewingStatus: BrewingStatus | null = null;
  private groupedData: BrewingStatusGrouped = {};
  private lastStatusKey: string | null = null;
  private collectionSequence = 0;
  private timelineMeasurements: TimelineMeasurement[] = [];
  private timelineVersion = 0;
  private cachedTimelineSnapshot: TimelineSnapshot | null = null;

  setBrewingStatus(aStatus: BrewingStatus): void {
    const aStatusKey = getStatusChangeKey(aStatus);
    const aCurrentMeasurement: TimelineMeasurement = Object.freeze({
      elapsedTime: aStatus.elapsedTime,
      // Compatibility output for existing charts and exports.
      Temperature: Number(aStatus.temperature.current ?? 0),
      TargetTemperature: Number(aStatus.temperature.target ?? 0),
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
    if (!aLastStored || aLastStored.Temperature !== aCurrentMeasurement.Temperature || aLastStored.TargetTemperature !== aCurrentMeasurement.TargetTemperature || aLastStored.elapsedTime !== aCurrentMeasurement.elapsedTime) {
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
    const timelineChanged = this.timelineMeasurements.length > 0;
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
      });
    }
    return this.cachedTimelineSnapshot;
  }

  getTimelineMeasurements(): readonly TimelineMeasurement[] {
    return this.getTimelineSnapshot().measurements;
  }

  getAllDataAsBlob(): Blob {
    const data = { groupedData: this.groupedData };
    const json = JSON.stringify(data);
    return new Blob([json], { type: 'application/json' });
  }

  getAllDataAsJSONString(): string {
    return JSON.stringify({ groupedData: this.groupedData }, null, 2);
  }
}

export const dataCollector = new DataCollector();
