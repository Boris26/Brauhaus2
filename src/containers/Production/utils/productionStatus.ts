import {BackendAvailable} from '../../../reducers/productionReducer';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';

export type HeaterDisplayStatus = 'blocked' | 'ready' | 'active' | 'unknown';

export const isControllerAvailable = (aBackendAvailable: BackendAvailable | boolean): boolean =>
    typeof aBackendAvailable === 'boolean' ? aBackendAvailable : aBackendAvailable?.isBackenAvailable === true;

export const getHeaterDisplayStatus = (aBrewingStatus?: BrewingStatus, realtime?: RealtimeControllerState, socketConnected = false): HeaterDisplayStatus => {
    if (aBrewingStatus?.heating?.heaterEnabled === false) return 'blocked';
    if (socketConnected && realtime?.heatingRunning !== undefined) return realtime.heatingRunning ? 'active' : 'ready';
    return 'unknown';
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

export const getAgitatorActive = (realtime?: RealtimeControllerState, socketConnected = false): boolean | undefined => {
    if (socketConnected && realtime?.agitator) return realtime.agitator.actualOutputOn;
    return undefined;
};

export const getAlarmSnapshot = (realtime?: RealtimeControllerState, socketConnected = false) => {
    if (socketConnected && realtime?.alarmsReceived) return realtime.alarms;
    if (!socketConnected && realtime?.alarmsReceived) return undefined;
    return undefined;
};
