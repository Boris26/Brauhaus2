import {EMPTY, Observable, from, merge, of, timer} from 'rxjs';
import {catchError, distinctUntilChanged, exhaustMap, filter, finalize, map, mergeMap, switchMap, takeWhile} from 'rxjs/operators';
import {ProductionActions as Actions} from '../actions/actions';
import {ProductionRepository} from '../repositorys/ProductionRepository';
import {dataCollector} from '../utils/DataCollector/dataCollector';
import {parseProcessTimelineHistory, ProcessTimelineHistory} from '../model/ProcessTimeline';
import {RootState} from '../reducers/rootReducer';

/** Serialized cursor reads are independent from lossy latest-status telemetry. */
export const timelineHistoryEpic$ = (action$: Observable<any>, state$: {value: RootState}) => action$.pipe(
    filter(action => action.type === Actions.ActionTypes.SET_BREWING_STATUS),
    map(() => state$.value.productionReducer.brewingStatus),
    distinctUntilChanged((a, b) => a?.timeline?.timelineId === b?.timeline?.timelineId
        && a?.snapshotMetadata?.controllerEpoch === b?.snapshotMetadata?.controllerEpoch
        && a?.snapshotMetadata?.processInstanceId === b?.snapshotMetadata?.processInstanceId
        && a?.process.state === b?.process.state),
    switchMap(status => {
        if (!status?.timeline || !status.snapshotMetadata) return EMPTY;
        const timelineId = status.timeline.timelineId;
        dataCollector.beginTimeline(status.timeline);
        const ticks = timer(0, 2000);
        let finalReadComplete = false;
        let requestedPhaseSync: string | undefined;
        const reconnect = action$.pipe(filter(action => action.type === Actions.ActionTypes.SOCKET_CONNECTION_CHANGED
            && action.payload.connected));
        return merge(ticks, reconnect).pipe(exhaustMap(() => {
            const generation = state$.value.productionReducer.communication.generation;
            const abort = new AbortController();
            return from(ProductionRepository.getProcessTimeline(timelineId, dataCollector.getHistoryCursor(), abort.signal)).pipe(
                map(parseProcessTimelineHistory),
                filter((history): history is ProcessTimelineHistory => !!history),
                filter(history => {
                    const current = state$.value.productionReducer;
                    return generation === current.communication.generation && current.brewingStatus?.timeline?.timelineId === timelineId
                        && history.timeline.timelineId === timelineId
                        && history.controllerEpoch === current.brewingStatus.snapshotMetadata?.controllerEpoch
                        && history.processInstanceId === current.brewingStatus.snapshotMetadata?.processInstanceId;
                }),
                mergeMap(history => {
                    dataCollector.applyTimelineHistory(history);
                    finalReadComplete = status.process.state !== 'ACTIVE';
                    const current = state$.value.productionReducer.brewingStatus?.timeline;
                    const phaseKey = `${history.timeline.phaseSequence}/${history.timeline.running}`;
                    const needsSync = current && (history.timeline.phaseSequence > current.phaseSequence || history.timeline.running !== current.running);
                    const request = needsSync && requestedPhaseSync !== phaseKey;
                    requestedPhaseSync = needsSync ? phaseKey : undefined;
                    return from([{type: Actions.ActionTypes.HISTORY_UPDATED, payload: {version: dataCollector.getTimelineSnapshot().version, source: 'timeline'}},
                        ...(request ? [Actions.requestStatusSync()] : [])]);
                }),
                catchError(() => of({type: Actions.ActionTypes.HISTORY_READ_FAILED})),
                finalize(() => abort.abort()),
            );
        }), takeWhile(() => !finalReadComplete, true));
    }),
);
