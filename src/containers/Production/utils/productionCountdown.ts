import {BrewingStatus, ProcessMode, ProcessState} from '../../../model/brewingStatus.types';
import {getCurrentStepIdentity} from '../../../utils/brewingStatus/selectors';

export interface BrewingDisplayTimeAnchor {
    duration: number;
    serverRemainingSeconds: number;
    serverStepElapsedSeconds: number;
    serverProcessElapsedSeconds: number;
    synchronizedAtMs: number;
    stepIdentity: string;
}

export interface BrewingDisplayTime {
    remainingSeconds?: number;
    stepElapsedSeconds?: number;
    processElapsedSeconds?: number;
}

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

const clamp = (value: number, minimum: number, maximum: number): number =>
    Math.min(maximum, Math.max(minimum, value));

export const createBrewingDisplayTimeAnchor = (
    aBrewingStatus: BrewingStatus | undefined,
    synchronizedAtMs: number
): BrewingDisplayTimeAnchor | undefined => {
    if (!shouldCountdownLocally(aBrewingStatus)) return undefined;

    const duration = Number(aBrewingStatus?.currentStep.duration);
    const rawRemaining = Number(aBrewingStatus?.currentStep.remainingTime);
    const rawStepElapsed = Number(aBrewingStatus?.currentStep.elapsedTime);
    const hasRemaining = Number.isFinite(rawRemaining) && rawRemaining >= 0;
    const serverRemainingSeconds = hasRemaining
        ? clamp(Math.floor(rawRemaining), 0, duration)
        : clamp(Math.floor(Number.isFinite(rawStepElapsed) ? duration - rawStepElapsed : duration), 0, duration);
    // remainingTime is preferred so elapsed and remaining always describe the
    // same display instant even if the controller values have minor rounding drift.
    const serverStepElapsedSeconds = hasRemaining
        ? duration - serverRemainingSeconds
        : clamp(Math.floor(Number.isFinite(rawStepElapsed) ? rawStepElapsed : 0), 0, duration);

    return {
        duration,
        serverRemainingSeconds,
        serverStepElapsedSeconds,
        serverProcessElapsedSeconds: Math.max(0, Number(aBrewingStatus?.elapsedTime) || 0),
        synchronizedAtMs,
        stepIdentity: getCurrentStepIdentity(aBrewingStatus),
    };
};

export const projectBrewingDisplayTime = (
    aBrewingStatus: BrewingStatus | undefined,
    anchor: BrewingDisplayTimeAnchor | undefined,
    nowMs: number
): BrewingDisplayTime => {
    if (!anchor || !shouldCountdownLocally(aBrewingStatus) || anchor.stepIdentity !== getCurrentStepIdentity(aBrewingStatus)) {
        const remainingSeconds = getRemainingSecondsFromStatus(aBrewingStatus);
        const duration = Number(aBrewingStatus?.currentStep.duration);
        const rawElapsed = Number(aBrewingStatus?.currentStep.elapsedTime);
        return {
            remainingSeconds,
            stepElapsedSeconds: Number.isFinite(duration) && duration > 0 && Number.isFinite(rawElapsed)
                ? clamp(Math.floor(rawElapsed), 0, duration)
                : undefined,
            processElapsedSeconds: aBrewingStatus ? Math.max(0, Number(aBrewingStatus.elapsedTime) || 0) : undefined,
        };
    }

    const wallClockDelta = Math.max(0, Math.floor((nowMs - anchor.synchronizedAtMs) / 1000));
    const remainingSeconds = clamp(anchor.serverRemainingSeconds - wallClockDelta, 0, anchor.duration);
    return {
        remainingSeconds,
        stepElapsedSeconds: clamp(anchor.duration - remainingSeconds, 0, anchor.duration),
        processElapsedSeconds: anchor.serverProcessElapsedSeconds + wallClockDelta,
    };
};
