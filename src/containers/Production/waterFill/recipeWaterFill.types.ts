export type RecipeWaterFill = 'mash' | 'sparge';
export type WaterFillType = 'SPARGE' | 'MASH';
export type WaterFillState = 'IDLE' | 'FILLING' | 'COMPLETED' | 'ERROR';

export interface RecipeWaterFillStatus {
    activeFillType?: WaterFillType;
    isFillActive: boolean;
    spargeState: WaterFillState;
    mashState: WaterFillState;
    completedSpargeLiters: number;
    completedMashLiters: number;
    currentFillLiters: number;
    currentWaterLiters: number;
    activeFillWasOpened: boolean;
    isSpargeIncluded: boolean;
}

export interface WaterStatusSnapshot {
    filledLiters?: number;
    targetLiters?: number;
    openClose?: boolean;
}
