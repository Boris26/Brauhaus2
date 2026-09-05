import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {createBrewingDisplayTimeAnchor, getRemainingSecondsFromStatus, projectBrewingDisplayTime, shouldCountdownLocally} from './productionCountdown';

const status = (mode: ProcessMode, remainingTime: number): BrewingStatus => ({
    elapsedTime: 0,
    process: {state: ProcessState.ACTIVE},
    currentStep: {phase: ProcessPhase.RAST, mode, duration: 10, elapsedTime: 10 - remainingTime, remainingTime},
    temperature: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {},
});

describe('production countdown', () => {
    it('runs only during TIMER_RUNNING and not during HEATING', () => {
        expect(shouldCountdownLocally(status(ProcessMode.TIMER_RUNNING, 5))).toBe(true);
        expect(shouldCountdownLocally(status(ProcessMode.HEATING, 5))).toBe(false);
    });

    it('does not drop below zero and synchronizes new backend values', () => {
        expect(getRemainingSecondsFromStatus(status(ProcessMode.TIMER_RUNNING, 7))).toBe(7);
        expect(getRemainingSecondsFromStatus({...status(ProcessMode.TIMER_RUNNING, 7), process: {state: ProcessState.FINISHED}})).toBe(0);
    });

    it.each([[1, 6, 4], [5, 2, 8], [10, 0, 10], [30, 0, 10]])('projects wall-clock time after %s seconds', (seconds, remaining, elapsed) => {
        const brewingStatus = status(ProcessMode.TIMER_RUNNING, 7);
        const anchor = createBrewingDisplayTimeAnchor(brewingStatus, 1_000);
        expect(projectBrewingDisplayTime(brewingStatus, anchor, 1_000 + seconds * 1000)).toMatchObject({remainingSeconds: remaining, stepElapsedSeconds: elapsed});
    });

    it.each([ProcessMode.WAITING, ProcessMode.HEATING, ProcessMode.HOLDING, ProcessMode.FINISHED])('does not project mode %s', (mode) => {
        const brewingStatus = status(mode, 7);
        expect(createBrewingDisplayTimeAnchor(brewingStatus, 0)).toBeUndefined();
        expect(projectBrewingDisplayTime(brewingStatus, undefined, 30_000).stepElapsedSeconds).toBe(3);
    });

    it('does not project a finished process', () => {
        const brewingStatus = {...status(ProcessMode.TIMER_RUNNING, 7), process: {state: ProcessState.FINISHED}};
        expect(createBrewingDisplayTimeAnchor(brewingStatus, 0)).toBeUndefined();
        expect(projectBrewingDisplayTime(brewingStatus, undefined, 30_000).remainingSeconds).toBe(0);
    });

    it('rejects an old anchor after a step change', () => {
        const first = status(ProcessMode.TIMER_RUNNING, 7);
        first.currentStep.index = 1;
        const second = status(ProcessMode.TIMER_RUNNING, 4);
        second.currentStep.index = 2;
        expect(projectBrewingDisplayTime(second, createBrewingDisplayTimeAnchor(first, 0), 5_000)).toMatchObject({remainingSeconds: 4, stepElapsedSeconds: 6});
    });

    it('accepts authoritative resyncs both forwards and backwards', () => {
        const initial = status(ProcessMode.TIMER_RUNNING, 7);
        expect(projectBrewingDisplayTime(initial, createBrewingDisplayTimeAnchor(initial, 0), 5_000).remainingSeconds).toBe(2);
        const forwards = status(ProcessMode.TIMER_RUNNING, 1);
        expect(projectBrewingDisplayTime(forwards, createBrewingDisplayTimeAnchor(forwards, 5_000), 5_000).remainingSeconds).toBe(1);
        const backwards = status(ProcessMode.TIMER_RUNNING, 6);
        expect(projectBrewingDisplayTime(backwards, createBrewingDisplayTimeAnchor(backwards, 5_000), 5_000).remainingSeconds).toBe(6);
    });
});
