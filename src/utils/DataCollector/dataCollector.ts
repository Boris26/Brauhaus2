import { BrewingStatus } from '../../model/BrewingStatus';

interface BrewingStatusMeasurement {
  elapsedTime: number;
  currentTime: number;
  Temperature: number;
  TargetTemperature: number;
}

type BrewingStatusGrouped = {
  [name: string]: {
    [statusText: string]: BrewingStatusMeasurement[];
  };
};

class DataCollector {
  private brewingStatus: BrewingStatus | null = null;
  private groupedData: BrewingStatusGrouped = {};
  private lastStatusKey: { Name: string; StatusText: string } | null = null;
  private lastMeasurement: BrewingStatusMeasurement | null = null;

  setBrewingStatus(status: BrewingStatus) {
    const { Name, StatusText, elapsedTime, currentTime, Temperature, TargetTemperature } = status;

    const currentKey = { Name, StatusText };
    const currentMeasurement: BrewingStatusMeasurement = {
      elapsedTime,
      currentTime,
      Temperature,
      TargetTemperature,
    };

    const isStatusChanged =
        this.lastStatusKey &&
        (this.lastStatusKey.Name !== Name || this.lastStatusKey.StatusText !== StatusText);

    // Falls der Status sich geändert hat, füge die letzte Messung dem vorherigen Status hinzu
    if (isStatusChanged && this.lastStatusKey && this.lastMeasurement) {
      const { Name: prevName, StatusText: prevStatusText } = this.lastStatusKey;

      if (!this.groupedData[prevName]) {
        this.groupedData[prevName] = {};
      }

      if (!this.groupedData[prevName][prevStatusText]) {
        this.groupedData[prevName][prevStatusText] = [];
      }

      this.groupedData[prevName][prevStatusText].push(this.lastMeasurement);
      console.debug('[DataCollector] Statuswechsel: letzte Messung übernommen:', {
        prevName,
        prevStatusText,
        lastMeasurement: this.lastMeasurement
      });
    }

    // Initialisiere aktuelle Gruppe, falls nicht vorhanden
    if (!this.groupedData[Name]) {
      this.groupedData[Name] = {};
    }

    if (!this.groupedData[Name][StatusText]) {
      // Neue Gruppe → erste Messung direkt speichern
      this.groupedData[Name][StatusText] = [currentMeasurement];
      console.debug('[DataCollector] Neuer Status → erste Messung gespeichert:', {
        Name,
        StatusText,
        groupedLength: 1,
        measurement: currentMeasurement,
      });
    } else {
      const lastStored = this.groupedData[Name][StatusText].at(-1);

      if (lastStored?.Temperature !== Temperature) {
        this.groupedData[Name][StatusText].push(currentMeasurement);
        console.debug('[DataCollector] Temperaturänderung → neue Messung gespeichert:', {
          Name,
          StatusText,
          groupedLength: this.groupedData[Name][StatusText].length,
          measurement: currentMeasurement,
        });
      }
    }

    // Status & letzte Messung merken
    this.lastStatusKey = currentKey;
    this.lastMeasurement = currentMeasurement;
    this.brewingStatus = status;
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
