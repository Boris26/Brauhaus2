import {ProcessTimeProjection} from './ProcessTimeProjection';
import {parseSnapshot} from './snapshot';
import {acceptTimeAnchor, TimeAnchorState} from './streams';
import {clock, modernStatus} from '../../testUtils/processTimeline';

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

it('projects a separate cumulative clock across heating, local timer reset and confirmation waiting', () => {
  const projection = new ProcessTimeProjection();
  const active = modernStatus();
  const globalAnchor = {...anchor(0), stepId: null, phase: 'RAST', mode: 'HEATING', duration: 1200,
    timelineId: clock().timelineId, processElapsedSeconds: 400, processRunning: true, running: true, stepRunning: false};
  projection.synchronize(active, globalAnchor, 0);
  expect(projection.project(active, 10_000)).toMatchObject({processElapsedSeconds: 410, stepElapsedSeconds: 0});
  const timed = {...active, currentStep: {...active.currentStep, mode: 'TIMER_RUNNING' as any}};
  projection.synchronize(timed, {...globalAnchor, mode: 'TIMER_RUNNING', processElapsedSeconds: 410,
    elapsedTime: 0, stepElapsedTime: 0, stepRunning: true, receivedAtMs: 10_000}, 10_000);
  expect(projection.project(timed, 20_000)).toMatchObject({processElapsedSeconds: 420, stepElapsedSeconds: 10, remainingSeconds: 1190});
  const waiting = {...active, currentStep: {...active.currentStep, mode: 'WAITING' as any}};
  projection.synchronize(waiting, {...globalAnchor, mode: 'WAITING', processElapsedSeconds: 420,
    running: false, stepRunning: false, receivedAtMs: 20_000}, 20_000);
  expect(projection.project(waiting, 50_000)).toMatchObject({processElapsedSeconds: 450, stepElapsedSeconds: 0});
});

it('freezes explicitly paused cumulative clocks and resumes at recovered offsets', () => {
  const projection = new ProcessTimeProjection();
  const active = modernStatus();
  const paused = {...anchor(), stepId: null, mode: 'HEATING', duration: 1200,
    timelineId: clock().timelineId, processElapsedSeconds: 900, processRunning: false, running: false, stepRunning: false};
  projection.synchronize(active, paused, 0);
  expect(projection.project(active, 100_000).processElapsedSeconds).toBe(900);
  projection.synchronize(active, {...paused, processRunning: true, receivedAtMs: 100_000}, 100_000);
  expect(projection.project(active, 105_000).processElapsedSeconds).toBe(905);
});

it('never falls back to local elapsedTime when a cumulative clock exists without a time anchor', () => {
  const projection = new ProcessTimeProjection();
  const active = modernStatus({elapsedTime: 0, timeline: clock({processElapsedSeconds: 600})});
  projection.synchronize(active, undefined, 1000);
  expect(projection.project(active, 6000).processElapsedSeconds).toBe(605);
});

it('repairs standby during long waits using a newer source age at the same anchor sequence', () => {
  const waiting = modernStatus({currentStep: {...modernStatus().currentStep, mode: 'WAITING' as any}});
  const source = {...anchor(0), stepId: null, mode: 'WAITING', duration: 1200, sequence: 5,
    timelineId: clock().timelineId, processElapsedSeconds: 600, processRunning: true, running: false, stepRunning: false};
  const spy = jest.spyOn(performance, 'now').mockReturnValue(0);
  const metadata = {...waiting.snapshotMetadata!, timeAnchorSequence: 5, timeAnchor: source};
  const first = acceptTimeAnchor(metadata, undefined, waiting)!;
  spy.mockReturnValue(10_000); // OS suspended the browser clock for 110 seconds.
  const repaired = acceptTimeAnchor({...metadata, timeAnchor: {...source, sampleAgeSeconds: 120}}, first, waiting)!;
  expect(repaired).not.toBe(first);
  const projection = new ProcessTimeProjection();
  projection.synchronize(waiting, repaired, 10_000);
  expect(projection.project(waiting, 10_000).processElapsedSeconds).toBe(720);
  expect(acceptTimeAnchor({...metadata, timeAnchor: {...source, sampleAgeSeconds: 1}}, repaired, waiting)).toBe(repaired);
  spy.mockRestore();
});
