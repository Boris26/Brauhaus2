import { ofType } from 'redux-observable';
import {from, of, interval, EMPTY, filter, takeWhile, startWith, Observable} from 'rxjs';
import { catchError, exhaustMap, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { ApplicationActions, BeerActions, ProductionActions } from '../actions/actions';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import { dataCollector } from '../utils/DataCollector/dataCollector';
import { WebSocketController } from '../utils/WebSocketController';
import {BaseURL} from "../global";
import {isProcessAborted, isProcessFinished, isProcessInError} from "../utils/brewingStatus/selectors";
import {BackendAvailable} from "../reducers/productionReducer";
import {BrewingStatus} from "../model/brewingStatus.types";
import {debugMetrics} from "../utils/debugMetrics";
import {BeerRepository} from "../repositorys/BeerRepository";
import {BeerRecipeScaler} from "../utils/BeerScaler/ScalingBeerRecipe";
import {BrewSession} from "../model/BrewSession";
import {Beer} from "../model/Beer";
import type {RootState} from "../reducers/rootReducer";
import {AgitatorRealtimeState, AlarmRealtimeState, HeatingRunningState, TemperatureSensorRealtimeState} from '../model/RealtimeControllerState';
import {AgitatorSettings} from '../model/AgitatorSettings';

const BREWING_STATUS_POLL_INTERVAL = 1000;
export const BREWING_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_FILLING_MAX_DURATION = 30 * 60 * 1000;
const WS_URL = (typeof BaseURL !== 'undefined' ? BaseURL : '').replace(/^http/, 'ws');
let wsController: WebSocketController | null = null;

export const mapControlSocketEvent = (event: {event: string; data?: unknown}) => {
  switch (event.event) {
    case 'overheat':
      return ProductionActions.overheatReceived(event.data);
    case 'brew-session-running':
      return ProductionActions.brewSessionRunningReceived();
    case 'connection-status':
      const connection = event.data as {connected: boolean; socketId?: string};
      return ProductionActions.socketConnectionChanged(connection.connected, connection.socketId);
    case 'heating-running-changed': return ProductionActions.heatingRunningChanged(event.data as HeatingRunningState);
    case 'agitator-state-changed': return ProductionActions.agitatorStateChanged(event.data as AgitatorRealtimeState);
    case 'alarm-state-changed': return ProductionActions.alarmStateChanged(event.data as AlarmRealtimeState);
    case 'temperature-sensor-state-changed': return ProductionActions.temperatureSensorStateChanged(event.data as TemperatureSensorRealtimeState);
    case 'agitator-defaults-changed': return ProductionActions.agitatorDefaultsChanged(event.data as AgitatorSettings);
    default:
      return undefined;
  }
};

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
    // Filling is a non-idempotent controller command. Ignore duplicate UI
    // dispatches until the command and its status lifecycle have completed.
    exhaustMap((action: any) =>
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
    // START_POLLING is a process lifecycle signal. Ignore repeats while the
    // current process poll is active instead of restarting or duplicating it.
    exhaustMap(() => createBrewingStatusPolling$(action$))
  );

const isValidBrewSession = (session: BrewSession): boolean =>
  typeof session.beerId === 'string' && session.beerId.length > 0
  && Number.isFinite(session.plannedVolume) && session.plannedVolume > 0
  && Number.isFinite(session.plannedBrewhouseEfficiency)
  && session.plannedBrewhouseEfficiency > 0 && session.plannedBrewhouseEfficiency <= 100;

export const restoreBrewSessionEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.BREW_SESSION_RUNNING_RECEIVED),
    exhaustMap(() => from(ProductionRepository.getBrewSession()).pipe(
      switchMap((session: BrewSession) => {
        if (!isValidBrewSession(session)) {
          return of(ApplicationActions.openErrorDialog(true, 'BrewSession konnte nicht übernommen werden', 'Die Skalierungsdaten der laufenden BrewSession sind ungültig.'));
        }

        const loadedBeers = state$.value.beerDataReducer.beers;
        const beerRequest = loadedBeers?.some((beer) => beer.id === session.beerId)
          ? of({beers: loadedBeers, fetched: false})
          : from(BeerRepository.getBeers()).pipe(map((beers) => ({beers, fetched: true})));

        return beerRequest.pipe(mergeMap(({beers, fetched}: {beers: Beer[]; fetched: boolean}) => {
          const baseBeer = beers.find((beer) => beer.id === session.beerId);
          if (!baseBeer) {
            return of(ApplicationActions.openErrorDialog(true, 'BrewSession konnte nicht übernommen werden', `Das Bier der laufenden BrewSession (${session.beerId}) wurde nicht gefunden.`));
          }

          const reconstructedBeer = BeerRecipeScaler.scale({
            beer: baseBeer,
            volume: session.plannedVolume,
            brewhouseEfficiency: session.plannedBrewhouseEfficiency,
          });
          const actions: any[] = [];
          if (fetched) actions.push(BeerActions.getBeersSuccess(beers));
          actions.push(BeerActions.setSelectedBeer(reconstructedBeer));
          actions.push(BeerActions.setBeerToBrew(reconstructedBeer));
          if (!state$.value.productionReducer.isPollingRunning) {
            // A newly observed controller session must not inherit retained
            // measurements from an earlier session whose save may have failed.
            dataCollector.reset();
            actions.push(ProductionActions.startPolling());
          }
          return from(actions);
        }));
      }),
      catchError((error) => of(ApplicationActions.openErrorDialog(
        true,
        'BrewSession konnte nicht übernommen werden',
        error instanceof Error ? error.message : 'Die laufende BrewSession konnte nicht geladen werden.'
      )))
    ))
  );

