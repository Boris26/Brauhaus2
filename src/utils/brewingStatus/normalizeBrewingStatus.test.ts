import {normalizeBrewingStatus} from './normalizeBrewingStatus';
import {ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

describe('normalizeBrewingStatus', () => {
  it('uses structured payload', () => {
    const s = normalizeBrewingStatus({process:{state:'ACTIVE'}, currentStep:{phase:'RAST', mode:'TIMER_RUNNING', remainingTime:12}, waiting:{waitingFor:'NONE', canConfirm:false}, temperature:{current:60,target:63}});
    expect(s.process.state).toBe(ProcessState.ACTIVE);
    expect(s.currentStep.phase).toBe(ProcessPhase.RAST);
    expect(s.currentStep.mode).toBe(ProcessMode.TIMER_RUNNING);
  });

  it('falls back to legacy payload', () => {
    const s = normalizeBrewingStatus({Type:'COOKING', HeatUpStatus:true, WaitingStatus:false, Temperature:50, TargetTemperature:100, AgitatorStatus:true});
    expect(s.currentStep.phase).toBe(ProcessPhase.COOKING);
    expect(s.currentStep.mode).toBe(ProcessMode.HEATING);
    expect(s.temperature.current).toBe(50);
    expect(s.hardware.agitator).toBe('ON');
  });

  it('structured values win over legacy values', () => {
    const s = normalizeBrewingStatus({process:{state:'FINISHED'}, currentStep:{phase:'RAST', mode:'HOLDING'}, Type:'COOKING', HeatUpStatus:true, waiting:{waitingFor:'IODINE_TEST', canConfirm:true}});
    expect(s.currentStep.phase).toBe(ProcessPhase.RAST);
    expect(s.currentStep.mode).toBe(ProcessMode.HOLDING);
    expect(s.waiting.waitingFor).toBe(WaitingFor.IODINE_TEST);
  });

  it('preserves unknown waitingFor values for central confirmation mapping warnings', () => {
    const s = normalizeBrewingStatus({waiting:{waitingFor:'future_confirmation', canConfirm:true}});
    expect(s.waiting.waitingFor).toBe('FUTURE_CONFIRMATION');
  });
});
