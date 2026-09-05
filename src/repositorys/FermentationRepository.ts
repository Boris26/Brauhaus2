import {BaseRepository} from './BaseRepository';
import {CreateFermentationMeasurement, FermentationAction, FermentationActionDTO, FermentationDetails, FermentationDevice, FermentationMeasurement, mapFermentationAction, SensorMeasurement} from '../model/Fermentation';

export class FermentationRepository extends BaseRepository {
  static async getDetails(finishedBeerId: string): Promise<FermentationDetails> {
    const id = encodeURIComponent(finishedBeerId);
    const [actions, measurements, devices, sensorMeasurements] = await Promise.all([
      this.get<FermentationActionDTO[]>(`fermentation/beers/${id}/recipe-actions`),
      this.get<FermentationMeasurement[]>(`fermentation/beers/${id}/measurements`),
      this.getDevices(),
      this.getSensorMeasurements(finishedBeerId),
    ]);
    return {actions: actions.map(mapFermentationAction), measurements, devices, sensorMeasurements};
  }
  static getDevices(): Promise<FermentationDevice[]> { return this.get('fermentation/devices'); }
  static getSensorMeasurements(finishedBeerId: string): Promise<SensorMeasurement[]> {
    return this.get(`fermentation/sensor-measurements?finishedBeerId=${encodeURIComponent(finishedBeerId)}`);
  }
  static createMeasurement(value: CreateFermentationMeasurement): Promise<FermentationMeasurement> {
    const {finishedBeerId, ...measurement} = value;
    return this.post(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/measurements`, measurement);
  }
  static completeAction(finishedBeerId: string, actionId: string): Promise<FermentationAction> {
    return this.post(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/recipe-actions/${encodeURIComponent(actionId)}/complete`, {});
  }
  static skipAction(finishedBeerId: string, actionId: string): Promise<FermentationAction> {
    return this.post(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/recipe-actions/${encodeURIComponent(actionId)}/skip`, {});
  }
  static assignDevice(deviceId: string, finishedBeerId: string): Promise<FermentationDevice> {
    return this.put(`fermentation/devices/${encodeURIComponent(deviceId)}/assignment`, {finishedBeerId});
  }
}
