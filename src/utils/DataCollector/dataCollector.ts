import { BrewingStatus } from '../../model/brewingStatus.types';
import { getStatusChangeKey } from '../brewingStatus/selectors';

export interface TimelineMeasurement {
  elapsedTime: number;
  currentTime: number;
  Temperature: number;
  TargetTemperature: number;
}

type BrewingStatusGrouped = {
  [statusKey: string]: TimelineMeasurement[];
};

export const MAX_MEASUREMENTS_PER_STATUS_GROUP = 1000;

class DataCollector {
  private brewingStatus: BrewingStatus | null = null;
  private groupedData: BrewingStatusGrouped = {};
  private lastStatusKey: string | null = null;

  setBrewingStatus(aStatus: BrewingStatus): void {
    const aStatusKey = getStatusChangeKey(aStatus);
    const aCurrentMeasurement: TimelineMeasurement = {
      elapsedTime: aStatus.elapsedTime,
      currentTime: aStatus.currentTime,
      // Compatibility output for existing charts and exports.
      Temperature: Number(aStatus.temperature.current ?? 0),
      TargetTemperature: Number(aStatus.temperature.target ?? 0),
    };

    if (!this.groupedData[aStatusKey]) {
      this.groupedData[aStatusKey] = [];
    }

    const aLastStored = this.groupedData[aStatusKey].at(-1);
    if (!aLastStored || aLastStored.Temperature !== aCurrentMeasurement.Temperature || aLastStored.TargetTemperature !== aCurrentMeasurement.TargetTemperature || aLastStored.elapsedTime !== aCurrentMeasurement.elapsedTime) {
      this.groupedData[aStatusKey].push(aCurrentMeasurement);
      this.trimStatusGroup(aStatusKey);
    }

    this.lastStatusKey = aStatusKey;
    this.brewingStatus = aStatus;
  }

  reset(): void {
    this.brewingStatus = null;
    this.groupedData = {};
    this.lastStatusKey = null;
  }

  getMeasurementCount(): number {
    return Object.values(this.groupedData).reduce((aTotal, aMeasurements) => aTotal + aMeasurements.length, 0);
  }

  private trimStatusGroup(aStatusKey: string): void {
    const aStatusGroup = this.groupedData[aStatusKey];
    if (aStatusGroup.length > MAX_MEASUREMENTS_PER_STATUS_GROUP) {
      aStatusGroup.splice(0, aStatusGroup.length - MAX_MEASUREMENTS_PER_STATUS_GROUP);
    }
  }

  getTimelineMeasurements(): TimelineMeasurement[] {
    return Object.values(this.groupedData).flat().map((measurement) => ({ ...measurement }));
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
