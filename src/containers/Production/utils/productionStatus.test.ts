import {getAgitatorActive, getHeaterDisplayStatus} from './productionStatus';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';

const status = (heaterEnabled = true): BrewingStatus => ({
  elapsedTime: 0, currentTime: 0, process: {state: 'ACTIVE' as any}, currentStep: {phase: 'RAST' as any, mode: 'HEATING' as any},
  temperature: {}, hardware: {heater: 'OFF', agitator: 'OFF'}, heating: {heaterEnabled}, waiting: {waitingFor: 'NONE', canConfirm: false}, error: {}, alarms: []
});
const realtime = (running: boolean): RealtimeControllerState => ({heatingRunning: running, alarms: [], alarmsReceived: false, agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'RUNNING', actualOutputOn: running, speedPercent: 50, runningMinutes: 1, breakMinutes: 1}});

describe('realtime production selectors', () => {
  it('uses one heater decision table and marks disconnected snapshots unknown', () => {
    expect(getHeaterDisplayStatus(status(), realtime(true), true)).toBe('active');
    expect(getHeaterDisplayStatus(status(), realtime(false), true)).toBe('ready');
    expect(getHeaterDisplayStatus(status(false), realtime(true), true)).toBe('blocked');
    expect(getHeaterDisplayStatus(status(), realtime(true), false)).toBe('unknown');
  });
  it('uses actualOutputOn and treats it as stale after disconnect', () => {
    expect(getAgitatorActive(status(), realtime(true), true)).toBe(true);
    expect(getAgitatorActive(status(), realtime(false), true)).toBe(false);
    expect(getAgitatorActive(status(), realtime(true), false)).toBeUndefined();
  });
});
