export type RecipeWaterFill = 'mash' | 'sparge';
export type WaterFillType = 'SPARGE' | 'MASH';
export type WaterFillState = 'IDLE' | 'FILLING' | 'COMPLETED' | 'ERROR';

export interface RecipeWaterFillStatus {
    activeFillType?: WaterFillType;
    spargeState: WaterFillState;
    mashState: WaterFillState;
    completedSpargeLiters: number;
    completedMashLiters: number;
    currentFillLiters: number;
    activeFillWasOpened: boolean;
    isSpargeIncluded: boolean;
}

export interface WaterStatusSnapshot {
    filledLiters?: number;
    targetLiters?: number;
    openClose?: boolean;
}
