import {RecipeWaterFill, RecipeWaterFillStatus, WaterFillType} from './recipeWaterFill.types';

export const createInitialRecipeWaterFillStatus = (): RecipeWaterFillStatus => ({
    activeFillType: undefined,
    isFillActive: false,
    spargeState: 'IDLE',
    mashState: 'IDLE',
    completedSpargeLiters: 0,
    completedMashLiters: 0,
    currentFillLiters: 0,
    currentWaterLiters: 0,
    activeFillWasOpened: false,
    isSpargeIncluded: false
});

export const getWaterFillType = (aFill: RecipeWaterFill): WaterFillType => aFill === 'mash' ? 'MASH' : 'SPARGE';

export const startWaterFill = (aStatus: RecipeWaterFillStatus, aFill: RecipeWaterFill): RecipeWaterFillStatus => {
    const activeFillType = getWaterFillType(aFill);
    return {
        ...aStatus,
        activeFillType,
        isFillActive: true,
        currentFillLiters: 0,
        // Recipe fills start a new physical vessel-water phase. In particular,
        // starting mash water means the previously prepared sparge water has
        // already been transferred out of the brewing vessel.
        currentWaterLiters: 0,
        activeFillWasOpened: false,
        mashState: activeFillType === 'MASH' ? 'FILLING' : aStatus.mashState,
        spargeState: activeFillType === 'SPARGE' ? 'FILLING' : aStatus.spargeState
    };
};

export const startManualWaterFill = (aStatus: RecipeWaterFillStatus): RecipeWaterFillStatus => ({
    ...aStatus,
    activeFillType: undefined,
    isFillActive: true,
    currentFillLiters: 0,
    activeFillWasOpened: false
});

export const markValveOpened = (aStatus: RecipeWaterFillStatus): RecipeWaterFillStatus => ({...aStatus, activeFillWasOpened: true});

export const completeWaterFill = (aStatus: RecipeWaterFillStatus, aCompletedLiters: number): RecipeWaterFillStatus => {
    const completedLiters = Math.max(0, Number.isFinite(aCompletedLiters) ? aCompletedLiters : 0);
    const activeFillType = aStatus.activeFillType;
    if (!aStatus.isFillActive) {
        return {...aStatus, activeFillWasOpened: false};
    }
    return {
        ...aStatus,
        activeFillType: undefined,
        isFillActive: false,
        activeFillWasOpened: false,
        currentFillLiters: completedLiters,
        currentWaterLiters: aStatus.currentWaterLiters + completedLiters,
        completedMashLiters: activeFillType === 'MASH' ? completedLiters : aStatus.completedMashLiters,
        completedSpargeLiters: activeFillType === 'SPARGE' ? completedLiters : aStatus.completedSpargeLiters,
        mashState: activeFillType === 'MASH' ? 'COMPLETED' : aStatus.mashState,
        spargeState: activeFillType === 'SPARGE' ? 'COMPLETED' : aStatus.spargeState
    };
};

export const failWaterFill = (aStatus: RecipeWaterFillStatus): RecipeWaterFillStatus => ({
    ...aStatus,
    activeFillType: undefined,
    isFillActive: false,
    activeFillWasOpened: false,
    currentFillLiters: 0,
    spargeState: aStatus.activeFillType === 'SPARGE' ? 'ERROR' : aStatus.spargeState,
    mashState: aStatus.activeFillType === 'MASH' ? 'ERROR' : aStatus.mashState
});

export const resetWaterFill = (): RecipeWaterFillStatus => createInitialRecipeWaterFillStatus();
