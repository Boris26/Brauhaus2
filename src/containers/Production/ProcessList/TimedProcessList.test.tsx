import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {TimedProcessList} from './TimedProcessList';
import {parseSnapshot} from '../../../utils/brewingStatus/snapshot';
import {acceptTimeAnchor} from '../../../utils/brewingStatus/streams';

jest.mock('./ProcessList', () => ({ProcessList: ({remainingSeconds}: {remainingSeconds: number}) => <span>{remainingSeconds}</span>}));

it('desktop uses the same monotonic projection and cannot dispatch a step command when time reaches zero', () => {
  jest.useFakeTimers();
  const next = jest.fn();
  const status = parseSnapshot({schemaVersion: 1, controllerEpoch: 'epoch', processInstanceId: 'run', revision: 1, stateRevision: 1,
    telemetryRevision: 1, timeAnchorSequence: 1,
    timeAnchor: {sequence: 1, stepId: null, stepIndex: 1, phase: 'RAST', mode: 'TIMER_RUNNING', elapsedTime: 10,
      stepElapsedTime: 10, remainingTime: 2, duration: 12, running: true, stepRunning: true, sampleAgeSeconds: 0},
    status: {elapsedTime: 10, process: {state: 'ACTIVE'}, currentStep: {index: 1, phase: 'RAST', mode: 'TIMER_RUNNING', duration: 12},
      temperature: {}, waiting: {waitingFor: 'NONE', canConfirm: false}, error: {}}})!;
  const view = render(<TimedProcessList {...({displayMode: 'current', brewingStatus: status, onConfirmWaiting: next} as any)}
    timeAnchor={acceptTimeAnchor(status.snapshotMetadata!)} />);
  expect(screen.getByText('2')).toBeInTheDocument();
  act(() => {jest.advanceTimersByTime(5000);});
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(next).not.toHaveBeenCalled();
  expect(status.process.state).toBe('ACTIVE');
  view.unmount(); jest.useRealTimers();
});
