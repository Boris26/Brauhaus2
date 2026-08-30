import {AgitatorRuntimeStatus} from './Agitator';
import {Alarm} from './brewingStatus.types';

export interface HeatingRunningState { running: boolean; }
export type AgitatorRealtimeState = Required<Pick<AgitatorRuntimeStatus, 'mode' | 'paused' | 'operation' | 'actualOutputOn' | 'speedPercent' | 'runningMinutes' | 'breakMinutes'>> & Pick<AgitatorRuntimeStatus, 'intervalPhase'>;
export interface AlarmRealtimeState { alarms: Alarm[]; }
export interface TemperatureSensorRealtimeState { health: string; sensorId?: string; }

export interface RealtimeControllerState {
    heatingRunning?: boolean;
    agitator?: AgitatorRealtimeState;
    alarms: Alarm[];
    alarmsReceived: boolean;
    temperatureSensor?: TemperatureSensorRealtimeState;
}
