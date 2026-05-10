import {getBrewingStatusLabel, getConfirmButtonLabel, shouldShowConfirmButton, shouldShowCountdown} from './selectors';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

const makeStatus = (aPart: Partial<BrewingStatus>): BrewingStatus => ({
  elapsedTime: 0, currentTime: 0,
  process: {state: ProcessState.ACTIVE},
  currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE},
  temperature: {}, hardware: {}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
  ...aPart
});

describe('brewing selectors', () => {
  it('process priority labels', () => {
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.ERROR}}))).toContain('Fehler');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.ABORTED}}))).toContain('abgebrochen');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.FINISHED}}))).toContain('abgeschlossen');
    expect(getBrewingStatusLabel(makeStatus({process:{state:ProcessState.IDLE}}))).toContain('Bereit');
  });

  it('waiting and confirm handling', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.IODINE_TEST, canConfirm:true}});
    expect(shouldShowConfirmButton(s)).toBe(true);
    expect(getConfirmButtonLabel(s)).toBe('Iodine bestätigen');
  });

  it('handles decoction waiting label', () => {
    const s = makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.WAITING}, waiting:{waitingFor:WaitingFor.DECOCTION_CONFIRMATION, canConfirm:true}});
    expect(getConfirmButtonLabel(s)).toBe('Dickmaische bestätigen');
    expect(getBrewingStatusLabel(s)).toContain('Dickmaische');
  });

  it('countdown shown only for timer running', () => {
    expect(shouldShowCountdown(makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.TIMER_RUNNING}}))).toBe(true);
    expect(shouldShowCountdown(makeStatus({currentStep:{phase:ProcessPhase.RAST, mode:ProcessMode.HEATING}}))).toBe(false);
  });
});
