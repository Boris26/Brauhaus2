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
