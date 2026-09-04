import {BaseRepository} from './BaseRepository';
import {CreateFermentationMeasurement, FermentationAction, FermentationDetails, FermentationDevice, FermentationMeasurement, SensorMeasurement} from '../model/Fermentation';

export class FermentationRepository extends BaseRepository {
  static getDetails(finishedBeerId: string): Promise<FermentationDetails> {
    return this.get(`fermentation/finishedbeers/${encodeURIComponent(finishedBeerId)}`);
  }
  static getDevices(): Promise<FermentationDevice[]> { return this.get('fermentation/devices'); }
  static getSensorMeasurements(finishedBeerId: string): Promise<SensorMeasurement[]> {
    return this.get(`fermentation/sensor-measurements?finishedBeerId=${encodeURIComponent(finishedBeerId)}`);
  }
  static createMeasurement(value: CreateFermentationMeasurement): Promise<FermentationMeasurement> {
    return this.post('fermentation/measurements', value);
  }
  static completeAction(id: string): Promise<FermentationAction> {
    return this.post(`fermentation/actions/${encodeURIComponent(id)}/complete`, {});
  }
  static assignDevice(deviceId: string, finishedBeerId: string): Promise<FermentationDevice> {
    return this.put(`fermentation/devices/${encodeURIComponent(deviceId)}/assignment`, {finishedBeerId});
  }
}
