import {of} from 'rxjs';
import {toArray} from 'rxjs/operators';
import {FermentationActions, FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationRepository} from '../repositorys/FermentationRepository';
import {assignDeviceEpic, bubbleActivityBounds, completeFermentationActionEpic, createMeasurementEpic, loadBubbleActivityEpic, skipFermentationActionEpic, unassignDeviceEpic} from './fermentationEpics';

jest.mock('../repositorys/FermentationRepository', () => ({FermentationRepository: {
  createMeasurement: jest.fn(), completeAction: jest.fn(), skipAction: jest.fn(), assignDevice: jest.fn(), unassignDevice: jest.fn(), getBubbleActivity: jest.fn(),
}}));
const repository = FermentationRepository as jest.Mocked<typeof FermentationRepository>;

it('builds filtered server ranges while all remains unfiltered', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');
  expect(bubbleActivityBounds('6h', now)).toEqual({from: '2026-09-11T06:00:00.000Z', to: now.toISOString()});
  expect(bubbleActivityBounds('24h', now)).toEqual({from: '2026-09-10T12:00:00.000Z', to: now.toISOString()});
  expect(bubbleActivityBounds('7d', now)).toEqual({from: '2026-09-04T12:00:00.000Z', to: now.toISOString()});
  expect(bubbleActivityBounds('all', now)).toEqual({});
});

it('loads all bubble activity without from/to', done => {
  repository.getBubbleActivity.mockResolvedValue([]);
  loadBubbleActivityEpic(of(FermentationActions.loadBubbleActivity('brew-a', 'all'))).subscribe((action: any) => {
    expect(repository.getBubbleActivity).toHaveBeenCalledWith('brew-a', undefined, undefined);
    expect(action).toEqual(FermentationActions.loadBubbleActivitySuccess('brew-a', 'all', []));
    done();
  });
});

it('reloads backend due projection after a Plato measurement without completing an action', done => {
  repository.createMeasurement.mockResolvedValue({id: 'm2', finishedBeerId: 'brew-a', measuredAt: '2026-09-05T10:00:00Z', plato: 4.9, source: 'MANUAL'});
  createMeasurementEpic(of(FermentationActions.createMeasurement({finishedBeerId: 'brew-a', measuredAt: '2026-09-05T10:00:00Z', plato: 4.9}))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions.map(action => action.type)).toEqual([
      FermentationActionTypes.CREATE_MEASUREMENT_SUCCESS,
      FermentationActionTypes.LOAD,
    ]);
    expect(actions).not.toContainEqual(expect.objectContaining({type: FermentationActionTypes.COMPLETE_ACTION}));
    done();
  });
});

it('skips by finished beer and action id and reloads backend state', done => {
  repository.skipAction.mockResolvedValue({actionId: 'action-a', sourceType: 'DRY_HOP', status: 'SKIPPED'});
  skipFermentationActionEpic(of(FermentationActions.skipAction('brew-a', 'action-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(repository.skipAction).toHaveBeenCalledWith('brew-a', 'action-a');
    expect(actions.map(action => action.type)).toEqual([FermentationActionTypes.SKIP_ACTION_SUCCESS, FermentationActionTypes.LOAD]);
    done();
  });
});

it('reloads backend completedAt and contactEndsAt after completion', done => {
  repository.completeAction.mockResolvedValue({actionId: 'action-a', status: 'COMPLETED', completedAt: '2026-09-05T10:00:00Z', contactEndsAt: '2026-09-08T10:00:00Z', sourceType: 'DRY_HOP'});
  completeFermentationActionEpic(of(FermentationActions.completeAction('brew-a', 'action-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions.map(action => action.type)).toEqual([FermentationActionTypes.COMPLETE_ACTION_SUCCESS]);
    expect(actions[0].payload.action).toMatchObject({actionId: 'action-a', status: 'COMPLETED', completedAt: '2026-09-05T10:00:00Z'});
    expect(repository.completeAction).toHaveBeenCalledWith('brew-a', 'action-a');
    done();
  });
});

it('assigns through the repository and reloads canonical backend state', done => {
  repository.assignDevice.mockResolvedValue({deviceUid: 'sensor', deviceName: 'Keller'});
  assignDeviceEpic(of(FermentationActions.assignDevice('sensor', 'brew-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(repository.assignDevice).toHaveBeenCalledWith('sensor', 'brew-a');
    expect(actions.map(action => action.type)).toEqual([FermentationActionTypes.ASSIGN_DEVICE_SUCCESS, FermentationActionTypes.LOAD]);
    done();
  });
});

it('unassigns through the repository and reloads canonical backend state', done => {
  repository.unassignDevice.mockResolvedValue(undefined);
  unassignDeviceEpic(of(FermentationActions.unassignDevice('sensor', 'brew-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(repository.unassignDevice).toHaveBeenCalledWith('sensor');
    expect(actions.map(action => action.type)).toEqual([FermentationActionTypes.UNASSIGN_DEVICE_SUCCESS, FermentationActionTypes.LOAD]);
    done();
  });
});

it('returns a scoped assignment failure action', done => {
  repository.assignDevice.mockRejectedValueOnce(new Error('HTTP 409'));
  assignDeviceEpic(of(FermentationActions.assignDevice('sensor', 'brew-a'))).subscribe((result: any) => {
    expect(result).toMatchObject({type: FermentationActionTypes.ASSIGN_DEVICE_FAILURE, payload: {deviceId: 'sensor', brewId: 'brew-a', error: 'HTTP 409'}});
    done();
  });
});

it('returns a scoped unassignment failure action', done => {
  repository.unassignDevice.mockRejectedValueOnce(new Error('HTTP 409'));
  unassignDeviceEpic(of(FermentationActions.unassignDevice('sensor', 'brew-a'))).subscribe((result: any) => {
    expect(result).toMatchObject({type: FermentationActionTypes.UNASSIGN_DEVICE_FAILURE, payload: {deviceId: 'sensor', brewId: 'brew-a', error: 'HTTP 409'}});
    done();
  });
});
