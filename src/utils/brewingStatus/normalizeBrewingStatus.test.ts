import {normalizeBrewingStatus} from './normalizeBrewingStatus';
import {AlarmType, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

describe('normalizeBrewingStatus', () => {
    it('preserves optional agitator poll config fields without inventing missing values', () => {
        const legacyPoll = normalizeBrewingStatus({agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'BREAK', actualOutputOn: false}});
        expect(legacyPoll.agitator?.speedPercent).toBeUndefined();
        const extendedPoll = normalizeBrewingStatus({agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 42, runningMinutes: 2, breakMinutes: 7}});
        expect(extendedPoll.agitator).toEqual(expect.objectContaining({speedPercent: 42, runningMinutes: 2, breakMinutes: 7}));
    });
    it('ignores an incomplete agitator runtime payload', () => {
        expect(normalizeBrewingStatus({agitator: {mode: 'AUTOMATIC'}}).agitator).toBeUndefined();
    });
  it('accepts the public DECOCTION runtime phase', () => {
    const s = normalizeBrewingStatus({currentStep: {phase: 'DECOCTION', mode: 'WAITING'}});
    expect(s.currentStep.phase).toBe(ProcessPhase.DECOCTION);
  });
  it('uses structured payload', () => {
    const s = normalizeBrewingStatus({process:{state:'ACTIVE'}, currentStep:{phase:'RAST', mode:'TIMER_RUNNING', remainingTime:12}, heating:{followsDecoction:true, heaterEnabled:false}, waiting:{waitingFor:'DECOCTION_RETURN_CONFIRMATION', canConfirm:true}, temperature:{current:60,target:63}});
    expect(s.process.state).toBe(ProcessState.ACTIVE);
    expect(s.currentStep.phase).toBe(ProcessPhase.RAST);
    expect(s.currentStep.mode).toBe(ProcessMode.TIMER_RUNNING);
    expect(s.heating).toEqual({followsDecoction: true, heaterEnabled: false});
    expect(s.waiting.waitingFor).toBe(WaitingFor.DECOCTION_RETURN_CONFIRMATION);
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

  it('defaults alarms to an empty list for an older backend response', () => {
    expect(normalizeBrewingStatus({process: {}}).alarms).toEqual([]);
  });

  it('transports empty, active, multiple, and future alarm entries', () => {
    expect(normalizeBrewingStatus({alarms: []}).alarms).toEqual([]);

    const alarms = [
      {type: AlarmType.EQUIPMENT_ALARM, active: true},
      {type: 'FUTURE_ALARM', active: false},
    ];
    expect(normalizeBrewingStatus({alarms}).alarms).toEqual(alarms);
  });
});
