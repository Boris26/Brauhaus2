import {TemperatureSensorHealth, TemperatureSensorRealtimeState} from '../model/RealtimeControllerState';

const healthMessages: Record<TemperatureSensorHealth, string> = {
    OK: 'Temperatursensor betriebsbereit',
    MISSING: 'Temperatursensor nicht verfügbar',
    STALE: 'Temperaturmessung nicht aktuell',
    INVALID_READING: 'Ungültiger Temperaturwert',
    MULTIPLE_SENSORS_FOUND: 'Mehrere Temperatursensoren erkannt',
    NOT_CONFIGURED: 'Temperatursensor nicht konfiguriert',
};

export const getTemperatureSensorMessage = (sensor?: TemperatureSensorRealtimeState): string =>
    sensor ? healthMessages[sensor.health] : 'Temperatursensorstatus wird ermittelt';

export const isTemperatureSensorReady = (sensor: TemperatureSensorRealtimeState | undefined, socketConnected: boolean | undefined): sensor is TemperatureSensorRealtimeState & {current: number} =>
    socketConnected === true && sensor?.health === 'OK' && typeof sensor.current === 'number' && Number.isFinite(sensor.current);

export const formatTemperature = (current: number | null | undefined): string =>
    current === null || current === undefined || !Number.isFinite(current)
        ? '-- °C'
        : `${current.toLocaleString('de-DE', {maximumFractionDigits: 1})} °C`;
