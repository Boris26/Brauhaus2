import {BaseRepository} from './BaseRepository';
import {BubbleActivity, BubbleActivityDTO, CreateFermentationMeasurement, FermentationAction, FermentationActionDTO, FermentationDetails, FermentationDevice, FermentationDeviceDTO, FermentationMeasurement, FermentationMeasurementDTO, mapBubbleActivity, mapFermentationAction, mapFermentationDevice, mapFermentationMeasurement, SensorMeasurement} from '../model/Fermentation';

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
  static async getDevices(): Promise<FermentationDevice[]> {
    const devices = await this.get<FermentationDeviceDTO[]>('fermentation/devices');
    return devices.map(mapFermentationDevice);
  }
  static getSensorMeasurements(finishedBeerId: string): Promise<SensorMeasurement[]> {
    return this.get(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/sensor-measurements`);
  }
  static async getBubbleActivity(finishedBeerId: string, from?: string, to?: string): Promise<BubbleActivity[]> {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const suffix = query.toString();
    const activity = await this.get<BubbleActivityDTO[]>(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/bubble-activity${suffix ? `?${suffix}` : ''}`);
    return activity.map(mapBubbleActivity);
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
  static async completeAction(finishedBeerId: string, actionId: string): Promise<FermentationAction> {
    const action = await this.post<FermentationActionDTO>(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/recipe-actions/${encodeURIComponent(actionId)}/complete`, {});
    return mapFermentationAction(action);
  }
  static skipAction(finishedBeerId: string, actionId: string): Promise<FermentationAction> {
    return this.post(`fermentation/beers/${encodeURIComponent(finishedBeerId)}/recipe-actions/${encodeURIComponent(actionId)}/skip`, {});
  }
  static async assignDevice(deviceUid: string, finishedBeerId: string): Promise<FermentationDevice> {
    const device = await this.post<FermentationDeviceDTO>(`fermentation/devices/${encodeURIComponent(deviceUid)}/assignment`, {beerId: finishedBeerId});
    return mapFermentationDevice(device);
  }
  static async updateDeviceDisplayName(deviceUid: string, displayName: string | null): Promise<FermentationDevice> {
    const device = await this.patch<FermentationDeviceDTO>(`fermentation/devices/${encodeURIComponent(deviceUid)}`, {displayName});
    return mapFermentationDevice(device);
  }
  static unassignDevice(deviceUid: string): Promise<void> {
    return this.delete(`fermentation/devices/${encodeURIComponent(deviceUid)}/assignment`);
  }
}
