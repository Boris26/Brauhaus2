import {of} from 'rxjs';
import {toArray} from 'rxjs/operators';
import {FermentationActions, FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationRepository} from '../repositorys/FermentationRepository';
import {assignDeviceEpic, bubbleActivityBounds, completeFermentationActionEpic, createMeasurementEpic, gatewayMessageAction, loadBubbleActivityEpic, refreshFermentationAfterGatewayDataEpic, refreshFermentationAfterGatewayStatusEpic, skipFermentationActionEpic, unassignDeviceEpic, updateDeviceDisplayNameEpic} from './fermentationEpics';
import {BeerActions} from '../actions/actions';
import {beerDataReducer, initialBeerState} from '../reducers/beerReducer';

jest.mock('../repositorys/FermentationRepository', () => ({FermentationRepository: {
  createMeasurement: jest.fn(), completeAction: jest.fn(), skipAction: jest.fn(), assignDevice: jest.fn(), unassignDevice: jest.fn(), updateDeviceDisplayName: jest.fn(), getBubbleActivity: jest.fn(),
}}));
const repository = FermentationRepository as jest.Mocked<typeof FermentationRepository>;

const gatewayState = (loadedIds: string[] = [], bubbleRange?: '6h' | '24h' | '7d' | 'all') => ({value: {
  fermentationReducer: {
    byBrewId: Object.fromEntries(loadedIds.map(id => [id, {measurements: [], actions: [], devices: [], sensorMeasurements: []}])),
    bubbleActivityByBrewId: bubbleRange ? {'brew-a': {activity: [], loading: false, selectedRange: bubbleRange}} : {},
  },
  applicationReducer: {},
}} as any);

it('maps gateway data invalidations to the dedicated Redux action', () => {
  expect(gatewayMessageAction({type: 'FERMENTATION_DATA_CHANGED', beerId: 'brew-a', change: 'STATE'}))
    .toEqual(FermentationActions.gatewayDataChanged('brew-a', 'STATE'));
});

it('maps sensor runtime directly without creating a REST invalidation', () => {
  const action = gatewayMessageAction({type: 'FERMENTATION_SENSOR_RUNTIME_CHANGED', deviceUid: 'sensor-a', measurementState: 'RUNNING', updatedAt: '2026-09-14T10:00:00Z'});
  expect(action).toEqual(FermentationActions.gatewaySensorRuntimeChanged('sensor-a', 'RUNNING', '2026-09-14T10:00:00Z'));
  expect(action.type).not.toBe(FermentationActionTypes.GATEWAY_DATA_CHANGED);
  expect(action.type).not.toBe(FermentationActionTypes.LOAD);
});

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

it('updates the display name and reloads the canonical beer aggregate', done => {
  repository.updateDeviceDisplayName.mockResolvedValue({deviceUid: 'sensor', deviceName: 'FERM-1', displayName: 'Garage'});
  updateDeviceDisplayNameEpic(of(FermentationActions.updateDeviceDisplayName('sensor', 'brew-a', 'Garage'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(repository.updateDeviceDisplayName).toHaveBeenCalledWith('sensor', 'Garage');
    expect(actions).toEqual([FermentationActions.updateDeviceDisplayNameSuccess('sensor', 'brew-a'), FermentationActions.load('brew-a')]);
    done();
  });
});

it('reports a friendly display-name failure without reloading', done => {
  repository.updateDeviceDisplayName.mockRejectedValueOnce(new Error('HTTP 500'));
  updateDeviceDisplayNameEpic(of(FermentationActions.updateDeviceDisplayName('sensor', 'brew-a', null))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions).toEqual([FermentationActions.updateDeviceDisplayNameFailure('sensor', 'brew-a', 'Sensor-Alias konnte nicht gespeichert werden.')]);
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

it('reloads exactly the assigned beer when the gateway supplies its beerId', done => {
  refreshFermentationAfterGatewayStatusEpic(
    of(FermentationActions.gatewaySensorStatusChanged({deviceUid: 'sensor', status: 'ASSIGNED', beerId: 'brew-b', updatedAt: '2026-09-13T10:00:00Z'})),
    gatewayState(['brew-a', 'brew-b']),
  ).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions).toEqual([FermentationActions.load('brew-b')]);
    done();
  });
});

it('does not reload another fermentation aggregate for an unloaded assigned beer', done => {
  refreshFermentationAfterGatewayStatusEpic(
    of(FermentationActions.gatewaySensorStatusChanged({deviceUid: 'sensor', status: 'ASSIGNED', beerId: 'brew-b', updatedAt: '2026-09-13T10:00:00Z'})),
    gatewayState(['brew-a']),
  ).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions).toEqual([]);
    done();
  });
});

it('refreshes finished beers for STATE and additionally reloads loaded fermentation details', done => {
  refreshFermentationAfterGatewayDataEpic(
    of(FermentationActions.gatewayDataChanged('brew-a', 'STATE')),
    gatewayState(['brew-a']),
  ).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions).toEqual([BeerActions.getFinishedBeers(true), FermentationActions.load('brew-a')]);
    done();
  });
});

it('refreshes finished beers but not unrelated fermentation details for unloaded STATE events', done => {
  refreshFermentationAfterGatewayDataEpic(
    of(FermentationActions.gatewayDataChanged('brew-b', 'STATE')),
    gatewayState(['brew-a']),
  ).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions).toEqual([BeerActions.getFinishedBeers(true)]);
    done();
  });
});

it('reloads loaded measurements and the selected bubble activity range through REST actions', done => {
  const measurementActions: any[] = [];
  refreshFermentationAfterGatewayDataEpic(of(FermentationActions.gatewayDataChanged('brew-a', 'MEASUREMENT')), gatewayState(['brew-a']))
    .subscribe((action: any) => measurementActions.push(action));
  refreshFermentationAfterGatewayDataEpic(of(FermentationActions.gatewayDataChanged('brew-a', 'BUBBLE_ACTIVITY')), gatewayState(['brew-a'], '6h'))
    .pipe(toArray()).subscribe((actions: any[]) => {
      expect(measurementActions).toEqual([FermentationActions.load('brew-a')]);
      expect(actions).toEqual([FermentationActions.loadBubbleActivity('brew-a', '6h')]);
      done();
    });
});

it('makes the canonical WAITING_FOR_FERMENTATION to FERMENTATION response visible without a reload', () => {
  const waiting = {id: 'brew-a', name: 'Test', state: 'WAITING_FOR_FERMENTATION'} as any;
  const fermenting = {...waiting, state: 'FERMENTATION'};
  const refreshing = beerDataReducer({...initialBeerState, finishedBrews: [waiting]}, BeerActions.getFinishedBeers(true));
  const refreshed = beerDataReducer(refreshing, BeerActions.getFinishedBeersSuccess([fermenting]));
  expect(refreshed.finishedBrews?.[0].state).toBe('FERMENTATION');
});
