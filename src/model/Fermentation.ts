import {ContactTimeUnit, FermentationTriggerType, FermentationTriggerUnit} from './FermentationRecipeAction';

/** Persisted runtime truth. Fälligkeit is returned separately and is never persisted by this UI. */
export type FermentationActionState = 'PENDING' | 'COMPLETED' | 'SKIPPED';

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
  actionId: string;
  sourceType: string;
  name?: string;
  amount?: number;
  unit?: string;
  triggerType?: FermentationTriggerType;
  triggerValue?: number;
  triggerUnit?: FermentationTriggerUnit;
  contactTime?: number;
  contactTimeUnit?: ContactTimeUnit;
  contactEndsAt?: string | null;
  status: FermentationActionState;
  /** Backend-calculated projection from the current trigger inputs. */
  due?: boolean;
  completedAt?: string | null;
  skippedAt?: string | null;
  latestPlato?: number | null;
}

/** Wire shape returned by BeerDataStore. MANUAL actions may encode absent trigger data as null. */
export interface FermentationActionDTO extends Omit<FermentationAction, 'triggerType' | 'triggerValue' | 'triggerUnit' | 'contactTime' | 'contactTimeUnit'> {
  triggerType?: FermentationTriggerType | null;
  triggerValue?: number | null;
  triggerUnit?: FermentationTriggerUnit | null;
  contactTime?: number | null;
  contactTimeUnit?: ContactTimeUnit | null;
}

export const mapFermentationAction = (dto: FermentationActionDTO): FermentationAction => ({
  actionId: dto.actionId,
  sourceType: dto.sourceType,
  name: dto.name,
  amount: dto.amount,
  unit: dto.unit,
  triggerType: dto.triggerType ?? undefined,
  triggerValue: dto.triggerValue ?? undefined,
  triggerUnit: dto.triggerUnit ?? undefined,
  contactTime: dto.contactTime ?? undefined,
  contactTimeUnit: dto.contactTimeUnit ?? undefined,
  status: dto.status,
  due: dto.due,
  completedAt: dto.completedAt,
  skippedAt: dto.skippedAt,
  contactEndsAt: dto.contactEndsAt,
  latestPlato: dto.latestPlato,
});

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
