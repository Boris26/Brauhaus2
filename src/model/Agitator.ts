export type AgitatorMode = 'OFF' | 'CONTINUOUS' | 'AUTOMATIC';
export type AgitatorOperation = 'STOPPED' | 'CONTINUOUS' | 'INTERVAL';

export interface AgitatorConfig {
    mode: AgitatorMode;
    speedPercent: number;
    runningMinutes: number;
    breakMinutes: number;
}

export interface AgitatorRuntimeStatus {
    mode: AgitatorMode;
    paused: boolean;
    operation: AgitatorOperation;
    intervalPhase?: string;
    actualOutputOn: boolean;
    speedPercent?: number;
    runningMinutes?: number;
    breakMinutes?: number;
    /** Controller-owned progress of the current interval phase (0..100). */
    intervalProgressPercent?: number;
}

export interface AgitatorDetailStatus {
    config: AgitatorConfig;
    inputs: { heatingActive: boolean };
    runtime: {
        paused: boolean;
        desiredOperation: AgitatorOperation;
        actualState?: string;
        actualOutputOn: boolean;
        intervalPhase?: string;
        intervalProgressPercent?: number;
    };
}
