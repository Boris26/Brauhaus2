import {BrewSession} from './BrewSession';

export interface BrewRecoveryCurrentStep {
    index?: number;
    count?: number;
    stepId?: string;
    phase?: string;
    mode?: string;
    name?: string;
    duration?: number;
    elapsedTime?: number;
    remainingTime?: number;
}

export interface BrewRecoveryProcessStatus {
    process?: Record<string, unknown>;
    currentStep?: BrewRecoveryCurrentStep;
    waiting?: {waitingFor?: string; canConfirm?: boolean};
    heating?: {followsDecoction?: boolean};
}

export interface BrewRecoveryEnvelope {
    version: number;
    brewSession: BrewSession;
    status: BrewRecoveryProcessStatus;
    updatedAt: string;
}

export interface BrewRecoverySnapshot {
    available: boolean;
    recovery: BrewRecoveryEnvelope | null;
    error?: string;
}

export interface BrewRecoveryState extends BrewRecoverySnapshot {
    resumePending: boolean;
    discardPending: boolean;
    error?: string;
}
