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

    // Prüfe auf Statuswechsel
    const hasChanged =
        this.lastStatusKey &&
        (this.lastStatusKey.Name !== Name || this.lastStatusKey.StatusText !== StatusText);

    // Wenn sich der Status geändert hat → letzten Messpunkt dem alten Status hinzufügen
    if (hasChanged && this.lastMeasurement) {
      const { Name: prevName, StatusText: prevStatusText } = this.lastStatusKey!;
      if (!this.groupedData[prevName]) {
        this.groupedData[prevName] = {};
      }
      if (!this.groupedData[prevName][prevStatusText]) {
        this.groupedData[prevName][prevStatusText] = [];
      }
      this.groupedData[prevName][prevStatusText].push(this.lastMeasurement);
      console.debug('[DataCollector] Statuswechsel: letzter Messpunkt gespeichert:', {
        prevName,
        prevStatusText,
        lastMeasurement: this.lastMeasurement
      });
    }

    // Status aktualisieren
    this.lastStatusKey = { Name, StatusText };
    this.lastMeasurement = { elapsedTime, currentTime, Temperature, TargetTemperature };

    // Daten speichern
    if (!this.groupedData[Name]) {
      this.groupedData[Name] = {};
    }

    if (!this.groupedData[Name][StatusText]) {
      // Neuer Status → erste Messung speichern
      this.groupedData[Name][StatusText] = [this.lastMeasurement];
      console.debug('[DataCollector] setBrewingStatus (neu):', {
        Name,
        StatusText,
        groupedLength: 1,
        lastMeasurement: this.lastMeasurement
      });
    } else {
      // Temperatur hat sich geändert → speichern
      const last = this.groupedData[Name][StatusText].at(-1);
      if (last?.Temperature !== Temperature) {
        this.groupedData[Name][StatusText].push(this.lastMeasurement);
        console.debug('[DataCollector] setBrewingStatus (Temp geändert):', {
          Name,
          StatusText,
          groupedLength: this.groupedData[Name][StatusText].length,
          lastMeasurement: this.lastMeasurement
        });
      }
    }

    this.brewingStatus = status;
  }

  getAllDataAsBlob(): Blob {
    const data = { groupedData: this.groupedData };
    const json = JSON.stringify(data);
    return new Blob([json], { type: 'application/json' });
  }

  getAllDataAsJSONString(): string {
    return JSON.stringify({ groupedData: this.groupedData });
  }
}

export const dataCollector = new DataCollector();
