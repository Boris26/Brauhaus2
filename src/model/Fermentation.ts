export type FermentationActionState = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface FermentationMeasurement {
  id: string;
  finishedBeerId: string;
  measuredAt: string;
  temperature?: number | null;
  plato?: number | null;
  note?: string;
}

export type CreateFermentationMeasurement = Omit<FermentationMeasurement, 'id'>;

export interface FermentationAction {
  id: string;
  finishedBeerId: string;
  type: string;
  ingredientName?: string;
  amount?: number;
  unit?: string;
  scheduledAt: string;
  state: FermentationActionState;
  completedAt?: string | null;
  removeAt?: string | null;
}

export interface FermentationDevice {
  id: string;
  name: string;
  status?: 'ONLINE' | 'OFFLINE' | string;
  lastSeenAt?: string | null;
  assignedFinishedBeerId?: string | null;
}

export interface SensorMeasurement {
  id: string;
  deviceId: string;
  finishedBeerId?: string;
  measuredAt: string;
  beerTemperature?: number | null;
  ambientTemperature?: number | null;
  temperatureDelta?: number | null;
  bubbleRatePerMinute?: number | null;
  bubbleCount?: number | null;
  windowSeconds?: number | null;
}

export interface FermentationDetails {
  measurements: FermentationMeasurement[];
  actions: FermentationAction[];
  devices: FermentationDevice[];
  sensorMeasurements: SensorMeasurement[];
  phaseStartedAt?: string;
}
