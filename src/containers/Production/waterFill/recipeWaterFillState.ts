import {RecipeWaterFill, RecipeWaterFillStatus, WaterFillType} from './recipeWaterFill.types';

export const createInitialRecipeWaterFillStatus = (): RecipeWaterFillStatus => ({
    activeFillType: undefined,
    spargeState: 'IDLE',
    mashState: 'IDLE',
    completedSpargeLiters: 0,
    completedMashLiters: 0,
    currentFillLiters: 0,
    activeFillWasOpened: false,
    isSpargeIncluded: false
});

export const getWaterFillType = (aFill: RecipeWaterFill): WaterFillType => aFill === 'mash' ? 'MASH' : 'SPARGE';

export const startWaterFill = (aStatus: RecipeWaterFillStatus, aFill: RecipeWaterFill): RecipeWaterFillStatus => {
    const activeFillType = getWaterFillType(aFill);
    return {
        ...aStatus,
        activeFillType,
        currentFillLiters: 0,
        activeFillWasOpened: false,
        mashState: activeFillType === 'MASH' ? 'FILLING' : aStatus.mashState,
        spargeState: activeFillType === 'SPARGE' ? 'FILLING' : aStatus.spargeState
    };
};

export const markValveOpened = (aStatus: RecipeWaterFillStatus): RecipeWaterFillStatus => ({...aStatus, activeFillWasOpened: true});

export const completeWaterFill = (aStatus: RecipeWaterFillStatus, aCompletedLiters: number): RecipeWaterFillStatus => {
    const completedLiters = Math.max(0, Number.isFinite(aCompletedLiters) ? aCompletedLiters : 0);
    const activeFillType = aStatus.activeFillType;
    if (activeFillType === undefined) {
        return {...aStatus, activeFillWasOpened: false};
    }
    return {
        ...aStatus,
        activeFillType: undefined,
        activeFillWasOpened: false,
        currentFillLiters: completedLiters,
        completedMashLiters: activeFillType === 'MASH' ? completedLiters : aStatus.completedMashLiters,
        completedSpargeLiters: activeFillType === 'SPARGE' ? completedLiters : aStatus.completedSpargeLiters,
        mashState: activeFillType === 'MASH' ? 'COMPLETED' : aStatus.mashState,
        spargeState: activeFillType === 'SPARGE' ? 'COMPLETED' : aStatus.spargeState
    };
};

export const failWaterFill = (aStatus: RecipeWaterFillStatus): RecipeWaterFillStatus => ({
    ...aStatus,
    activeFillType: undefined,
    activeFillWasOpened: false,
    currentFillLiters: 0,
    spargeState: aStatus.activeFillType === 'SPARGE' ? 'ERROR' : aStatus.spargeState,
    mashState: aStatus.activeFillType === 'MASH' ? 'ERROR' : aStatus.mashState
});

export const resetWaterFill = (): RecipeWaterFillStatus => createInitialRecipeWaterFillStatus();
