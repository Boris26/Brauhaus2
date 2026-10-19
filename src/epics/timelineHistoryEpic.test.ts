import {Subject} from 'rxjs';
import {timelineHistoryEpic$} from './timelineHistoryEpic';
import {ProductionActions as Actions} from '../actions/actions';
import {ProductionRepository} from '../repositorys/ProductionRepository';
import {dataCollector} from '../utils/DataCollector/dataCollector';
import {clock, history, modernStatus, phase, reading} from '../testUtils/processTimeline';
import {initialProductionState} from '../reducers/productionReducer';
import {ProcessState} from '../model/brewingStatus.types';

jest.mock('../repositorys/ProductionRepository', () => ({ProductionRepository: {getProcessTimeline: jest.fn()}}));
const get = ProductionRepository.getProcessTimeline as jest.Mock;
const flush = async () => {for (let i = 0; i < 10; i++) await Promise.resolve();};

describe('timeline cursor synchronization', () => {
    let actions: Subject<any>;
    let state: any;
    let subscription: any;
    let output: any[];
    beforeEach(() => {
        jest.useFakeTimers();
        dataCollector.reset();
        get.mockReset().mockResolvedValue(history([reading(1)]));
        actions = new Subject();
        state = {value: {productionReducer: {...initialProductionState, brewingStatus: modernStatus()}}};
        output = [];
        subscription = timelineHistoryEpic$(actions, state).subscribe(a => output.push(a));
    });
    afterEach(() => {subscription.unsubscribe(); actions.complete(); jest.useRealTimers();});
    const start = () => actions.next({type: Actions.ActionTypes.SET_BREWING_STATUS});

    it('initially reloads retained history and requests only unseen acquisitions afterwards', async () => {
        start(); jest.advanceTimersByTime(0); await flush();
        expect(get.mock.calls[0][1].afterSequence).toBe(0);
        expect(dataCollector.getMeasurementCount()).toBe(1);
        get.mockResolvedValue(history([reading(2, 60)], {reset: false}));
        jest.advanceTimersByTime(2000); await flush();
        expect(get.mock.calls[1][1].afterSequence).toBe(1);
        expect(dataCollector.getMeasurementCount()).toBe(2);
    });

    it('does not overlap reads, continues during disconnect and repairs reconnect gaps', async () => {
        let resolve!: (value: unknown) => void;
        get.mockImplementationOnce(() => new Promise(r => {resolve = r;}));
        start(); jest.advanceTimersByTime(6000); await flush();
        expect(get).toHaveBeenCalledTimes(1);
        resolve(history([reading(1), reading(2)])); await flush();
        state.value.productionReducer.communication = {...state.value.productionReducer.communication, generation: 1};
        actions.next({type: Actions.ActionTypes.SOCKET_CONNECTION_CHANGED, payload: {connected: false}});
        get.mockResolvedValue(history([reading(3)], {reset: false}));
        jest.advanceTimersByTime(2000); await flush();
        expect(dataCollector.getMeasurementCount()).toBe(3);
    });

    it('ignores a late response from an older connection generation', async () => {
        let resolve!: (value: unknown) => void;
        get.mockImplementationOnce(() => new Promise(r => {resolve = r;}));
        start(); jest.advanceTimersByTime(0);
        state.value.productionReducer.communication = {...state.value.productionReducer.communication, generation: 1};
        resolve(history([reading(1)])); await flush();
        expect(dataCollector.getMeasurementCount()).toBe(0);
    });

    it('retries a failed final drain and stops after successful terminal synchronization', async () => {
        state.value.productionReducer.brewingStatus = modernStatus({process: {state: ProcessState.FINISHED}});
        get.mockRejectedValueOnce(new Error('offline'));
        start(); jest.advanceTimersByTime(0); await flush();
        expect(output.at(-1).type).toBe(Actions.ActionTypes.HISTORY_READ_FAILED);
        jest.advanceTimersByTime(2000); await flush();
        expect(dataCollector.getMeasurementCount()).toBe(1);
        jest.advanceTimersByTime(10000); await flush();
        expect(get).toHaveBeenCalledTimes(2);
    });

    it('cancels an obsolete brew read instead of merging it into a new process', async () => {
        let resolve!: (value: unknown) => void;
        get.mockImplementationOnce(() => new Promise(r => {resolve = r;}));
        start(); jest.advanceTimersByTime(0);
        const signal = get.mock.calls[0][2] as AbortSignal;
        state.value.productionReducer.brewingStatus = modernStatus({timeline: {...modernStatus().timeline!, timelineId: 'new-brew'}});
        start();
        expect(signal.aborted).toBe(true);
        resolve(history([reading(1)])); await flush();
        expect(dataCollector.getMeasurementCount()).toBe(0);
    });

    it('repairs a lost semantic phase event once without turning sample reads into status polling', async () => {
        get.mockResolvedValue(history([reading(1)], {timeline: clock({historyCursor: 1, phaseSequence: 2}),
            phases: [phase({endSeconds: 10}), phase({sequence: 2, startSeconds: 10})]}));
        start(); jest.advanceTimersByTime(0); await flush();
        expect(output.filter(a => a.type === Actions.ActionTypes.STATUS_RESYNC_REQUEST)).toHaveLength(1);
        jest.advanceTimersByTime(6000); await flush();
        expect(output.filter(a => a.type === Actions.ActionTypes.STATUS_RESYNC_REQUEST)).toHaveLength(1);
    });
});
