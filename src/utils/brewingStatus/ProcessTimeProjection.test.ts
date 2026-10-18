import {ProcessTimeProjection} from './ProcessTimeProjection';
import {parseSnapshot} from './snapshot';
import {TimeAnchorState} from './streams';

const status = parseSnapshot({schemaVersion: 1, controllerEpoch: 'epoch', processInstanceId: 'run', revision: 1, stateRevision: 1,
  status: {elapsedTime: 10, process: {state: 'ACTIVE'}, currentStep: {index: 1, stepId: 'step', phase: 'RAST', mode: 'TIMER_RUNNING', duration: 100, elapsedTime: 10},
    temperature: {current: 60, target: 65}, waiting: {waitingFor: 'NONE', canConfirm: false}, error: {}}})!;
const anchor = (elapsedTime = 10): TimeAnchorState => ({controllerEpoch: 'epoch', processInstanceId: 'run', stateRevision: 1,
  sequence: 1, stepId: 'step', stepIndex: 1, phase: 'RAST', mode: 'TIMER_RUNNING', elapsedTime, stepElapsedTime: elapsedTime,
  duration: 100, remainingTime: 100 - elapsedTime, running: true, stepRunning: true, sampleAgeSeconds: 0, receivedAtMs: 0});

it('projects suspended callbacks from monotonic differences and never counts ticks', () => {
  const projection = new ProcessTimeProjection();
  projection.synchronize(status, anchor(), 0);
  expect(projection.project(status, 20_000)).toMatchObject({processElapsedSeconds: 30, remainingSeconds: 70});
  expect(projection.project(status, 200_000).remainingSeconds).toBe(0);
});

it('smooths a one-second drift and snaps large corrections', () => {
  const projection = new ProcessTimeProjection();
  projection.synchronize(status, anchor(), 0);
  projection.synchronize(status, {...anchor(21), sequence: 2, receivedAtMs: 10_000}, 10_000);
  expect(projection.project(status, 10_000).processElapsedSeconds).toBe(20);
  expect(projection.project(status, 20_000).processElapsedSeconds).toBe(31);
  projection.synchronize(status, {...anchor(50), sequence: 3, receivedAtMs: 20_000}, 20_000);
  expect(projection.project(status, 20_000).processElapsedSeconds).toBe(50);
});

it('does not use wallclock offsets and restarts projection at a recovered anchor', () => {
  const spy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
  const projection = new ProcessTimeProjection();
  projection.synchronize(status, {...anchor(50), receivedAtMs: 1_000}, 1_000);
  spy.mockReturnValue(0);
  expect(projection.project(status, 6_000).processElapsedSeconds).toBe(55);
  spy.mockRestore();
});
