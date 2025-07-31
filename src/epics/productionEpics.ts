import { ofType } from 'redux-observable';
import {from, of, interval, EMPTY, timer, filter, takeWhile, startWith} from 'rxjs';
import { catchError, map, mergeMap, switchMap, takeUntil, delay, retryWhen, take, toArray } from 'rxjs/operators';
import { ProductionActions } from '../actions/actions';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import {BrewingStatus} from "../model/BrewingStatus";
import { delayWhen } from 'rxjs/operators';
import { dataCollector } from '../utils/DataCollector/dataCollector';

const BREWING_STATUS_POLL_INTERVAL = 1000;

export const getTemperaturesEpic$ = (action$: any) =>
    action$.pipe(
    ofType(ProductionActions.ActionTypes.GET_TEMPERATURES),
    mergeMap(() =>
      from(ProductionRepository.getTemperature()).pipe(
        map((temperature) => ProductionActions.setTemperature(temperature)),
          catchError((error) => of({ type: 'NO_OP' }))
      )
    )
  );

export const toggleAgitatorEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.TOGGLE_AGITATOR),
    mergeMap((action: any) =>
      from(ProductionRepository.toggleAgitator(action.payload.agitatorState)).pipe(
        map((result) => ProductionActions.toggleAgitatorSuccess(result)),
          catchError((error) => of({ type: 'NO_OP' }))
      )
    )
  );

export const setAgitatorSpeedEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.SET_AGITATOR_SPEED),
    mergeMap((action: any) =>
      from(ProductionRepository.setAgitatorSpeed(action.payload.agitatorSpeed)).pipe(
        map(() => ({ type: 'NO_OP' })),
        catchError((error) => of({ type: 'NO_OP' }))
      )
    )
  );



export const startWaterFillingEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.START_WATER_FILLING),
    switchMap((action: any) =>
      from(ProductionRepository.fillWaterAutomatic(action.payload.liters)).pipe(
        switchMap((result) => {
          if (result) {
            return interval(1000).pipe(
              switchMap(() => from(ProductionRepository.getWaterStatus())),
              map((status: any) => ProductionActions.setWaterStatus(status)),
              takeUntil(
                from(ProductionRepository.getWaterStatus()).pipe(
                  map((status: any) => status && status.openClose !== true)
                )
              ),
              catchError((error) => of(ProductionActions.waterFillingFailure(error)))
            );
          } else {
            return of(ProductionActions.waterFillingFailure('fillWaterAutomatic failed'));
          }
        }),
        catchError((error) => of(ProductionActions.waterFillingFailure(error)))
      )
    )
  );

export const sendBrewingDataEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.SEND_BREWING_DATA),
    switchMap((action: any) =>
      from(ProductionRepository.sendBrewingData(action.payload.brewingData)).pipe(
        switchMap((sendResult) => {
          if (sendResult) {
            // Starte den Brauprozess
            return from(ProductionRepository.startBrewing()).pipe(
              switchMap((startResult) => {
                if (startResult) {
                  return interval(BREWING_STATUS_POLL_INTERVAL).pipe(
                    switchMap(() => from(ProductionRepository.getBrewingStatus())),
                    takeWhile(({ brewingStatus }) => brewingStatus?.StatusText !== "BREWING_FINISHED", true),
                    switchMap(({ available, brewingStatus }) => {
                      if (available?.isBackenAvailable && brewingStatus !== undefined) {
                        // BrewingStatus im DataCollector speichern
                        dataCollector.setBrewingStatus(brewingStatus);
                        return [
                          ProductionActions.setBrewingStatus(brewingStatus),
                        ];
                      } else {
                        return [ProductionActions.isBackenAvailable(available)];
                      }
                    }),
                    catchError((error) => of({ type: 'NO_OP' }))
                  );
                } else {
                  return of({ type: 'NO_OP' });
                }
              })
            );
          } else {
            return of({ type: 'NO_OP' });
          }
        }),
        catchError((error) => of({ type: 'NO_OP' }))
      )
    )
  );

export const confirmEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.CONFIRM),
    mergeMap((action: any) =>
      from(ProductionRepository.confirm(action.payload.confirmState)).pipe(
        map(() => ({ type: 'NO_OP' })),
        catchError((error) => of({ type: 'NO_OP' }))
      )
    )
  );

export const checkIsBackendAvailableEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.CHECK_IS_BACKEND_AVAILABLE),
    switchMap(() =>
      interval(20000).pipe(
        startWith(0),
        switchMap(() =>
          from(ProductionRepository.checkIsBackendAvailable()).pipe(
            map((isAvailable: boolean) => ProductionActions.isBackenAvailable({ isBackenAvailable: isAvailable, statusText: "" })),
            catchError(() => of(ProductionActions.isBackenAvailable({ isBackenAvailable: false, statusText: "Fehler beim Backend-Check" })))
          )
        )
      )
    )
  );

export const nextProcedureStepEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.NEXT_PROCEDURE_STEP),
    switchMap(() =>
      from(ProductionRepository.nextProcedureStep()).pipe(
        map((result) =>
          result
            ? ProductionActions.nextProcedureStepSuccess()
            : ProductionActions.nextProcedureStepFailure('Fehler beim nächsten Schritt')
        ),
        catchError((error) => of(ProductionActions.nextProcedureStepFailure(error)))
      )
    )
  );

export const productionEpics = [
  getTemperaturesEpic$,
  toggleAgitatorEpic$,
  setAgitatorSpeedEpic$,
  sendBrewingDataEpic$,
  startWaterFillingEpic$,
  confirmEpic$,
  checkIsBackendAvailableEpic$,
  nextProcedureStepEpic$
];
