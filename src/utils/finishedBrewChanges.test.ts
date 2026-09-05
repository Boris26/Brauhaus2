import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew} from '../model/FinishedBrew';
import {completeFinishedBrew, enforceFinishedBrewStateInvariant, mergeFinishedBrewChanges} from './finishedBrewChanges';

const brew: FinishedBrew = {
    id: 'ABC', name: 'Testbier', startDate: '2026-08-20', fermentationStartedAt: '2026-08-21T08:30:00+02:00', liters: 20,
    originalwort: 12, residual_extract: 3, note: 'bestehend', active: true,
    beer_id: 'recipe-1', state: eBrewState.FERMENTATION, brewValues: '{"temperature":20}',
};

describe('finished brew changes', () => {
    it('changes fermentation to maturation while retaining the complete record and id', () => {
        const updated = mergeFinishedBrewChanges(brew, {state: eBrewState.MATURATION});

        expect(updated).toEqual({...brew, state: eBrewState.MATURATION});
        expect(updated.id).toBe('ABC');
        expect(updated.fermentationStartedAt).toBe('2026-08-21T08:30:00+02:00');
    });

    it('finishes the currently edited record and sets a missing end date', () => {
        const visibleRow = mergeFinishedBrewChanges(brew, {state: eBrewState.MATURATION, note: 'bearbeitet'});
        const updated = completeFinishedBrew(visibleRow, new Date('2026-08-27T20:00:00.000Z'));

        expect(updated).toMatchObject({id: 'ABC', state: eBrewState.FINISHED, active: false, note: 'bearbeitet'});
        expect(updated.endDate).toBe('2026-08-27T20:00:00.000Z');
    });

    it('does not overwrite an explicitly supplied end date', () => {
        const updated = completeFinishedBrew({...brew, endDate: '2026-08-26'});
        expect(updated.endDate).toBe('2026-08-26');
    });
});

describe('enforceFinishedBrewStateInvariant', () => {
    it('never allows FINISHED together with active=true', () => {
        expect(enforceFinishedBrewStateInvariant({...brew, state: eBrewState.FINISHED, active: true})).toMatchObject({state: eBrewState.FINISHED, active: false});
    });

    it('does not change active fermentation or maturation records', () => {
        expect(enforceFinishedBrewStateInvariant(brew)).toBe(brew);
    });
});
