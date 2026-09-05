import {FermentationTriggerTimeUnit, FermentationTriggerType} from './FermentationRecipeAction';

/** Persisted runtime truth. Fälligkeit is returned separately and is never persisted by this UI. */
export type FermentationActionState = 'PENDING' | 'COMPLETED' | 'SKIPPED';
export type FermentationActionDisplayStatus = FermentationActionState | 'DUE';

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
  scheduledAt?: string | null;
  triggerType?: FermentationTriggerType;
  triggerOffset?: number;
  triggerUnit?: FermentationTriggerTimeUnit;
  triggerPlato?: number;
  contactTime?: number;
  contactTimeUnit?: FermentationTriggerTimeUnit;
  contactEndsAt?: string | null;
  state: FermentationActionState;
  /** Backend-calculated projection from the current trigger inputs. */
  due?: boolean;
  /** Optional virtual status for APIs representing `due` as `DUE`. */
  status?: FermentationActionDisplayStatus;
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
}
