import {firstValueFrom, of} from 'rxjs';
import {BeerActions} from '../actions/actions';
import {importBeerEpic} from './beerEpics';
import {BeerRepository} from '../repositorys/BeerRepository';
import {RecipeImportSource} from '../model/RecipeImport';
import {Beer} from '../model/Beer';

jest.mock('../repositorys/BeerRepository', () => ({
    BeerRepository: {importBeer: jest.fn()},
}));

describe('importBeerEpic', () => {
    it('keeps the existing ADD_IMPORTED_BEER success flow', async () => {
        const importedBeer = {id: 'beer-1', name: 'Import'} as Beer;
        const request = {source: RecipeImportSource.BRAUREKA, recipe: {name: 'Import'}};
        (BeerRepository.importBeer as jest.Mock).mockResolvedValueOnce(importedBeer);

        const result = await firstValueFrom(importBeerEpic(of(BeerActions.importBeer(request))));

        expect(BeerRepository.importBeer).toHaveBeenCalledWith(request);
        expect(result).toEqual(BeerActions.addImportedBeer(importedBeer));
    });
});
