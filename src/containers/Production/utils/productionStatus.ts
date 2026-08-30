import {BackendAvailable} from '../../../reducers/productionReducer';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';

export type HeaterDisplayStatus = 'blocked' | 'ready' | 'active' | 'unknown';

export const isControllerAvailable = (aBackendAvailable: BackendAvailable | boolean): boolean =>
    typeof aBackendAvailable === 'boolean' ? aBackendAvailable : aBackendAvailable?.isBackenAvailable === true;

export const isHeaterActive = (aBrewingStatus?: BrewingStatus): boolean =>
    aBrewingStatus?.hardware?.heater === 'ON';

export const getHeaterDisplayStatus = (aBrewingStatus?: BrewingStatus, realtime?: RealtimeControllerState, socketConnected = false): HeaterDisplayStatus => {
    if (aBrewingStatus?.heating?.heaterEnabled === false) return 'blocked';
    if (socketConnected && realtime?.heatingRunning !== undefined) return realtime.heatingRunning ? 'active' : 'ready';
    if (realtime?.heatingRunning !== undefined) return 'unknown';
    return isHeaterActive(aBrewingStatus) ? 'active' : 'ready';
};

export const getHeaterDisplayLabel = (aBrewingStatus?: BrewingStatus, realtime?: RealtimeControllerState, socketConnected = false): string => {
    const labels: Record<HeaterDisplayStatus, string> = {
        blocked: 'Heizung gesperrt',
        ready: 'Heizung bereit',
        active: 'Heizung aktiv',
        unknown: 'Unbekannt',
    };
    return labels[getHeaterDisplayStatus(aBrewingStatus, realtime, socketConnected)];
};

export const isAgitatorActive = (aBrewingStatus?: BrewingStatus): boolean => aBrewingStatus?.hardware?.agitator === 'ON';
export const getAgitatorActive = (status?: BrewingStatus, realtime?: RealtimeControllerState, socketConnected = false): boolean | undefined => {
    if (socketConnected && realtime?.agitator) return realtime.agitator.actualOutputOn;
    if (realtime?.agitator) return undefined;
    return status?.hardware?.agitator === 'ON';
};

export const getAlarmSnapshot = (status?: BrewingStatus, realtime?: RealtimeControllerState, socketConnected = false) => {
    if (socketConnected && realtime?.alarmsReceived) return realtime.alarms;
    if (!socketConnected && realtime?.alarmsReceived) return undefined;
    return status?.alarms;
};