export const sendBrewingDataEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.SEND_BREWING_DATA),
    // Recipe transfer plus StartBrewing form one non-idempotent command
    // lifecycle; a repeated dispatch must not start a second backend request.
    exhaustMap((action: any) =>
      from(ProductionRepository.sendBrewingData(action.payload.brewingData)).pipe(
        switchMap((sendResult) => {
          if (sendResult) {
            // Start the brewing process
            const socketId = state$.value.productionReducer.socketConnection.connected
              ? state$.value.productionReducer.socketConnection.socketId
              : undefined;
            return from(ProductionRepository.startBrewing(socketId)).pipe(
              map((startResult) => startResult
                ? ProductionActions.startPolling()
                : ProductionActions.brewingStartFailure('Der Controller konnte den Brauvorgang nicht starten.'))
            );
          } else {
            return of(ProductionActions.brewingStartFailure('Das Rezept konnte nicht an den Controller übertragen werden.'));
          }
        }),
        catchError((error) => of(ProductionActions.brewingStartFailure(error instanceof Error ? error.message : 'Braustart fehlgeschlagen.')))
      )
    )
  );

export const confirmEpic$ = (action$: any) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.CONFIRM),
    exhaustMap((action: any) =>
      from(ProductionRepository.confirm(action.payload.confirmState)).pipe(
        map(() => ProductionActions.confirmSuccess()),
        catchError((error) => {
          const message = error instanceof Error ? error.message : 'Bestätigung fehlgeschlagen';
          return from([
            ProductionActions.confirmFailure(message),
            ApplicationActions.openErrorDialog(true, 'Bestätigung fehlgeschlagen', message),
          ]);
        })
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
    exhaustMap(() =>
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
            const action = mapControlSocketEvent(event);
            if (action) {
              observer.next(action);
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
  restoreBrewSessionEpic$,
  startPollingEpic$,
  startWaterFillingEpic$,
  confirmEpic$,
  checkIsBackendAvailableEpic$,
  nextProcedureStepEpic$,
  productionWebSocketEpic$
];
