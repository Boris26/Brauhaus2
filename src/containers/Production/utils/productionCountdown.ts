import {BrewingStatus, ProcessMode, ProcessState} from '../../../model/brewingStatus.types';

export const shouldCountdownLocally = (aBrewingStatus?: BrewingStatus): boolean =>
    aBrewingStatus?.process?.state === ProcessState.ACTIVE
    && aBrewingStatus.currentStep?.mode === ProcessMode.TIMER_RUNNING
    && Number(aBrewingStatus.currentStep?.duration) > 0;

export const getRemainingSecondsFromStatus = (aBrewingStatus?: BrewingStatus): number | undefined => {
    if (aBrewingStatus?.process?.state === ProcessState.FINISHED) return 0;
    if (aBrewingStatus === undefined || !shouldCountdownLocally(aBrewingStatus)) return undefined;
    const remaining = Number(aBrewingStatus.currentStep?.remainingTime);
    if (Number.isFinite(remaining) && remaining >= 0) return Math.floor(remaining);
    const duration = Number(aBrewingStatus.currentStep?.duration);
    const elapsed = Number(aBrewingStatus.currentStep?.elapsedTime);
    return Number.isFinite(duration) && Number.isFinite(elapsed) ? Math.max(0, Math.floor(duration - elapsed)) : undefined;
};

export const tickRemainingSeconds = (aCurrent: number | undefined): number | undefined =>
    typeof aCurrent === 'number' ? Math.max(0, aCurrent - 1) : undefined;
