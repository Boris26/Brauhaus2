import {BrewingStatus, ProcessMode, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {getRemainingSecondsFromStatus, shouldCountdownLocally, tickRemainingSeconds} from './productionCountdown';

const status = (mode: ProcessMode, remainingTime: number): BrewingStatus => ({
    elapsedTime: 0,
    currentTime: 0,
    process: {state: ProcessState.ACTIVE},
    currentStep: {mode, duration: 10, elapsedTime: 10 - remainingTime, remainingTime},
    temperature: {},
    hardware: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {}
});

describe('production countdown', () => {
    it('runs only during TIMER_RUNNING and not during HEATING', () => {
        expect(shouldCountdownLocally(status(ProcessMode.TIMER_RUNNING, 5))).toBe(true);
        expect(shouldCountdownLocally(status(ProcessMode.HEATING, 5))).toBe(false);
    });

    it('does not drop below zero and synchronizes new backend values', () => {
        expect(tickRemainingSeconds(0)).toBe(0);
        expect(getRemainingSecondsFromStatus(status(ProcessMode.TIMER_RUNNING, 7))).toBe(7);
        expect(getRemainingSecondsFromStatus({...status(ProcessMode.TIMER_RUNNING, 7), process: {state: ProcessState.FINISHED}})).toBe(0);
    });
});
