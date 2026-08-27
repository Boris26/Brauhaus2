import {BeerActions} from '../actions/actions';
import {Beer} from '../model/Beer';
import {RecipeImportResult} from '../model/RecipeImport';
import {beerDataReducer, initialBeerState} from './beerReducer';
import {FinishedBrew} from '../model/FinishedBrew';
import {eBrewState} from '../enums/eBrewState';

const result = (replayed: boolean): RecipeImportResult => ({
    recipe: {id: 'beer-1', name: replayed ? 'Replay' : 'Import'} as Beer,
    warnings: [],
    ingredientMappings: [],
    createdMasterData: [],
    replayed,
});

describe('beerDataReducer recipe import', () => {
    it('stores result.recipe and keeps result metadata', () => {
        const state = beerDataReducer(initialBeerState, BeerActions.addImportedBeer(result(false)));
        expect(state.importedBeer?.id).toBe('beer-1');
        expect(state.importResult?.replayed).toBe(false);
        expect(state.beers).toHaveLength(1);
    });

    it('treats an idempotent replay as success without duplicating the beer', () => {
        const imported = beerDataReducer(initialBeerState, BeerActions.addImportedBeer(result(false)));
        const replayed = beerDataReducer(imported, BeerActions.addImportedBeer(result(true)));
        expect(replayed.beers).toHaveLength(1);
        expect(replayed.beers?.[0].name).toBe('Replay');
        expect(replayed.importResult?.replayed).toBe(true);
    });
});

describe('beerDataReducer finished brews', () => {
    const brew: FinishedBrew = {
        id: 'ABC', name: 'Testbier', startDate: '2026-08-27', liters: 20,
        originalwort: 12, residual_extract: 3, note: '', active: true,
        beer_id: 'recipe-1', state: eBrewState.FERMENTATION,
    };

    it('normalizes a null response to an undefined list', () => {
        const state = beerDataReducer(initialBeerState, BeerActions.getFinishedBeersSuccess(null));
        expect(state.finishedBrews).toBeUndefined();
    });

    it('adds the backend-generated record after create success', () => {
        const state = beerDataReducer({...initialBeerState, finishedBrews: []}, BeerActions.addFinishedBrewSuccess(brew));
        expect(state.finishedBrews).toEqual([brew]);
    });

    it('retains the exact create payload on failure and clears it only on success', () => {
        const {id, ...payload} = brew;
        const pending = beerDataReducer(initialBeerState, BeerActions.addFinishedBrew(payload));
        expect(pending.isAddingFinishedBrew).toBe(true);
        expect(pending.pendingFinishedBrewPayload).toBe(payload);

        const failed = beerDataReducer(pending, BeerActions.addFinishedBrewFailure('HTTP 500'));
        expect(failed.isAddingFinishedBrew).toBe(false);
        expect(failed.addFinishedBrewError).toBe('HTTP 500');
        expect(failed.pendingFinishedBrewPayload).toBe(payload);

        const retrying = beerDataReducer(failed, BeerActions.addFinishedBrew(failed.pendingFinishedBrewPayload!));
        const succeeded = beerDataReducer(retrying, BeerActions.addFinishedBrewSuccess(brew));
        expect(succeeded.pendingFinishedBrewPayload).toBeUndefined();
        expect(succeeded.isAddingFinishedBrew).toBe(false);
    });

    it('replaces the existing id after update success', () => {
        const pending = beerDataReducer({...initialBeerState, finishedBrews: [brew]}, BeerActions.updateActiveBeer({...brew, state: eBrewState.MATURATION}));
        const state = beerDataReducer(pending, BeerActions.updateFinishedBrewSuccess({...brew, state: eBrewState.MATURATION}, 'ABC'));
        expect(state.finishedBrews).toHaveLength(1);
        expect(state.finishedBrews?.[0]).toMatchObject({id: 'ABC', state: eBrewState.MATURATION});
    });

    it('does not append an update response with another id', () => {
        const pending = beerDataReducer({...initialBeerState, finishedBrews: [brew]}, BeerActions.updateActiveBeer(brew));
        const state = beerDataReducer(pending, BeerActions.updateFinishedBrewSuccess({...brew, id: 'NEW'}, 'ABC'));
        expect(state.finishedBrews).toEqual([brew]);
        expect(state.finishedBrewUpdateErrors?.ABC).toBeDefined();
    });
});

describe('beerDataReducer loading failures', () => {
    it('clears recipe and finished-brew loading independently after errors', () => {
        const loadingBeers = beerDataReducer(initialBeerState, BeerActions.getBeers(true));
        expect(beerDataReducer(loadingBeers, BeerActions.getBeersFailure()).isFetchingBeers).toBe(false);
        const loadingBrews = beerDataReducer(initialBeerState, BeerActions.getFinishedBeers(true));
        expect(beerDataReducer(loadingBrews, BeerActions.getFinishedBeersFailure()).isFetchingFinishedBrews).toBe(false);
    });
});

it('tracks a finished-brew delete and releases it after failure', () => {
    const deleting = beerDataReducer(initialBeerState, BeerActions.deleteFinishedBeer('ABC'));
    expect(deleting.deletingFinishedBrewIds).toEqual(['ABC']);
    const failed = beerDataReducer(deleting, BeerActions.deleteFinishedBeerFailure('ABC', 'HTTP 500'));
    expect(failed.deletingFinishedBrewIds).toEqual([]);
    expect(failed.finishedBrewDeleteErrors?.ABC).toBe('HTTP 500');
});

it('replaces stale recipes when the server returns an empty list', () => {
    const stale = {...initialBeerState, beers: [{id: 'beer-1', name: 'stale'} as Beer], selectedBeer: {id: 'beer-1'} as Beer, isFetching: true, isFetchingBeers: true};
    const state = beerDataReducer(stale, BeerActions.getBeersSuccess([]));
    expect(state.beers).toEqual([]);
    expect(state.selectedBeer).toBeUndefined();
    expect(state.isFetchingBeers).toBe(false);
});
