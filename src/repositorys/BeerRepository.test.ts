import {api} from './BaseRepository';
import {BeerRepository} from './BeerRepository';
import {BeerDTO} from '../model/BeerDTO';

jest.mock('./BaseRepository', () => {
    const post = jest.fn();
    const put = jest.fn();
    return {
        api: {post, put},
        BaseRepository: class {
            protected static async post<T>(aUrl: string, aBody: any): Promise<T> {
                const response = await post(aUrl, aBody);
                return response.data;
            }
            protected static async put<T>(aUrl: string, aBody: any): Promise<T> {
                const response = await put(aUrl, aBody);
                return response.data;
            }
        },
    };
});

const mockedApi = api as unknown as { post: jest.Mock; put: jest.Mock };

const makeBeer = (id: string): BeerDTO => ({
    id,
    name: 'Testbier',
    type: 'Pils',
    color: 'hell',
    alcohol: 5,
    originalwort: 12,
    bitterness: 30,
    description: '',
    rating: 0,
    mashVolume: 20,
    spargeVolume: 10,
    cookingTime: 60,
    cookingTemperatur: 99,
    fermentationSteps: [],
    malts: [{id: '26', name: 'Pilsener Malz', quantity: 7}],
    wortBoiling: {totalTime: 60, hops: [{id: '10', name: 'Hallertau', quantity: 50, time: 60}]},
    fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: [{id: '1', name: 'Ale', quantity: 1}]},
});

describe('BeerRepository.submitBeer', () => {
    beforeEach(() => {
        mockedApi.post.mockReset();
        mockedApi.put.mockReset();
    });

    it('creates a new recipe with POST beer and without id in the body', async () => {
        mockedApi.post.mockResolvedValueOnce({data: {id: 'generated-id', beer: {id: 'generated-id'}}});

        const result = await BeerRepository.submitBeer(makeBeer(''));

        expect(result.id).toBe('generated-id');
        expect(mockedApi.post).toHaveBeenCalledWith('beer', expect.not.objectContaining({id: expect.anything()}));
        expect(mockedApi.put).not.toHaveBeenCalled();
    });

    it('updates an existing recipe with PUT beer/<id>', async () => {
        const beer = makeBeer('existing-id');
        mockedApi.put.mockResolvedValueOnce({data: {id: 'existing-id', beer: {id: 'existing-id'}}});

        await BeerRepository.submitBeer(beer);

        expect(mockedApi.put).toHaveBeenCalledWith('beer/existing-id', expect.objectContaining({id: 'existing-id'}));
        expect(mockedApi.post).not.toHaveBeenCalled();
    });
});
