import {normalizeBrewingStatus} from './normalizeBrewingStatus';
import {ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

const contract = {
    elapsedTime: 299.362060546875,
    process: {state: 'ACTIVE'},
    currentStep: {index: 2, count: 7, phase: 'RAST', mode: 'TIMER_RUNNING', name: 'Rast 1', duration: 900, elapsedTime: 299.362060546875, remainingTime: 600.637939453125},
    temperature: {current: 60, target: 55},
    waiting: {waitingFor: 'NONE', canConfirm: false},
    heating: {followsDecoction: false},
    error: {code: null, details: null},
};

describe('normalizeBrewingStatus', () => {
    it('normalizes the complete 2.0 process-only contract', () => {
        const status = normalizeBrewingStatus(contract);
        expect(status).toEqual({...contract, process: {state: ProcessState.ACTIVE}, currentStep: {...contract.currentStep, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}});
        expect(status).not.toHaveProperty('currentTime');
        expect(status).not.toHaveProperty('hardware');
        expect(status).not.toHaveProperty('agitator');
        expect(status).not.toHaveProperty('alarms');
        expect(status.temperature).toEqual({current: 60, target: 55});
        expect(status.heating).toEqual({followsDecoction: false});
    });

    it('keeps independent legacy process compatibility', () => {
        const status = normalizeBrewingStatus({Type: 'COOKING', HeatUpStatus: true, Temperature: 50, TargetTemperature: 100});
        expect(status.currentStep).toEqual(expect.objectContaining({phase: ProcessPhase.COOKING, mode: ProcessMode.HEATING}));
        expect(status.temperature).toEqual({current: 50, target: 100});
    });

    it('preserves unknown waiting states for central confirmation handling', () => {
        expect(normalizeBrewingStatus({waiting: {waitingFor: 'future_confirmation', canConfirm: true}}).waiting.waitingFor).toBe('FUTURE_CONFIRMATION');
    });
});
