import {ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {completeWaterFill, createInitialRecipeWaterFillStatus, failWaterFill, markValveOpened, resetWaterFill, startManualWaterFill, startWaterFill} from './recipeWaterFillState';
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
        expect(getDisplayedWaterLiters({...mashCompleted, isSpargeIncluded: true})).toBe(22);
        expect(sanitizeLiters(Number.NaN)).toBe(0);
        expect(sanitizeLiters(undefined)).toBe(0);
        expect(sanitizeLiters(-1)).toBe(0);
    });

    it('accumulates consecutive manual fills in an initially empty vessel', () => {
        const first = completeWaterFill(markValveOpened(startManualWaterFill(createInitialRecipeWaterFillStatus())), 2);
        const second = completeWaterFill(markValveOpened(startManualWaterFill(first)), 2);
        expect(first.currentWaterLiters).toBe(2);
        expect(second.currentWaterLiters).toBe(4);
    });

    it('keeps completed sparge water and accumulates multiple manual additions', () => {
        const sparge = completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'sparge')), 5);
        const plusTwo = completeWaterFill(markValveOpened(startManualWaterFill(sparge)), 2);
        const plusOne = completeWaterFill(markValveOpened(startManualWaterFill(plusTwo)), 1);
        expect(sparge.currentWaterLiters).toBe(5);
        expect(plusTwo.currentWaterLiters).toBe(7);
        expect(plusOne.currentWaterLiters).toBe(8);
        expect(plusOne.completedSpargeLiters).toBe(5);
    });

    it('resets the vessel at mash start and does not carry prepared sparge water over', () => {
        const sparge = completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'sparge')), 5);
        const supplementedSparge = completeWaterFill(markValveOpened(startManualWaterFill(sparge)), 2);
        const mashStarted = startWaterFill(supplementedSparge, 'mash');
        const mashCompleted = completeWaterFill(markValveOpened(mashStarted), 5);
        expect(supplementedSparge.currentWaterLiters).toBe(7);
        expect(mashStarted.currentWaterLiters).toBe(0);
        expect(mashCompleted.currentWaterLiters).toBe(5);
        expect(mashCompleted.currentWaterLiters).not.toBe(12);
    });

    it('accumulates manual additions after mash and uses measured rather than requested liters', () => {
        const mash = completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'mash')), 20);
        const measuredAddition = completeWaterFill(markValveOpened(startManualWaterFill(mash)), 4.8);
        const finalAddition = completeWaterFill(markValveOpened(startManualWaterFill(measuredAddition)), 3);
        expect(measuredAddition.currentWaterLiters).toBe(24.8);
        expect(finalAddition.currentWaterLiters).toBe(27.8);
        expect(finalAddition.completedMashLiters).toBe(20);
    });

    it('shows committed water plus the current measurement without committing poll snapshots', () => {
        const mash = completeWaterFill(markValveOpened(startWaterFill(createInitialRecipeWaterFillStatus(), 'mash')), 20);
        const filling = markValveOpened(startManualWaterFill(mash));
        expect(getDisplayedWaterLiters(filling, {filledLiters: 1.5, targetLiters: 5, openClose: true})).toBe(21.5);
        expect(getDisplayedWaterLiters(filling, {filledLiters: 2, targetLiters: 5, openClose: true})).toBe(22);
        expect(filling.currentWaterLiters).toBe(20);
        const completed = completeWaterFill(filling, 4.8);
        expect(completed.currentWaterLiters).toBe(24.8);
        expect(completeWaterFill(completed, 4.8).currentWaterLiters).toBe(24.8);
    });
});
