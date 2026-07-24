import {BrewingStatus, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {RecipeWaterFill, RecipeWaterFillStatus, WaterStatusSnapshot} from './recipeWaterFill.types';

export const sanitizeLiters = (aValue: unknown): number => {
    const numericValue = Number(aValue);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
};

export const getDisplayedWaterLiters = (aStatus: RecipeWaterFillStatus, aWaterStatus?: WaterStatusSnapshot): number => {
    if (aStatus.isSpargeIncluded) {
        return aStatus.completedMashLiters + aStatus.completedSpargeLiters;
    }
    if (aStatus.activeFillType !== undefined || aWaterStatus?.openClose === true) {
        return sanitizeLiters(aWaterStatus?.filledLiters);
    }
    if (aStatus.mashState === 'COMPLETED') {
        return aStatus.completedMashLiters;
    }
    return sanitizeLiters(aStatus.currentFillLiters);
};

export const getWaterTargetLiters = (aStatus: RecipeWaterFillStatus, aRecipeLiters: number, aWaterStatus?: WaterStatusSnapshot): number => {
    if (aStatus.activeFillType !== undefined || aWaterStatus?.openClose === true) {
        const target = sanitizeLiters(aWaterStatus?.targetLiters);
        if (target > 0) {
            return target;
        }
    }
    return sanitizeLiters(aRecipeLiters);
};

export const getWaterLabel = (aStatus: RecipeWaterFillStatus): string => {
    if (aStatus.isSpargeIncluded) return 'Brauwasser gesamt';
    if (aStatus.activeFillType === 'SPARGE' || (aStatus.spargeState === 'COMPLETED' && aStatus.mashState === 'IDLE')) return 'Nachguss';
    if (aStatus.activeFillType === 'MASH' || aStatus.mashState === 'COMPLETED') return 'Hauptguss';
    return 'Aktueller Füllvorgang';
};

export const isWaterFillingActive = (aStatus: RecipeWaterFillStatus, aWaterSwitchState: boolean, aWaterStatus?: WaterStatusSnapshot): boolean =>
    aWaterSwitchState || aStatus.activeFillType !== undefined || aWaterStatus?.openClose === true;

export const isRecipeWaterButtonDisabled = (aFill: RecipeWaterFill, aStatus: RecipeWaterFillStatus, aVolume: number | undefined, aControllerAvailable: boolean, aIsActive: boolean): boolean => {
    if (aVolume === undefined || !aControllerAvailable || aIsActive) return true;
    if (aFill === 'sparge') return aStatus.spargeState === 'COMPLETED' || aStatus.mashState !== 'IDLE';
    return aStatus.spargeState !== 'COMPLETED' || aStatus.mashState === 'COMPLETED';
};

export const shouldIncludeSpargeAfterMashingOut = (aStatus: RecipeWaterFillStatus, aPreviousStatus?: BrewingStatus, aCurrentStatus?: BrewingStatus): boolean => {
    if (aStatus.isSpargeIncluded || aStatus.spargeState !== 'COMPLETED' || aStatus.mashState !== 'COMPLETED') return false;
    const currentPhase = aCurrentStatus?.currentStep?.phase;
    return aPreviousStatus?.waiting?.waitingFor === WaitingFor.MASHING_OUT_CONFIRMATION
        && (currentPhase === ProcessPhase.COOKING || currentPhase === ProcessPhase.COOLING || currentPhase === ProcessPhase.FINISHED || aCurrentStatus?.process?.state === ProcessState.FINISHED);
};
