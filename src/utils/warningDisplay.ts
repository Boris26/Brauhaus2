import {TemperatureSensorHealth} from '../model/RealtimeControllerState';
import {Warning} from '../model/Warning';
import {getTemperatureSensorHealthMessage} from './temperatureSensor';

const knownTemperatureHealth = (value: unknown): value is TemperatureSensorHealth =>
    value === 'OK'
    || value === 'MISSING'
    || value === 'STALE'
    || value === 'INVALID_READING'
    || value === 'MULTIPLE_SENSORS_FOUND'
    || value === 'NOT_CONFIGURED';

export const getWarningMessage = (warning: Warning): string => {
    if (warning.type === 'TEMPERATURE_SENSOR') {
        const health = warning.details?.health;
        return knownTemperatureHealth(health)
            ? getTemperatureSensorHealthMessage(health)
            : 'Temperatursensor prüfen';
    }
    return `Betriebswarnung: ${warning.type}`;
};

export const getActiveWarnings = (warnings?: Warning[]): Warning[] =>
    (warnings ?? []).filter((warning) => warning.active === true);

export const getWarningHeaderText = (warnings?: Warning[]): string | undefined => {
    const activeWarnings = getActiveWarnings(warnings);
    if (activeWarnings.length === 0) return undefined;

    const messages = activeWarnings.map(getWarningMessage);
    if (messages.length === 1) return `⚠ ${messages[0]}`;
    return `⚠ ${messages.length} Warnungen: ${messages.join(' · ')}`;
};
