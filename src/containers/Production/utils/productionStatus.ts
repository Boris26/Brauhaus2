import {BackendAvailable} from '../../../reducers/productionReducer';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';

export const isControllerAvailable = (aBackendAvailable: BackendAvailable | boolean): boolean =>
    typeof aBackendAvailable === 'boolean' ? aBackendAvailable : aBackendAvailable?.isBackenAvailable === true;

export const getHeatingActive = (realtime?: RealtimeControllerState, socketConnected = false): boolean | undefined =>
    socketConnected && realtime?.heatingRunning !== undefined ? realtime.heatingRunning : undefined;

export const getAgitatorActive = (realtime?: RealtimeControllerState, socketConnected = false): boolean | undefined => {
    if (socketConnected && realtime?.agitator) return realtime.agitator.actualOutputOn;
    return undefined;
};

export const getAlarmSnapshot = (realtime?: RealtimeControllerState, socketConnected = false) => {
    if (socketConnected && realtime?.alarmsReceived) return realtime.alarms;
    if (!socketConnected && realtime?.alarmsReceived) return undefined;
    return undefined;
};
