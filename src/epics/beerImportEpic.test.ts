import {firstValueFrom, of} from 'rxjs';
import {BeerActions} from '../actions/actions';
import {importBeerEpic} from './beerEpics';
import {BeerRepository} from '../repositorys/BeerRepository';
import {RecipeImportFormat} from '../model/RecipeImport';
import {Beer} from '../model/Beer';

jest.mock('../repositorys/BeerRepository', () => ({BeerRepository: {importBeer: jest.fn()}}));

describe('importBeerEpic', () => {
    it('passes result.recipe and preserves import metadata in the success action', async () => {
        const result = {recipe: {id: 'beer-1', name: 'Import'} as Beer, warnings: [{code: 'SOURCE_INFORMATION_IGNORED', message: 'Info'}], ingredientMappings: [], createdMasterData: [], replayed: true};
        const request = {format: RecipeImportFormat.MMUM, recipe: {name: 'Import'}, idempotencyKey: 'key-a'};
        (BeerRepository.importBeer as jest.Mock).mockResolvedValueOnce(result);
        const action = await firstValueFrom(importBeerEpic(of(BeerActions.importBeer(request))));
        expect(BeerRepository.importBeer).toHaveBeenCalledWith(request);
        expect(action).toEqual(BeerActions.addImportedBeer(result));
    });

    it('turns structured errors including paths into an import failure', async () => {
        (BeerRepository.importBeer as jest.Mock).mockRejectedValueOnce({response: {data: {error: {code: 'SOURCE_VALIDATION_FAILED', message: 'Ungültig', path: 'recipe.Malze[2].Menge'}}}});
        const action = await firstValueFrom(importBeerEpic(of(BeerActions.importBeer({format: RecipeImportFormat.BRAUHAUS, recipe: {}, idempotencyKey: 'key-a'}))));
        expect(action).toEqual(BeerActions.importBeerFailed('Die ausgewählte Rezeptdatei entspricht nicht dem gewählten Importformat. Betroffenes Feld: recipe.Malze[2].Menge'));
    });
});
