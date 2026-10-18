export type WaterFillMode = 'AUTO' | 'MANUAL' | 'MASH' | 'SPARGE';
export type WaterFillLifecycle = 'IDLE' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'ERROR';

export interface WaterStatus {
    snapshotMetadata?: {schemaVersion: 1; controllerEpoch: string; waterFillingRevision: number};
    filledLiters: number;
    targetLiters: number;
    openClose: boolean;
    fillId?: string;
    mode?: WaterFillMode;
    state?: WaterFillLifecycle;
    reason?: string | null;
    error?: string | null;
}
