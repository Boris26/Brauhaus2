export type HeaterSafetyStatus =
    | 'DISARMED'
    | 'HEATING'
    | 'OVERSHOOT_GRACE'
    | 'MONITORING'
    | 'SUSPENDED'
    | 'HEATER_STUCK_ON';

export interface HeaterSafetyState {
    state: HeaterSafetyStatus;
    latched: boolean;
}
