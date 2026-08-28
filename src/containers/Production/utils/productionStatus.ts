import {BackendAvailable} from '../../../reducers/productionReducer';
import {BrewingStatus} from '../../../model/brewingStatus.types';

export type HeaterDisplayStatus = 'blocked' | 'ready' | 'active';

export const isControllerAvailable = (aBackendAvailable: BackendAvailable | boolean): boolean =>
    typeof aBackendAvailable === 'boolean' ? aBackendAvailable : aBackendAvailable?.isBackenAvailable === true;

export const isHeaterActive = (aBrewingStatus?: BrewingStatus): boolean =>
    aBrewingStatus?.hardware?.heater === 'ON';

export const getHeaterDisplayStatus = (aBrewingStatus?: BrewingStatus): HeaterDisplayStatus => {
    if (aBrewingStatus?.heating?.heaterEnabled === false) return 'blocked';
    return isHeaterActive(aBrewingStatus) ? 'active' : 'ready';
};

export const getHeaterDisplayLabel = (aBrewingStatus?: BrewingStatus): string => {
    const labels: Record<HeaterDisplayStatus, string> = {
        blocked: 'Heizung gesperrt',
        ready: 'Heizung bereit',
        active: 'Heizung aktiv',
    };
    return labels[getHeaterDisplayStatus(aBrewingStatus)];
};

export const isAgitatorActive = (aBrewingStatus?: BrewingStatus): boolean => aBrewingStatus?.hardware?.agitator === 'ON';
