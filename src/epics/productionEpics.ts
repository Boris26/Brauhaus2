import { ofType } from 'redux-observable';
import {from, of, interval, EMPTY, filter, takeWhile, startWith, Observable, defer} from 'rxjs';
import { catchError, exhaustMap, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { ApplicationActions, BeerActions, ProductionActions } from '../actions/actions';
import {WarningActions} from '../actions/warningActions';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import { dataCollector } from '../utils/DataCollector/dataCollector';
import { WebSocketController } from '../utils/WebSocketController';
import {BaseURL} from "../global";
import {isProcessAborted, isProcessFinished, isProcessInError} from "../utils/brewingStatus/selectors";
import productionReducer, {BackendAvailable} from "../reducers/productionReducer";
import {mergeTelemetry, parseSnapshot, PROCESS_REALTIME_ENABLED} from "../utils/brewingStatus/snapshot";
import {requestBrewingStatus$} from '../utils/brewingStatus/request';
import {BrewingStatus} from "../model/brewingStatus.types";
import {debugMetrics} from "../utils/debugMetrics";
import {BeerRepository} from "../repositorys/BeerRepository";
import {BeerRecipeScaler} from "../utils/BeerScaler/ScalingBeerRecipe";
import {BrewSession} from "../model/BrewSession";
import {Beer} from "../model/Beer";
import type {RootState} from "../reducers/rootReducer";
import {AgitatorRealtimeState, AlarmRealtimeState, HeatingRunningState, TemperatureSensorRealtimeState} from '../model/RealtimeControllerState';
import {AgitatorSettings} from '../model/AgitatorSettings';
import {WarningRealtimeState} from '../model/Warning';
import {BrewRecoverySnapshot} from '../model/BrewRecovery';
import {mapBeerToBrewingData} from '../utils/productionRecipe';

export const BREWING_STATUS_POLL_INTERVAL = 10_000;
export const BREWING_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_STATUS_REQUEST_TIMEOUT = 8000;
export const WATER_FILLING_MAX_DURATION = 30 * 60 * 1000;
const WS_URL = (typeof BaseURL !== 'undefined' ? BaseURL : '').replace(/^http/, 'ws');
let wsController: WebSocketController | null = null;

export const mapControlSocketEvent = (event: {event: string; data?: unknown}) => {
  switch (event.event) {
    case 'connection-error': return ProductionActions.communicationPhase('Reconnecting');
    case 'brewing-status-changed': {
      if (!PROCESS_REALTIME_ENABLED) return undefined;
      const status = parseSnapshot(event.data);
      return status ? ProductionActions.setBrewingStatus(status, 'socket') : {type: ProductionActions.ActionTypes.STATUS_STREAM_STALE};
    }
    case 'brewing-status-heartbeat':
      return PROCESS_REALTIME_ENABLED ? {type: ProductionActions.ActionTypes.STATUS_HEARTBEAT, payload: event.data} : undefined;
    case 'overheat':
      return ProductionActions.overheatReceived(event.data);
    case 'brew-session-running':
      return ProductionActions.brewSessionRunningReceived();
    case 'brew-recovery-state-changed': {
      const recovery = event.data as Partial<BrewRecoverySnapshot> | undefined;
      if (recovery?.available === false && recovery.recovery === null) {
        return ProductionActions.brewRecoveryStateChanged({available: false, recovery: null});
      }
      if (recovery?.available === true && recovery.recovery && typeof recovery.recovery === 'object') {
        return ProductionActions.brewRecoveryStateChanged(recovery as BrewRecoverySnapshot);
      }
      return ProductionActions.brewRecoveryStateChanged({
        available: true,
        recovery: null,
        error: 'Der Controller hat ungültige Recovery-Daten gesendet.',
      });
    }
    case 'connection-status':
      const connection = event.data as {connected: boolean; socketId?: string};
      return ProductionActions.socketConnectionChanged(connection.connected, connection.socketId);
    case 'heating-running-changed': return ProductionActions.heatingRunningChanged(event.data as HeatingRunningState);
    case 'agitator-state-changed': return ProductionActions.agitatorStateChanged(event.data as AgitatorRealtimeState);
    case 'alarm-state-changed': return ProductionActions.alarmStateChanged(event.data as AlarmRealtimeState);
    case 'warning-state-changed': return WarningActions.warningStateChanged(event.data as WarningRealtimeState);
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



const stopAndFailWater$ = (error: unknown) =>
  from(ProductionRepository.stopWaterFilling()).pipe(
    switchMap((stopped) => stopped
      ? from(ProductionRepository.getWaterStatus(WATER_STATUS_REQUEST_TIMEOUT, true)).pipe(
          map(status => ProductionActions.waterFillingFailure(error, status)))
      : of(ProductionActions.waterFillingFailure('Wasser-Stop nicht bestätigt. Bitte erneut stoppen.'))),
    catchError(stopError => of(ProductionActions.waterFillingFailure(stopError)))
  );

export const startWaterFillingEpic$ = (action$: any, state$?: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.START_WATER_FILLING),
    filter(() => !state$?.value.productionReducer.isWaterStopping),
    exhaustMap((action: ProductionActions.StartWaterFilling) => defer(() => {
      let observedOpen = false;
      const startedAt = Date.now();
      const start = action.payload.mode
        ? ProductionRepository.fillWaterAutomatic(action.payload.liters, action.payload.mode)
        : ProductionRepository.fillWaterAutomatic(action.payload.liters);
      return from(start).pipe(
        switchMap((result) => result ? interval(1000).pipe(
          startWith(0),
          exhaustMap(() => {
            if (Date.now() - startedAt >= WATER_FILLING_MAX_DURATION) {
              return stopAndFailWater$('Maximale Wasserfülldauer überschritten');
            }
            return from(ProductionRepository.getWaterStatus(WATER_STATUS_REQUEST_TIMEOUT, true)).pipe(
              switchMap(status => {
                observedOpen ||= status.openClose;
                // Legacy controllers have no STARTING state. Give their worker
                // time to publish open instead of completing on its idle value.
                if (!status.state && !observedOpen && !status.openClose
                    && status.filledLiters + 0.0001 < action.payload.liters
                    && Date.now() - startedAt >= 10_000) {
                  return stopAndFailWater$('Wasserfüllung wurde nicht gestartet');
                }
                return of(ProductionActions.setWaterStatus(status));
              }),
              catchError(error => stopAndFailWater$(error))
            );
          }),
          takeWhile((result) => {
            if (result.type === ProductionActions.ActionTypes.START_WATER_FILLING_SUCCESS) return false;
            const status = result.payload.waterStatus;
            if (status.state) return !['COMPLETED', 'STOPPED', 'ERROR'].includes(status.state);
            return status.openClose || (!observedOpen && status.filledLiters + 0.0001 < action.payload.liters);
          }, true)
        ) : of(ProductionActions.waterFillingFailure('Wasserfüllung konnte nicht gestartet werden'))),
        catchError(error => stopAndFailWater$(error)),
        takeUntil(action$.pipe(ofType(ProductionActions.ActionTypes.STOP_WATER_FILLING)))
      );
    }))
  );

export const stopWaterFillingEpic$ = (action$: any) => action$.pipe(
  ofType(ProductionActions.ActionTypes.STOP_WATER_FILLING),
  exhaustMap(() => from(ProductionRepository.stopWaterFilling()).pipe(
    switchMap(success => success
      ? from(ProductionRepository.getWaterStatus(WATER_STATUS_REQUEST_TIMEOUT, true)).pipe(
          map(status => ProductionActions.stopWaterFillingFinished(!status.openClose && status.state !== 'STARTING', status,
            status.openClose ? 'Wasser-Stop nicht bestätigt' : undefined)))
      : of(ProductionActions.stopWaterFillingFinished(false, undefined, 'Wasser-Stop nicht bestätigt. Bitte erneut stoppen.'))),
    catchError(error => of(ProductionActions.stopWaterFillingFinished(false, undefined, String(error))))
  ))
);

const createBrewingStatusPolling$ = (action$: any, state$?: {value: RootState}) =>
  interval(BREWING_STATUS_POLL_INTERVAL).pipe(
    startWith(0),
    exhaustMap(() => {
      debugMetrics.statusRequestStarted();
      const generation = state$?.value.productionReducer.communication.generation;
      return (state$ ? requestBrewingStatus$(BREWING_STATUS_REQUEST_TIMEOUT)
        : from(ProductionRepository.getBrewingStatus(BREWING_STATUS_REQUEST_TIMEOUT))).pipe(
        map((aStatusResult) => {
          debugMetrics.statusRequestCompleted();
          return {...aStatusResult, generation};
        }),
        catchError(() => {
          debugMetrics.statusRequestFailed();
          return of(null);
        })
      );
    }),
    filter((status): status is { available: BackendAvailable; brewingStatus: BrewingStatus | undefined; generation: number | undefined } => status !== null),
    filter(({brewingStatus, generation}) => {
      if (!state$) return true;
      const current = state$.value.productionReducer;
      if (generation !== current.communication.generation) return false;
      if (!brewingStatus) return true;
      const candidate = productionReducer(current, ProductionActions.setBrewingStatus(brewingStatus, 'sync', generation));
      // Duplicates remain observable for terminal shutdown, but never overwrite.
      return candidate.brewingStatus === brewingStatus || (!!brewingStatus.snapshotMetadata
        && generation === current.communication.generation
        && current.brewingStatus?.snapshotMetadata?.controllerEpoch === brewingStatus.snapshotMetadata.controllerEpoch
        && current.brewingStatus?.snapshotMetadata?.revision === brewingStatus.snapshotMetadata.revision
        && current.brewingStatus?.snapshotMetadata?.processInstanceId === brewingStatus.snapshotMetadata.processInstanceId);
    }),
    takeWhile(({ brewingStatus }) => !(brewingStatus && (isProcessFinished(brewingStatus) || isProcessAborted(brewingStatus) || isProcessInError(brewingStatus))), true),
    switchMap(({ available, brewingStatus, generation }) => {
      if (available?.isBackenAvailable && brewingStatus !== undefined) {
        // Store BrewingStatus in the data collector
        if (!state$) dataCollector.setBrewingStatus(brewingStatus);
        return [
          ProductionActions.setBrewingStatus(brewingStatus, state$ ? 'sync' : 'http', generation),
        ];
      } else {
        return [ProductionActions.isBackenAvailable(available)];
      }
    }),
    takeUntil(action$.pipe(ofType(ProductionActions.ActionTypes.STOP_POLLING))),
    catchError((error) => of({ type: 'NO_OP' }))
  );

export const startPollingEpic$ = (action$: any, state$?: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.START_POLLING),
    // START_POLLING is a process lifecycle signal. Ignore repeats while the
    // current process poll is active instead of restarting or duplicating it.
    filter(() => !state$ || !PROCESS_REALTIME_ENABLED || state$.value.productionReducer.communication.phase !== 'Synchronized'),
    exhaustMap(() => createBrewingStatusPolling$(action$, state$))
  );

const isValidBrewSession = (session: unknown): session is BrewSession =>
  typeof session === 'object' && session !== null
  && typeof (session as BrewSession).beerId === 'string' && (session as BrewSession).beerId.length > 0
  && Number.isFinite((session as BrewSession).plannedVolume) && (session as BrewSession).plannedVolume > 0
  && Number.isFinite((session as BrewSession).plannedBrewhouseEfficiency)
  && (session as BrewSession).plannedBrewhouseEfficiency > 0 && (session as BrewSession).plannedBrewhouseEfficiency <= 100;

const errorMessage = (error: unknown, fallback: string): string => {
  const responseMessage = (error as any)?.response?.data?.error?.message
    ?? (error as any)?.response?.data?.error
    ?? (error as any)?.response?.data?.message
    ?? (error as any)?.response?.data?.detail;
  return typeof responseMessage === 'string' && responseMessage.trim()
    ? responseMessage
    : error instanceof Error ? error.message : fallback;
};

const resolveBrewSessionBeer$ = (session: BrewSession, state$: {value: RootState}) => {
  const loadedBeers = state$.value.beerDataReducer.beers;
  const beerRequest = loadedBeers?.some((beer) => beer.id === session.beerId)
    ? of({beers: loadedBeers, fetched: false})
    : from(BeerRepository.getBeers()).pipe(map((beers) => ({beers, fetched: true})));
  return beerRequest.pipe(map(({beers, fetched}: {beers: Beer[]; fetched: boolean}) => ({
    beer: beers.find((beer) => beer.id === session.beerId), beers, fetched,
  })));
};

export const restoreBrewSessionEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.BREW_SESSION_RUNNING_RECEIVED),
    exhaustMap(() => from(ProductionRepository.getBrewSession()).pipe(
      switchMap((session: BrewSession) => {
        if (!isValidBrewSession(session)) {
          return of(ApplicationActions.openErrorDialog(true, 'BrewSession konnte nicht übernommen werden', 'Die Skalierungsdaten der laufenden BrewSession sind ungültig.'));
        }

        return resolveBrewSessionBeer$(session, state$).pipe(mergeMap(({beer: baseBeer, beers, fetched}) => {
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
            // Versioned process identity owns history reset centrally. A normal
            // socket session has no polling flag, including after reconnect.
            if (!state$.value.productionReducer.brewingStatus?.snapshotMetadata) dataCollector.reset();
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

export const resumeBrewRecoveryEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.RESUME_BREW_RECOVERY),
    filter(() => !state$.value.productionReducer.brewRecovery.discardPending),
    exhaustMap(() => {
      const requestGeneration = state$.value.productionReducer.brewRecovery.requestGeneration;
      const envelope = state$.value.productionReducer.brewRecovery.recovery;
      if (!state$.value.productionReducer.brewRecovery.available || !envelope || !isValidBrewSession(envelope.brewSession)) {
        return of(ProductionActions.resumeBrewRecoveryFailure('Die gespeicherten Recovery- oder Skalierungsdaten sind ungültig.', requestGeneration));
      }
      return resolveBrewSessionBeer$(envelope.brewSession, state$).pipe(
        switchMap(({beer, beers, fetched}) => {
          if (!beer) return of(ProductionActions.resumeBrewRecoveryFailure(`Das Bier des unterbrochenen Brauvorgangs (${envelope.brewSession.beerId}) wurde nicht gefunden.`, requestGeneration));
          const reconstructed = BeerRecipeScaler.scale({
            beer, volume: envelope.brewSession.plannedVolume,
            brewhouseEfficiency: envelope.brewSession.plannedBrewhouseEfficiency,
          });
          const mapped = mapBeerToBrewingData(reconstructed);
          if (!mapped.ok || !mapped.brewingData) {
            return of(ProductionActions.resumeBrewRecoveryFailure(mapped.error ?? 'Das Rezept konnte nicht für die Fortsetzung aufbereitet werden.', requestGeneration));
          }
          return from(ProductionRepository.resumeBrewRecovery(mapped.brewingData)).pipe(
            mergeMap(() => from([
              ...(fetched ? [BeerActions.getBeersSuccess(beers)] : []),
              ProductionActions.resumeBrewRecoverySuccess(requestGeneration),
            ])),
            catchError((error) => of(ProductionActions.resumeBrewRecoveryFailure(errorMessage(error, 'Der Brauvorgang konnte nicht fortgesetzt werden.'), requestGeneration)))
          );
        }),
        catchError((error) => of(ProductionActions.resumeBrewRecoveryFailure(errorMessage(error, 'Das Bier konnte nicht geladen werden.'), requestGeneration)))
      );
    })
  );

export const discardBrewRecoveryEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.DISCARD_BREW_RECOVERY),
    filter(() => !state$.value.productionReducer.brewRecovery.resumePending),
    exhaustMap(() => {
      const requestGeneration = state$.value.productionReducer.brewRecovery.requestGeneration;
      return from(ProductionRepository.discardBrewRecovery()).pipe(
        map(() => ProductionActions.discardBrewRecoverySuccess(requestGeneration)),
        catchError((error) => of(ProductionActions.discardBrewRecoveryFailure(errorMessage(error, 'Der gespeicherte Brauvorgang konnte nicht verworfen werden.'), requestGeneration)))
      );
    })
  );

export const sendBrewingDataEpic$ = (action$: any, state$: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.SEND_BREWING_DATA),
    // Recipe transfer plus StartBrewing form one non-idempotent command
    // lifecycle; a repeated dispatch must not start a second backend request.
    exhaustMap((action: any) => defer(() => {
      const generation = state$.value.productionReducer.communication.generation;
      return from(ProductionRepository.sendBrewingData(action.payload.brewingData)).pipe(
        switchMap((sendResult) => {
          if (sendResult) {
            // Start the brewing process
            const socketId = state$.value.productionReducer.socketConnection.connected
              ? state$.value.productionReducer.socketConnection.socketId
              : undefined;
            return from(ProductionRepository.startBrewing(socketId)).pipe(
              mergeMap((brewingStatus) => brewingStatus
                ? from([
                    ProductionActions.setBrewingStatus(brewingStatus, 'http', generation),
                    ProductionActions.startPolling(),
                  ])
                : of(ProductionActions.brewingStartFailure('Der Controller konnte den Brauvorgang nicht starten.')))
            );
          } else {
            return of(ProductionActions.brewingStartFailure('Das Rezept konnte nicht an den Controller übertragen werden.'));
          }
        }),
        catchError((error) => of(ProductionActions.brewingStartFailure(error instanceof Error ? error.message : 'Braustart fehlgeschlagen.')))
      );
    }))
  );

export const confirmEpic$ = (action$: any, state$?: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.CONFIRM),
    filter(() => !state$ || state$.value.productionReducer.confirmation.phase === 'CommandPending'),
    exhaustMap((action: any) => defer(() => {
      const generation = state$?.value.productionReducer.communication.generation;
      const expected = state$?.value.productionReducer.brewingStatus?.snapshotMetadata;
      return from(expected
        ? ProductionRepository.confirm(action.payload.confirmState, expected)
        : ProductionRepository.confirm(action.payload.confirmState)).pipe(
        mergeMap((brewingStatus) => from([
          ProductionActions.setBrewingStatus(brewingStatus, 'http', generation),
          ...(state$ ? [{type: ProductionActions.ActionTypes.CONFIRM_ACCEPTED}] : []),
          ProductionActions.confirmSuccess(),
        ])),
        catchError((error) => {
          if (state$?.value.productionReducer.confirmation.phase === 'Completed') return of(ProductionActions.confirmSuccess());
          const message = errorMessage(error, 'Bestätigung fehlgeschlagen');
          return from([
            ProductionActions.confirmFailure(message),
            ProductionActions.requestStatusSync(),
            ApplicationActions.openErrorDialog(true, 'Bestätigung fehlgeschlagen', message),
          ]);
        })
      );
    }))
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

export const nextProcedureStepEpic$ = (action$: any, state$?: {value: RootState}) =>
  action$.pipe(
    ofType(ProductionActions.ActionTypes.NEXT_PROCEDURE_STEP),
    exhaustMap(() => defer(() => {
      const generation = state$?.value.productionReducer.communication.generation;
      return from(ProductionRepository.nextProcedureStep()).pipe(
        mergeMap((brewingStatus) => brewingStatus
          ? from([
              ProductionActions.setBrewingStatus(brewingStatus, 'http', generation),
              ProductionActions.nextProcedureStepSuccess(),
            ])
          : of(ProductionActions.nextProcedureStepFailure('Fehler beim nächsten Schritt'))
        ),
        catchError((error) => of(ProductionActions.nextProcedureStepFailure(error)))
      );
    }))
  );

export const productionWebSocketEpic$ = (action$: any, state$?: {value: RootState}) =>
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
            const generation = state$?.value.productionReducer.communication.generation;
            if (event.event === 'brewing-telemetry' && PROCESS_REALTIME_ENABLED && state$) {
              const status = mergeTelemetry(event.data, state$.value.productionReducer.brewingStatus);
              if (status) observer.next(ProductionActions.setBrewingStatus(status, 'telemetry', generation));
              return;
            }
            const mapped = mapControlSocketEvent(event);
            if (mapped) {
              if (mapped.type === ProductionActions.ActionTypes.SET_BREWING_STATUS) {
                const statusAction = mapped as ProductionActions.SetBrewingStatus;
                observer.next(ProductionActions.setBrewingStatus(statusAction.payload.brewingStatus, statusAction.payload.source, generation));
              } else observer.next(mapped);
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
  resumeBrewRecoveryEpic$,
  discardBrewRecoveryEpic$,
  startPollingEpic$,
  startWaterFillingEpic$,
  stopWaterFillingEpic$,
  confirmEpic$,
  checkIsBackendAvailableEpic$,
  nextProcedureStepEpic$,
  productionWebSocketEpic$
];
