import {FermentationAction, FermentationMeasurement, SensorMeasurement} from '../model/Fermentation';

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
export const actionDueLabel = (action: FermentationAction, now = new Date()): {label: string; severity: 'future' | 'due' | 'overdue'} => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDate = new Date(action.scheduledAt); const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days < 0) return {label: `${Math.abs(days)} Tag${days === -1 ? '' : 'e'} überfällig`, severity: 'overdue'};
  if (days === 0) return {label: 'Heute', severity: 'due'};
  if (days === 1) return {label: 'Morgen', severity: 'future'};
  return {label: `In ${days} Tagen`, severity: 'future'};
};
export const missingPlatoDays = (values: FermentationMeasurement[], now = Date.now()): number | undefined => {
  const latest = latestByDate(values.filter(v => typeof v.plato === 'number'), v => v.measuredAt);
  return latest ? Math.floor((now - Date.parse(latest.measuredAt)) / 86_400_000) : undefined;
};
export const attenuation = (original: number, residual: number) => original > 0 ? (original - residual) / original * 100 : undefined;
export const approximateAlcohol = (original: number, residual: number) => (original - residual) * 0.53;
