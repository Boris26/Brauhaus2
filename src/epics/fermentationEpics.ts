import {ofType} from 'redux-observable';
import {from, of} from 'rxjs';
import {catchError, exhaustMap, groupBy, map, mergeMap, switchMap} from 'rxjs/operators';
import {FermentationActions, FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationRepository} from '../repositorys/FermentationRepository';

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
  groupBy((action: any) => action.payload.actionId),
  mergeMap((group$: any) => group$.pipe(exhaustMap((action: any) =>
    from(FermentationRepository.completeAction(action.payload.actionId)).pipe(
      mergeMap(() => of(FermentationActions.completeActionSuccess(action.payload.brewId, action.payload.actionId), FermentationActions.load(action.payload.brewId))),
      catchError(error => of(FermentationActions.completeActionFailure(action.payload.brewId, action.payload.actionId, error.message)))
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

export const fermentationEpics = [loadFermentationEpic, createMeasurementEpic, completeFermentationActionEpic, assignDeviceEpic];
