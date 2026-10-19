import {Production} from './Production';
import {ProductionRepository} from '../../repositorys/ProductionRepository';
import {ProcessState} from '../../model/brewingStatus.types';
import {dataCollector} from '../../utils/DataCollector/dataCollector';
import {clock, history, modernStatus, reading} from '../../testUtils/processTimeline';

jest.mock('../../store', () => ({__esModule: true, default: {dispatch: jest.fn()}}));
jest.mock('../../repositorys/ProductionRepository', () => ({ProductionRepository: {getProcessTimeline: jest.fn()}}));
const get = ProductionRepository.getProcessTimeline as jest.Mock;

const subject = () => {
    const addFinishedBrew = jest.fn();
    const component = new Production({selectedBeer: {id: 'beer', name: 'Beer', plannedVolume: 20, wortBoiling: {hops: [], totalTime: 60}, additionalIngredients: [], fermentation: []},
        hops: [], additionalIngredients: [], addFinishedBrew, isAddingFinishedBrew: false,
        brewingStatus: modernStatus({process: {state: ProcessState.FINISHED}, timeline: clock({running: false})})} as any);
    component.setState = ((state: any) => {Object.assign(component.state, state);}) as any;
    return {component, addFinishedBrew};
};

beforeEach(() => {dataCollector.reset(); get.mockReset();});

it('includes the final real acquisition and explicit null in the versioned archive before saving', async () => {
    const {component, addFinishedBrew} = subject();
    get.mockResolvedValue(history([reading(1, 60), reading(2, null)], {timeline: clock({running: false, historyCursor: 2})}));
    await component.confirmFinishDialog();
    expect(addFinishedBrew).toHaveBeenCalledTimes(1);
    const archive = JSON.parse(addFinishedBrew.mock.calls[0][0].brewValues);
    expect(archive.schemaVersion).toBe(2);
    expect(archive.measurements.map((p: any) => p.Temperature)).toEqual([60, null]);
});

it('keeps a failed final drain retryable and does not save a silently incomplete archive', async () => {
    const {component, addFinishedBrew} = subject();
    get.mockRejectedValueOnce(new Error('offline'));
    await component.confirmFinishDialog();
    expect(addFinishedBrew).not.toHaveBeenCalled();
    expect(component.state.finishHistoryError).toBeTruthy();
    get.mockResolvedValue(history([reading(1)], {timeline: clock({running: false, historyCursor: 1})}));
    await component.confirmFinishDialog();
    expect(addFinishedBrew).toHaveBeenCalledTimes(1);
});
