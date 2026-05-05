import { BrewingStatus } from '../../model/brewingStatus.types';
import { getStatusChangeKey } from '../brewingStatus/selectors';

interface BrewingStatusMeasurement {
  elapsedTime: number;
  currentTime: number;
  Temperature: number;
  TargetTemperature: number;
}

type BrewingStatusGrouped = {
  [statusKey: string]: BrewingStatusMeasurement[];
};

class DataCollector {
  private brewingStatus: BrewingStatus | null = null;
  private groupedData: BrewingStatusGrouped = {};
  private lastStatusKey: string | null = null;

  setBrewingStatus(aStatus: BrewingStatus) {
    const aStatusKey = getStatusChangeKey(aStatus);
    const aCurrentMeasurement: BrewingStatusMeasurement = {
      elapsedTime: aStatus.elapsedTime,
      currentTime: aStatus.currentTime,
      // Kompatibilitätsausgabe für bestehende Charts/Export.
      Temperature: Number(aStatus.temperature.current ?? 0),
      TargetTemperature: Number(aStatus.temperature.target ?? 0),
    };

    if (!this.groupedData[aStatusKey]) {
      this.groupedData[aStatusKey] = [];
    }

    const aLastStored = this.groupedData[aStatusKey].at(-1);
    if (!aLastStored || aLastStored.Temperature !== aCurrentMeasurement.Temperature) {
      this.groupedData[aStatusKey].push(aCurrentMeasurement);
    }

    this.lastStatusKey = aStatusKey;
    this.brewingStatus = aStatus;
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
