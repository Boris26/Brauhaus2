import {BeerActions} from '../actions/actions';
import {Beer} from '../model/Beer';
import {RecipeImportResult} from '../model/RecipeImport';
import {beerDataReducer, initialBeerState} from './beerReducer';

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
