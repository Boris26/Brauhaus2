import {ofType} from 'redux-observable';
import {EMPTY, from, Observable, of} from 'rxjs';
import {catchError, exhaustMap, groupBy, map, mergeMap, switchMap} from 'rxjs/operators';
import {FermentationActions, FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationRepository} from '../repositorys/FermentationRepository';
import {FermentationGatewayWebSocketController, FermentationGatewayMessage} from '../utils/FermentationGatewayWebSocketController';
import {RootState} from '../reducers/rootReducer';
import {Views} from '../enums/eViews';
import {getFinishedBeerIdFromPath} from '../utils/viewRoutes';
import {BubbleActivityRange} from '../model/Fermentation';

let gatewayController: FermentationGatewayWebSocketController | null = null;

export const loadFermentationEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.LOAD),
  groupBy((action: any) => action.payload.brewId),
  mergeMap((group$: any) => group$.pipe(switchMap((action: any) =>
    from(FermentationRepository.getDetails(action.payload.brewId)).pipe(
      map(details => FermentationActions.loadSuccess(action.payload.brewId, details)),
      catchError(error => of(FermentationActions.loadFailure(action.payload.brewId, error.message)))
    )
  )))
);

export const createMeasurementEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.CREATE_MEASUREMENT),
  groupBy((action: any) => action.payload.measurement.finishedBeerId),
  mergeMap((group$: any) => group$.pipe(exhaustMap((action: any) => {
    const brewId = action.payload.measurement.finishedBeerId;
    return from(FermentationRepository.createMeasurement(action.payload.measurement)).pipe(
      mergeMap(() => of(FermentationActions.createMeasurementSuccess(brewId), FermentationActions.load(brewId))),
      catchError(error => of(FermentationActions.createMeasurementFailure(brewId, error.message)))
    );
  })))
);

export const completeFermentationActionEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.COMPLETE_ACTION),
  groupBy((action: any) => `${action.payload.brewId}/${action.payload.actionId}`),
  mergeMap((group$: any) => group$.pipe(exhaustMap((action: any) =>
    from(FermentationRepository.completeAction(action.payload.brewId, action.payload.actionId)).pipe(
      mergeMap(() => of(FermentationActions.completeActionSuccess(action.payload.brewId, action.payload.actionId), FermentationActions.load(action.payload.brewId))),
      catchError(error => of(FermentationActions.completeActionFailure(action.payload.brewId, action.payload.actionId, error.message)))
    )
  )))
);

export const skipFermentationActionEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.SKIP_ACTION),
  groupBy((action: any) => `${action.payload.brewId}/${action.payload.actionId}`),
  mergeMap((group$: any) => group$.pipe(exhaustMap((action: any) =>
    from(FermentationRepository.skipAction(action.payload.brewId, action.payload.actionId)).pipe(
      mergeMap(() => of(FermentationActions.skipActionSuccess(action.payload.brewId, action.payload.actionId), FermentationActions.load(action.payload.brewId))),
      catchError(error => of(FermentationActions.skipActionFailure(action.payload.brewId, action.payload.actionId, error.message)))
    )
  )))
);

export const assignDeviceEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.ASSIGN_DEVICE),
  groupBy((action: any) => action.payload.deviceId),
  mergeMap((group$: any) => group$.pipe(exhaustMap((action: any) =>
    from(FermentationRepository.assignDevice(action.payload.deviceId, action.payload.brewId)).pipe(
      mergeMap(() => of(FermentationActions.assignDeviceSuccess(action.payload.deviceId, action.payload.brewId), FermentationActions.load(action.payload.brewId))),
      catchError(error => of(FermentationActions.assignDeviceFailure(action.payload.deviceId, action.payload.brewId, error.message)))
    )
  )))
);

const gatewayMessageAction = (message: FermentationGatewayMessage) => message.type === 'FERMENTATION_GATEWAY_SNAPSHOT'
  ? FermentationActions.gatewaySnapshotReceived(message.sensors)
  : FermentationActions.gatewaySensorStatusChanged(message.sensor);

export const fermentationGatewayWebSocketEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.GATEWAY_CONNECT, FermentationActionTypes.GATEWAY_DISCONNECT),
  switchMap((action: any) => {
    if (action.type === FermentationActionTypes.GATEWAY_DISCONNECT) {
      gatewayController?.disconnect();
      gatewayController = null;
      return EMPTY;
    }
    return new Observable<any>(observer => {
      gatewayController ??= new FermentationGatewayWebSocketController(
        message => observer.next(gatewayMessageAction(message)),
        connected => observer.next(FermentationActions.gatewayConnectionChanged(connected)),
      );
      gatewayController.connect();
      return () => {
        gatewayController?.disconnect();
        gatewayController = null;
      };
    });
  }),
);

/** Refresh only the already visible fermentation aggregate; the gateway never becomes its data source. */
export const refreshFermentationAfterGatewayStatusEpic = (action$: any, state$: {value: RootState}) => action$.pipe(
  ofType(FermentationActionTypes.GATEWAY_SENSOR_STATUS_CHANGED),
  mergeMap((action: any) => {
    if (!['REGISTERED', 'ASSIGNED', 'UNASSIGNED', 'DISCONNECTED'].includes(action.payload.sensor.status)) return EMPTY;
    const state = state$.value;
    const loadedIds = Object.keys(state.fermentationReducer.byBrewId);
    const pathId = state.applicationReducer.view === Views.MEASUREMENT_DATA && typeof window !== 'undefined'
      ? getFinishedBeerIdFromPath(window.location.pathname)
      : undefined;
    const brewId = pathId && loadedIds.includes(pathId) ? pathId : loadedIds.length === 1 ? loadedIds[0] : undefined;
    return brewId ? of(FermentationActions.load(brewId)) : EMPTY;
  }),
);

export const bubbleActivityBounds = (range: BubbleActivityRange, now = new Date()): {from?: string; to?: string} => {
  if (range === 'all') return {};
  const hours = range === '6h' ? 6 : range === '24h' ? 24 : 7 * 24;
  return {from: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(), to: now.toISOString()};
};

export const loadBubbleActivityEpic = (action$: any) => action$.pipe(
  ofType(FermentationActionTypes.LOAD_BUBBLE_ACTIVITY),
  groupBy((action: any) => action.payload.brewId),
  mergeMap((group$: any) => group$.pipe(switchMap((action: any) => {
    const {brewId, range} = action.payload;
    const bounds = bubbleActivityBounds(range);
    return from(FermentationRepository.getBubbleActivity(brewId, bounds.from, bounds.to)).pipe(
      map(activity => FermentationActions.loadBubbleActivitySuccess(brewId, range, activity)),
      catchError(error => of(FermentationActions.loadBubbleActivityFailure(brewId, range, error.message)))
    );
  })))
);

export const fermentationEpics = [loadFermentationEpic, createMeasurementEpic, completeFermentationActionEpic, skipFermentationActionEpic, assignDeviceEpic, fermentationGatewayWebSocketEpic, refreshFermentationAfterGatewayStatusEpic, loadBubbleActivityEpic];
