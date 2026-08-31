import {AgitatorRuntimeStatus} from './Agitator';
import {Alarm} from './brewingStatus.types';

export interface HeatingRunningState { running: boolean; }
export type AgitatorRealtimeState = Required<Pick<AgitatorRuntimeStatus, 'mode' | 'paused' | 'operation' | 'actualOutputOn' | 'speedPercent' | 'runningMinutes' | 'breakMinutes'>> & Pick<AgitatorRuntimeStatus, 'intervalPhase' | 'intervalProgressPercent'>;
export interface AlarmRealtimeState { alarms: Alarm[]; }
export type TemperatureSensorHealth = 'OK' | 'MISSING' | 'STALE' | 'INVALID_READING' | 'MULTIPLE_SENSORS_FOUND' | 'NOT_CONFIGURED';
export interface TemperatureSensorRealtimeState {
    current: number | null;
    health: TemperatureSensorHealth;
    sensorId: string | null;
}

export interface RealtimeControllerState {
    heatingRunning?: boolean;
    agitator?: AgitatorRealtimeState;
    alarms: Alarm[];
    alarmsReceived: boolean;
    temperatureSensor?: TemperatureSensorRealtimeState;
}
