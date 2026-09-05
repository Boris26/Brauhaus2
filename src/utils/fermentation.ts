import {FermentationAction, FermentationMeasurement, SensorMeasurement} from '../model/Fermentation';
import {fermentationUnitLabel, FermentationTriggerType} from '../model/FermentationRecipeAction';

export interface LatestFermentationReadings {
  beerTemperature?: number;
  ambientTemperature?: number;
  plato?: number;
}

const latestValidValue = <T>(
  values: T[],
  getDate: (value: T) => string,
  getValue: (value: T) => number | null | undefined,
): number | undefined => {
  const latest = [...values]
    .filter(value => Number.isFinite(Date.parse(getDate(value))) && Number.isFinite(getValue(value)))
    .sort((a, b) => Date.parse(getDate(b)) - Date.parse(getDate(a)))[0];
  return latest === undefined ? undefined : getValue(latest) as number;
};

/** Selects each dashboard value independently so an incomplete newer record cannot hide an older valid value. */
export const latestFermentationReadings = (
  measurements: FermentationMeasurement[] = [],
  sensorMeasurements: SensorMeasurement[] = [],
): LatestFermentationReadings => {
  const manualTemperatures = measurements.map(value => ({
    measuredAt: value.measuredAt,
    temperature: value.temperature,
  }));
  const sensorTemperatures = sensorMeasurements.map(value => ({
    measuredAt: value.measuredAt,
    temperature: value.beerTemperature,
  }));

  return {
    beerTemperature: latestValidValue(
      [...manualTemperatures, ...sensorTemperatures],
      value => value.measuredAt,
      value => value.temperature,
    ),
    ambientTemperature: latestValidValue(sensorMeasurements, value => value.measuredAt, value => value.ambientTemperature),
    plato: latestValidValue(measurements, value => value.measuredAt, value => value.plato),
  };
};

export const latestByDate = <T>(values: T[], getDate: (value: T) => string): T | undefined =>
  [...values].sort((a, b) => Date.parse(getDate(b)) - Date.parse(getDate(a)))[0];
export const bubbleRate = (value?: SensorMeasurement): number | undefined => {
  if (!value) return undefined;
  if (typeof value.bubbleRatePerMinute === 'number') return value.bubbleRatePerMinute;
  return typeof value.bubbleCount === 'number' && typeof value.windowSeconds === 'number' && value.windowSeconds > 0
    ? value.bubbleCount * 60 / value.windowSeconds : undefined;
};
export const temperatureDelta = (value?: SensorMeasurement): number | undefined => {
  if (!value) return undefined;
  if (typeof value.temperatureDelta === 'number') return value.temperatureDelta;
  return typeof value.beerTemperature === 'number' && typeof value.ambientTemperature === 'number' ? value.beerTemperature - value.ambientTemperature : undefined;
};
export const isDeviceOnline = (lastSeenAt?: string | null, now = Date.now(), staleMinutes = 15): boolean =>
  Boolean(lastSeenAt && now - Date.parse(lastSeenAt) <= staleMinutes * 60_000);
export const fermentationDay = (startedAt?: string, now = Date.now()): number | undefined => {
  const start = startedAt ? Date.parse(startedAt) : NaN;
  return Number.isFinite(start) ? Math.max(1, Math.floor((now - start) / 86_400_000) + 1) : undefined;
};
export const actionDueLabel = (action: FermentationAction): {label: string; severity: 'future' | 'due'} => {
  if (action.due === true) return {label: 'Fällig', severity: 'due'};
  if (action.triggerType === FermentationTriggerType.MANUAL) return {label: 'Manuell', severity: 'future'};
  return {label: 'Trigger offen', severity: 'future'};
};

export const isActionDue = (action: FermentationAction): boolean => action.due === true;

export const canCompleteAction = (action: FermentationAction): boolean =>
  action.status === 'PENDING' && (isActionDue(action) || action.triggerType === FermentationTriggerType.MANUAL);

export const actionTriggerLabel = (action: FermentationAction): string => {
  if (action.triggerType === FermentationTriggerType.TIME_OFFSET && Number.isFinite(action.triggerValue)) {
    return `${action.triggerValue} ${fermentationUnitLabel(action.triggerUnit)} nach Gärbeginn`;
  }
  if (action.triggerType === FermentationTriggerType.PLATO_THRESHOLD && Number.isFinite(action.triggerValue)) {
    return `bei ≤ ${Number(action.triggerValue).toLocaleString('de-DE')} °P`;
  }
  if (action.triggerType === FermentationTriggerType.MANUAL) return 'Manuell';
  return 'Kein Zugabe-Trigger definiert';
};

export const contactTimeLabel = (action: FermentationAction): string | undefined =>
  Number.isFinite(action.contactTime)
    ? `${action.contactTime} ${fermentationUnitLabel(action.contactTimeUnit)}`
    : undefined;

export const contactStatus = (action: FermentationAction, now = Date.now()): 'running' | 'ended' | undefined => {
  if (action.status !== 'COMPLETED' || !action.contactEndsAt || !Number.isFinite(Date.parse(action.contactEndsAt))) return undefined;
  return Date.parse(action.contactEndsAt) <= now ? 'ended' : 'running';
};
export const missingPlatoDays = (values: FermentationMeasurement[], now = Date.now()): number | undefined => {
  const latest = latestByDate(values.filter(v => typeof v.plato === 'number'), v => v.measuredAt);
  return latest ? Math.floor((now - Date.parse(latest.measuredAt)) / 86_400_000) : undefined;
};
export const attenuation = (original: number, residual: number) => original > 0 ? (original - residual) / original * 100 : undefined;
export const approximateAlcohol = (original: number, residual: number) => (original - residual) * 0.53;
