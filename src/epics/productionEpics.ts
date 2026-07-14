import { ofType } from 'redux-observable';
import {from, of, interval, EMPTY, filter, takeWhile, startWith, Observable} from 'rxjs';
import { catchError, exhaustMap, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { ProductionActions } from '../actions/actions';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import { dataCollector } from '../utils/DataCollector/dataCollector';
import { WebSocketController } from '../utils/WebSocketController';
import {BaseURL} from "../global";
import {isProcessAborted, isProcessFinished, isProcessInError} from "../utils/brewingStatus/selectors";
import {BackendAvailable} from "../reducers/productionReducer";
import {BrewingStatus} from "../model/brewingStatus.types";
import {debugMetrics} from "../utils/debugMetrics";

const BREWING_STATUS_POLL_INTERVAL = 1000;
export const BREWING_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_FILLING_MAX_DURATION = 30 * 60 * 1000;
const WS_URL = (typeof BaseURL !== 'undefined' ? BaseURL : '').replace(/^http/, 'ws');
let wsController: WebSocketController | null = null;

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
            const startedAt = Date.now();
            return interval(1000).pipe(
              startWith(0),
              exhaustMap(() => {
                if (Date.now() - startedAt >= WATER_FILLING_MAX_DURATION) {
                  return of(ProductionActions.waterFillingFailure('Water filling timed out'));
                }
                return from(ProductionRepository.getWaterStatus(WATER_STATUS_REQUEST_TIMEOUT, true)).pipe(
                  map((status) => ProductionActions.setWaterStatus(status)),
                  catchError((error) => of(ProductionActions.waterFillingFailure(error)))
                );
              }),
              takeWhile((actionResult) => actionResult.type !== ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS, true),
              takeWhile((actionResult) => actionResult.type !== ProductionActions.ActionTypes.SET_WATER_STATUS || actionResult.payload.waterStatus.openClose === true, true)
            );
          } else {
            return of(ProductionActions.waterFillingFailure('fillWaterAutomatic failed'));
          }
        }),
        catchError((error) => of(ProductionActions.waterFillingFailure(error)))
      )
    )
  );

const createBrewingStatusPolling$ = (action$: any) =>
  interval(BREWING_STATUS_POLL_INTERVAL).pipe(
    startWith(0),
    exhaustMap(() => {
      debugMetrics.statusRequestStarted();
      return from(ProductionRepository.getBrewingStatus(BREWING_STATUS_REQUEST_TIMEOUT)).pipe(
        map((aStatusResult) => {
          debugMetrics.statusRequestCompleted();
          return aStatusResult;
        }),
        catchError(() => {
          debugMetrics.statusRequestFailed();
          return of(null);
        })
      );
    }),
    filter((status): status is { available: BackendAvailable; brewingStatus: BrewingStatus | undefined } => status !== null),
    takeWhile(({ brewingStatus }) => !(brewingStatus && (isProcessFinished(brewingStatus) || isProcessAborted(brewingStatus) || isProcessInError(brewingStatus))), true),
    switchMap(({ available, brewingStatus }) => {
      if (available?.isBackenAvailable && brewingStatus !== undefined) {
        // Store BrewingStatus in the data collector
        dataCollector.setBrewingStatus(brewingStatus);
        return [
          ProductionActions.setBrewingStatus(brewingStatus),
        ];
      } else {
        return [ProductionActions.isBackenAvailable(available)];
      }
    }),
    takeUntil(action$.pipe(ofType(ProductionActions.ActionTypes.STOP_POLLING))),
    catchError((error) => of({ type: 'NO_OP' }))
  );

export const startPollingEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.START_POLLING),
    switchMap(() => createBrewingStatusPolling$(action$))
  );

export const sendBrewingDataEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.SEND_BREWING_DATA),
    switchMap((action: any) =>
      from(ProductionRepository.sendBrewingData(action.payload.brewingData)).pipe(
        switchMap((sendResult) => {
          if (sendResult) {
            // Start the brewing process
            return from(ProductionRepository.startBrewing()).pipe(
              switchMap((startResult) => startResult ? createBrewingStatusPolling$(action$) : of(ProductionActions.stopPolling()))
            );
          } else {
            return of(ProductionActions.stopPolling());
          }
        }),
        catchError((error) => of(ProductionActions.stopPolling()))
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

export const productionWebSocketEpic$ = (action$: any) =>
  action$.pipe(
    ofType(
      ProductionActions.ActionTypes.WEBSOCKET_CONNECT,
      ProductionActions.ActionTypes.WEBSOCKET_DISCONNECT
    ),
    switchMap((action: any) => {
      if (action.type === ProductionActions.ActionTypes.WEBSOCKET_CONNECT) {
        if (!wsController) {
          wsController = new WebSocketController(WS_URL);
        }
        return new Observable((observer) => {
          wsController!.onMessage((event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.event === 'overheat') {
                observer.next(ProductionActions.overheatReceived(msg.data));
              }
            } catch (e) {
              // ignore invalid messages
            }
          });
          wsController!.connect();
          return () => {
            wsController?.disconnect();
            wsController = null;
          };
        });
      } else if (action.type === ProductionActions.ActionTypes.WEBSOCKET_DISCONNECT) {
        wsController?.disconnect();
        wsController = null;
        return EMPTY;
      }
      return EMPTY;
    })
  );

export const productionEpics = [
  getTemperaturesEpic$,
  toggleAgitatorEpic$,
  setAgitatorSpeedEpic$,
  sendBrewingDataEpic$,
  startPollingEpic$,
  startWaterFillingEpic$,
  confirmEpic$,
  checkIsBackendAvailableEpic$,
  nextProcedureStepEpic$,
  productionWebSocketEpic$
];
