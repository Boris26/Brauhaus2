import {getAgitatorActive, getHeatingActive} from './productionStatus';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';

const realtime = (running: boolean): RealtimeControllerState => ({heatingRunning: running, alarms: [], alarmsReceived: false, agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'RUNNING', actualOutputOn: running, speedPercent: 50, runningMinutes: 1, breakMinutes: 1}});

describe('realtime production selectors', () => {
  it('uses the socket heater snapshot and marks disconnected snapshots unknown', () => {
    expect(getHeatingActive(realtime(true), true)).toBe(true);
    expect(getHeatingActive(realtime(false), true)).toBe(false);
    expect(getHeatingActive(realtime(true), false)).toBeUndefined();
  });
  it('uses actualOutputOn and treats it as stale after disconnect', () => {
    expect(getAgitatorActive(realtime(true), true)).toBe(true);
    expect(getAgitatorActive(realtime(false), true)).toBe(false);
    expect(getAgitatorActive(realtime(true), false)).toBeUndefined();
  });
});
