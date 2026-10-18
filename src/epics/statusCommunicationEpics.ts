import {EMPTY, from, interval, of, timer} from 'rxjs';
import {catchError, filter, map, mergeMap, switchMap, takeUntil} from 'rxjs/operators';
import {ofType} from 'redux-observable';
import {ApplicationActions, ProductionActions as Actions} from '../actions/actions';
import {dataCollector} from '../utils/DataCollector/dataCollector';
import {PROCESS_REALTIME_ENABLED} from '../utils/brewingStatus/snapshot';
import {isProcessAborted, isProcessFinished, isProcessInError} from '../utils/brewingStatus/selectors';
import type {RootState} from '../reducers/rootReducer';
import {requestBrewingStatus$} from '../utils/brewingStatus/request';

type State = {value: RootState};
const terminal = (state: State) => {
  const status = state.value.productionReducer.brewingStatus;
  return isProcessFinished(status) || isProcessAborted(status) || isProcessInError(status);
};
const fallback = (state: State) => terminal(state)
  ? [Actions.requestStatusSync()]
  : [Actions.startPolling()];

/** Reads only. switchMap suppresses outdated sync results; generation guards
 * also protect against a connection change while the HTTP promise is pending. */
export const synchronizeStatusEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.STATUS_RESYNC_REQUEST),
  switchMap(() => {
    const generation = state$.value.productionReducer.communication.generation;
    return requestBrewingStatus$(8000).pipe(
      filter(() => generation === state$.value.productionReducer.communication.generation),
      map(({available, brewingStatus}) => brewingStatus
        ? Actions.setBrewingStatus(brewingStatus, 'sync', generation)
        : Actions.isBackenAvailable(available)),
      catchError(() => EMPTY),
    );
  }),
);

export const statusSocketLifecycleEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.SOCKET_CONNECTION_CHANGED),
  switchMap((action: Actions.SocketConnectionChanged) => action.payload.connected
    ? timer(2000).pipe(
        filter(() => state$.value.productionReducer.communication.phase !== 'Synchronized'),
        mergeMap(() => from(fallback(state$))),
      )
    : from(fallback(state$))),
);

export const statusAvailabilityEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.IS_BACKEND_AVAILABLE),
  filter((action: Actions.IsBackendAvailable) => action.payload.isBackenAvailable.isBackenAvailable
    && state$.value.productionReducer.communication.phase !== 'Synchronized'),
  mergeMap(() => from(fallback(state$))),
);

export const statusRecoveryEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.STATUS_STREAM_STALE, Actions.ActionTypes.COMMUNICATION_PHASE),
  filter(() => state$.value.productionReducer.communication.phase !== 'Synchronized'),
  mergeMap(() => from(fallback(state$))),
);

export const statusWatchdogEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(ApplicationActions.ActionTypes.APPLICATION_START),
  switchMap(() => interval(5000).pipe(
    filter(() => PROCESS_REALTIME_ENABLED && state$.value.productionReducer.socketConnection.connected
      && state$.value.productionReducer.communication.phase === 'Synchronized'
      && Date.now() - state$.value.productionReducer.communication.lastMessageAt > 15000),
    map(() => ({type: Actions.ActionTypes.STATUS_STREAM_STALE})),
  )),
);

export const statusHeartbeatEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.STATUS_HEARTBEAT),
  mergeMap((action: any) => {
    if (!PROCESS_REALTIME_ENABLED) return EMPTY;
    const state = state$.value.productionReducer;
    const current = state.brewingStatus?.snapshotMetadata;
    const heartbeat = action.payload;
    if (!current || typeof heartbeat?.controllerEpoch !== 'string' || !Number.isSafeInteger(heartbeat.revision)
      || state.communication.retiredEpochs.includes(heartbeat.controllerEpoch)) return EMPTY;
    if (heartbeat.controllerEpoch !== current.controllerEpoch || heartbeat.revision > current.revision) {
      return of(Actions.requestStatusSync());
    }
    return state.communication.phase === 'Synchronized' ? of(Actions.stopPolling()) : EMPTY;
  }),
);

/** Side effects run only after the reducer accepted the exact status object. */
export const acceptedStatusEffectsEpic$ = (action$: any, state$: State) => {
  let collectedProcess: string | undefined;
  let collectedStatus: unknown;
  return action$.pipe(
    ofType(Actions.ActionTypes.SET_BREWING_STATUS),
    mergeMap((action: Actions.SetBrewingStatus) => {
      const state = state$.value.productionReducer;
      const status = action.payload.brewingStatus;
      if (status && state.brewingStatus === status && status !== collectedStatus) {
        const metadata = status.snapshotMetadata;
        const process = metadata ? `${metadata.controllerEpoch}/${metadata.processInstanceId}` : undefined;
        if (collectedProcess && process && process !== collectedProcess) dataCollector.reset();
        collectedProcess = process;
        collectedStatus = status;
        dataCollector.setBrewingStatus(status);
      }
      const incoming = status?.snapshotMetadata;
      const current = state.brewingStatus?.snapshotMetadata;
      if (incoming && current && incoming.controllerEpoch !== current.controllerEpoch
        && !state.communication.retiredEpochs.includes(incoming.controllerEpoch)) return of(Actions.requestStatusSync());
      if (state.communication.phase === 'Synchronized' || terminal(state$)) return of(Actions.stopPolling());
      if (status === state.brewingStatus && status?.process.state === 'ACTIVE' && !state.isPollingRunning) return of(Actions.startPolling());
      return EMPTY;
    }),
  );
};

export const confirmationSyncEpic$ = (action$: any, state$: State) => action$.pipe(
  ofType(Actions.ActionTypes.CONFIRM),
  switchMap(() => timer(5000).pipe(
    takeUntil(action$.pipe(filter(() => !state$.value.productionReducer.isConfirmPending))),
    filter(() => state$.value.productionReducer.isConfirmPending),
    mergeMap(() => from([{type: Actions.ActionTypes.CONFIRM_SYNC_WAIT}, Actions.requestStatusSync()])),
  )),
);

export const statusCommunicationEpics = [synchronizeStatusEpic$, statusSocketLifecycleEpic$, statusAvailabilityEpic$,
  statusRecoveryEpic$, statusWatchdogEpic$, statusHeartbeatEpic$, acceptedStatusEffectsEpic$, confirmationSyncEpic$];
