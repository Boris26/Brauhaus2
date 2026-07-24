import {ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {completeWaterFill, createInitialRecipeWaterFillStatus, failWaterFill, markValveOpened, resetWaterFill, startWaterFill} from './recipeWaterFillState';
import {getDisplayedWaterLiters, isRecipeWaterButtonDisabled, sanitizeLiters, shouldIncludeSpargeAfterMashingOut} from './recipeWaterFillSelectors';

describe('recipe water fill state', () => {
    it('starts sparge from IDLE and marks the valve opened', () => {
        const filling = startWaterFill(createInitialRecipeWaterFillStatus(), 'sparge');
        expect(filling.spargeState).toBe('FILLING');
        expect(markValveOpened(filling).activeFillWasOpened).toBe(true);
    });

    it('completes sparge, keeps its water level and disables the sparge button', () => {
        const completed = completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'sparge')), 12.4);
        expect(completed.spargeState).toBe('COMPLETED');
        expect(completed.completedSpargeLiters).toBe(12.4);
        expect(isRecipeWaterButtonDisabled('sparge', completed, 12, true, false)).toBe(true);
        expect(getDisplayedWaterLiters(completed, {filledLiters: 0, targetLiters: 0, openClose: false})).toBe(12.4);
    });

    it('enables mash only after sparge and disables mash after completion', () => {
        const initial = createInitialRecipeWaterFillStatus();
        expect(isRecipeWaterButtonDisabled('mash', initial, 20, true, false)).toBe(true);
        const spargeCompleted = completeWaterFill(markValveOpened(startWaterFill(initial, 'sparge')), 10);
        expect(isRecipeWaterButtonDisabled('mash', spargeCompleted, 20, true, false)).toBe(false);
        const mashCompleted = completeWaterFill(markValveOpened(startWaterFill(spargeCompleted, 'mash')), 20);
        expect(isRecipeWaterButtonDisabled('mash', mashCompleted, 20, true, false)).toBe(true);
    });

    it('sets only the active fill to ERROR and resets for a new brew', () => {
        const failed = failWaterFill(startWaterFill(createInitialRecipeWaterFillStatus(), 'mash'));
        expect(failed.mashState).toBe('ERROR');
        expect(failed.spargeState).toBe('IDLE');
        expect(resetWaterFill()).toEqual(createInitialRecipeWaterFillStatus());
    });

    it('adds mash and sparge after mashing out and sanitizes invalid backend values', () => {
        const mashCompleted = completeWaterFill(markValveOpened(startWaterFill(completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'sparge')), 8), 'mash')), 22);
        const previousStatus = {waiting: {waitingFor: WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm: true}};
        const currentStatus = {process: {state: ProcessState.ACTIVE}, currentStep: {phase: ProcessPhase.COOKING}};
        expect(shouldIncludeSpargeAfterMashingOut(mashCompleted, previousStatus, currentStatus)).toBe(true);
        expect(getDisplayedWaterLiters({...mashCompleted, isSpargeIncluded: true})).toBe(30);
        expect(sanitizeLiters(Number.NaN)).toBe(0);
        expect(sanitizeLiters(undefined)).toBe(0);
        expect(sanitizeLiters(-1)).toBe(0);
    });
});
