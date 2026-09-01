export type WarningType = 'TEMPERATURE_SENSOR' | string;

export type WarningDetailValue = string | number | boolean | null;

export interface Warning {
    type: WarningType;
    active: boolean;
    details?: Record<string, WarningDetailValue>;
}

export interface WarningRealtimeState {
    warnings: Warning[];
}
