import {EMPTY, Observable, concat, interval, of, timer} from 'rxjs';
import {catchError, exhaustMap, filter, map, startWith, switchMap, takeUntil, takeWhile} from 'rxjs/operators';
import {ofType} from 'redux-observable';
import {ApplicationActions, ProductionActions as Actions} from '../actions/actions';
import {RootState} from '../reducers/rootReducer';
import {ProductionRepository} from '../repositorys/ProductionRepository';
import {monotonicNow} from '../utils/brewingStatus/streams';
import {waterActive} from '../utils/brewingStatus/waterSnapshot';
import {stopAndFailWater$, WATER_FILLING_MAX_DURATION, WATER_STATUS_REQUEST_TIMEOUT} from './productionEpics';

type State = {value: RootState};
const sync = () => ({type: Actions.ActionTypes.WATER_RESYNC_REQUEST});
const requestWater$ = () => new Observable<Awaited<ReturnType<typeof ProductionRepository.getWaterStatus>>>(observer => {
  const controller = new AbortController();
  ProductionRepository.getWaterStatus(WATER_STATUS_REQUEST_TIMEOUT, true, controller.signal).then(
    value => {observer.next(value); observer.complete();}, error => observer.error(error));
  return () => controller.abort();
});

/** Initial/repair reads and 1 Hz active-operation fallback. Never sends a command on disconnect. */
export const waterSynchronizeEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.WATER_RESYNC_REQUEST),
  switchMap(() => {
    const generation = state$.value.productionReducer.communication.generation;
    return interval(1000).pipe(
      startWith(0),
      takeWhile((_, index) => index === 0 || (!state$.value.productionReducer.waterCommunication.synchronized
        && (waterActive(state$.value.productionReducer.waterStatus) || !!state$.value.productionReducer.waterCommand?.active))),
      exhaustMap(() => requestWater$().pipe(
        filter(() => generation === state$.value.productionReducer.communication.generation),
        map(status => status.snapshotMetadata
          ? {type: Actions.ActionTypes.WATER_SNAPSHOT, payload: {source: 'sync', generation,
              data: {...status, ...status.snapshotMetadata, fillId: status.fillId ?? null}}}
          : Actions.setWaterStatus(status)),
        catchError(error => {
          if (generation !== state$.value.productionReducer.communication.generation) return EMPTY;
          // Preserve HTTP-read failure stopping for a locally initiated fill.
          // Other observing clients do not stop a fill for their connection loss.
          const failure = of({type: Actions.ActionTypes.WATER_READ_FAILED});
          return state$.value.productionReducer.waterCommand?.active
            ? concat(failure, stopAndFailWater$(error)) : failure;
        }),
      )),
      takeUntil(action$.pipe(filter((action: any) =>
        (action.type === Actions.ActionTypes.WATER_SNAPSHOT || action.type === Actions.ActionTypes.WATER_HEARTBEAT)
          && state$.value.productionReducer.waterCommunication.synchronized))),
      takeUntil(action$.pipe(ofType(Actions.ActionTypes.SOCKET_CONNECTION_CHANGED))),
    );
  }),
);

export const waterLifecycleEpic$ = (action$: any, state$: State) => action$.pipe(
  filter((action: any) => [Actions.ActionTypes.SOCKET_CONNECTION_CHANGED, Actions.ActionTypes.WEBSOCKET_DISCONNECT, ApplicationActions.ActionTypes.APPLICATION_START].includes(action.type)),
  switchMap((action: any) => action.type === ApplicationActions.ActionTypes.APPLICATION_START || !action.payload?.connected
    ? of(sync())
    : timer(2000).pipe(filter(() => !state$.value.productionReducer.waterCommunication.synchronized), map(sync))),
);

export const waterRecoveryEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.WATER_STREAM_STALE, Actions.ActionTypes.WATER_SNAPSHOT,
    Actions.ActionTypes.STATUS_STREAM_STALE, Actions.ActionTypes.IS_BACKEND_AVAILABLE),
  filter((action: any) => action.type === Actions.ActionTypes.WATER_STREAM_STALE
    || (action.type === Actions.ActionTypes.WATER_SNAPSHOT && state$.value.productionReducer.waterCommunication.needsSync)
    || (action.type === Actions.ActionTypes.STATUS_STREAM_STALE && waterActive(state$.value.productionReducer.waterStatus))
    || (action.type === Actions.ActionTypes.IS_BACKEND_AVAILABLE && action.payload.isBackenAvailable.isBackenAvailable
      && !state$.value.productionReducer.waterCommunication.synchronized)),
  map(sync),
);

export const waterWatchdogEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(ApplicationActions.ActionTypes.APPLICATION_START),
  switchMap(() => interval(1000).pipe(
    filter(() => {
      const state = state$.value.productionReducer;
      return waterActive(state.waterStatus) && state.waterCommunication.synchronized
        && monotonicNow() - state.waterCommunication.lastMessageAt > 4000;
    }),
    map(() => ({type: Actions.ActionTypes.WATER_STREAM_STALE})),
  )),
);

/** Retain the maximum-duration safeguard for a fill initiated by this client. */
export const waterCommandSafetyEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.WATER_START_ACCEPTED),
  switchMap(() => timer(0, 1000).pipe(
    takeWhile(() => !!state$.value.productionReducer.waterCommand?.active),
    map((): string | undefined => {
      const state = state$.value.productionReducer;
      const age = monotonicNow() - state.waterCommand!.startedAt;
      if (age >= WATER_FILLING_MAX_DURATION) return 'Maximale Wasserfülldauer überschritten';
      if (!state.waterStatus.state && !state.waterCommand?.observedOpen && !state.waterStatus.openClose
        && state.waterStatus.filledLiters + 0.0001 < state.liters && age >= 10000) return 'Wasserfüllung wurde nicht gestartet';
      return undefined;
    }),
    filter((message): message is string => !!message),
    exhaustMap(message => stopAndFailWater$(message)),
  )),
);

export const waterCommunicationEpics = [waterSynchronizeEpic$, waterLifecycleEpic$, waterRecoveryEpic$, waterWatchdogEpic$, waterCommandSafetyEpic$];
