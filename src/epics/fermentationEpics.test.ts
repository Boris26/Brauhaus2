import {of} from 'rxjs';
import {toArray} from 'rxjs/operators';
import {FermentationActions, FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationRepository} from '../repositorys/FermentationRepository';
import {completeFermentationActionEpic, createMeasurementEpic, skipFermentationActionEpic} from './fermentationEpics';

jest.mock('../repositorys/FermentationRepository', () => ({FermentationRepository: {
  createMeasurement: jest.fn(), completeAction: jest.fn(), skipAction: jest.fn(),
}}));
const repository = FermentationRepository as jest.Mocked<typeof FermentationRepository>;

it('reloads backend due projection after a Plato measurement without completing an action', done => {
  repository.createMeasurement.mockResolvedValue({id: 'm2', finishedBeerId: 'brew-a', measuredAt: '2026-09-05T10:00:00Z', plato: 4.9});
  createMeasurementEpic(of(FermentationActions.createMeasurement({finishedBeerId: 'brew-a', measuredAt: '2026-09-05T10:00:00Z', plato: 4.9}))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions.map(action => action.type)).toEqual([
      FermentationActionTypes.CREATE_MEASUREMENT_SUCCESS,
      FermentationActionTypes.LOAD,
    ]);
    expect(actions).not.toContainEqual(expect.objectContaining({type: FermentationActionTypes.COMPLETE_ACTION}));
    done();
  });
});

it('skips by finished beer and action id and reloads backend state', done => {
  repository.skipAction.mockResolvedValue({actionId: 'action-a', sourceType: 'DRY_HOP', status: 'SKIPPED'});
  skipFermentationActionEpic(of(FermentationActions.skipAction('brew-a', 'action-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(repository.skipAction).toHaveBeenCalledWith('brew-a', 'action-a');
    expect(actions.map(action => action.type)).toEqual([FermentationActionTypes.SKIP_ACTION_SUCCESS, FermentationActionTypes.LOAD]);
    done();
  });
});

it('reloads backend completedAt and contactEndsAt after completion', done => {
  repository.completeAction.mockResolvedValue({actionId: 'action-a', status: 'COMPLETED', completedAt: '2026-09-05T10:00:00Z', contactEndsAt: '2026-09-08T10:00:00Z', sourceType: 'DRY_HOP'});
  completeFermentationActionEpic(of(FermentationActions.completeAction('brew-a', 'action-a'))).pipe(toArray()).subscribe((actions: any[]) => {
    expect(actions.map(action => action.type)).toEqual([
      FermentationActionTypes.COMPLETE_ACTION_SUCCESS,
      FermentationActionTypes.LOAD,
    ]);
    expect(repository.completeAction).toHaveBeenCalledWith('brew-a', 'action-a');
    done();
  });
});
