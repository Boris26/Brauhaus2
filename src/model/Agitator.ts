export type AgitatorMode = 'OFF' | 'CONTINUOUS' | 'AUTOMATIC';
export type AgitatorOperation = 'OFF' | 'CONTINUOUS' | 'INTERVAL';

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
    };
}
