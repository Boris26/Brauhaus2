export enum ProcessState {
    IDLE = "IDLE",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
    ABORTED = "ABORTED",
    ERROR = "ERROR"
}

export enum ProcessPhase {
    NONE = "NONE",
    MASHING_IN = "MASHING_IN",
    RAST = "RAST",
    MASHING_OUT = "MASHING_OUT",
    COOKING = "COOKING",
    COOLING = "COOLING",
    FINISHED = "FINISHED"
}

export enum ProcessMode {
    NONE = "NONE",
    HEATING = "HEATING",
    HOLDING = "HOLDING",
    TIMER_RUNNING = "TIMER_RUNNING",
    WAITING = "WAITING",
    FINISHED = "FINISHED",
    ERROR = "ERROR"
}

export enum WaitingFor {
    NONE = "NONE",
    USER_CONFIRMATION = "USER_CONFIRMATION",
    IODINE_TEST = "IODINE_TEST",
    MASHING_IN_CONFIRMATION = "MASHING_IN_CONFIRMATION",
    MASHING_OUT_CONFIRMATION = "MASHING_OUT_CONFIRMATION",
    COOKING_CONFIRMATION = "COOKING_CONFIRMATION",
    BOILING_CONFIRMATION = "BOILING_CONFIRMATION",
    DECOCTION_CONFIRMATION = "DECOCTION_CONFIRMATION"
}

export interface BrewingStatus {
    elapsedTime: number;
    currentTime: number;
    process: {
        state: ProcessState;
    };
    currentStep: {
        index?: number;
        count?: number;
        phase: ProcessPhase;
        mode: ProcessMode;
        name?: string;
        duration?: number;
        elapsedTime?: number;
        remainingTime?: number;
        type?: string;
    };
    temperature: {
        current?: number;
        target?: number;
    };
    hardware: {
        heater?: string;
        agitator?: string;
    };
    waiting: {
        waitingFor: WaitingFor;
        canConfirm: boolean;
    };
    error: {
        code?: string | null;
        details?: string | null;
    };
}

export type LegacyBrewingStatus = {
    elapsedTime?: number;
    currentTime?: number;
    Temperature?: number;
    TargetTemperature?: number;
    StatusText?: string;
    HeatingStates?: string;
    Name?: string;
    Type?: string;
    WaitingStatus?: boolean;
    HeatUpStatus?: boolean;
    AgitatorStatus?: boolean;
    index?: number;
};
