import {BackendAvailable} from '../../../reducers/productionReducer';
import {BrewingStatus, ProcessMode} from '../../../model/brewingStatus.types';

export const isControllerAvailable = (aBackendAvailable: BackendAvailable | boolean): boolean =>
    typeof aBackendAvailable === 'boolean' ? aBackendAvailable : aBackendAvailable?.isBackenAvailable === true;

export const isHeaterActive = (aBrewingStatus?: BrewingStatus): boolean =>
    aBrewingStatus?.hardware?.heater === 'ON' || aBrewingStatus?.currentStep?.mode === ProcessMode.HEATING;

export const isAgitatorActive = (aBrewingStatus?: BrewingStatus): boolean => aBrewingStatus?.hardware?.agitator === 'ON';
