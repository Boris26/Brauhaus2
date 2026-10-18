export type WaterFillMode = 'AUTO' | 'MANUAL' | 'MASH' | 'SPARGE';
export type WaterFillLifecycle = 'IDLE' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'ERROR';

export interface WaterStatus {
    filledLiters: number;
    targetLiters: number;
    openClose: boolean;
    fillId?: string;
    mode?: WaterFillMode;
    state?: WaterFillLifecycle;
    reason?: string | null;
    error?: string | null;
}
