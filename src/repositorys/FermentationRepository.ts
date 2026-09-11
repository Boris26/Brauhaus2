import {BaseRepository} from './BaseRepository';
import {CreateFermentationMeasurement, FermentationAction, FermentationActionDTO, FermentationDetails, FermentationDevice, FermentationMeasurement, FermentationMeasurementDTO, mapFermentationAction, mapFermentationMeasurement, SensorMeasurement} from '../model/Fermentation';

export class FermentationRepository extends BaseRepository {
  static async getDetails(finishedBeerId: string): Promise<FermentationDetails> {
    const id = encodeURIComponent(finishedBeerId);
    const [actions, measurements, devices, sensorMeasurements] = await Promise.all([
      this.get<FermentationActionDTO[]>(`fermentation/beers/${id}/recipe-actions`),
      this.get<FermentationMeasurementDTO[]>(`fermentation/beers/${id}/measurements`),
      this.getDevices(),
      this.getSensorMeasurements(finishedBeerId),
    ]);
    return {actions: actions.map(mapFermentationAction), measurements: measurements.map(mapFermentationMeasurement), devices, sensorMeasurements};
  }
  static getDevices(): Promise<FermentationDevice[]> { return this.get('fermentation/devices'); }
  static getSensorMeasurements(finishedBeerId: string): Promise<SensorMeasurement[]> {
    return this.get(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/sensor-measurements`);
  }
  static createMeasurement(value: CreateFermentationMeasurement): Promise<FermentationMeasurement> {
    const {finishedBeerId, ...measurement} = value as any;
    const payload: Record<string, unknown> = {};
    if (measurement.measuredAt !== undefined) payload.measuredAt = measurement.measuredAt;
    if (measurement.plato !== undefined) payload.plato = measurement.plato;
    if (measurement.note !== undefined) payload.note = measurement.note;
    if (measurement.beerTemperatureC !== undefined) payload.beerTemperatureC = measurement.beerTemperatureC;
    if (measurement.ambientTemperatureC !== undefined) payload.ambientTemperatureC = measurement.ambientTemperatureC;

    return this.post(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/measurements`, payload);
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
