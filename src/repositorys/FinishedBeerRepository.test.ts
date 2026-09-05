import {api} from './BaseRepository';
import {FinishedBeerRepository} from './FinishedBeerRepository';
import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew, FinishedBrewCreatePayload} from '../model/FinishedBrew';

jest.mock('./BaseRepository', () => {
    const post = jest.fn();
    const put = jest.fn();
    return {
        api: {post, put},
        BaseRepository: class {
            protected static async post<T>(aUrl: string, aBody: unknown): Promise<T> {
                const response = await post(aUrl, aBody);
                return response.data;
            }
            protected static async put<T>(aUrl: string, aBody: unknown): Promise<T> {
                const response = await put(aUrl, aBody);
                return response.data;
            }
        },
    };
});

const mockedApi = api as unknown as {post: jest.Mock; put: jest.Mock};
const createPayload: FinishedBrewCreatePayload = {
    name: 'Testbier',
    startDate: '2026-08-27',
    fermentationStartedAt: '2026-08-27T20:15:00+02:00',
    liters: 20,
    originalwort: 12,
    residual_extract: 3,
    note: '',
    active: true,
    beer_id: 'recipe-1',
    state: eBrewState.FERMENTATION,
};

describe('FinishedBeerRepository', () => {
    beforeEach(() => {
        mockedApi.post.mockReset();
        mockedApi.put.mockReset();
    });

    it('creates without a client id through POST finishedbeer', async () => {
        mockedApi.post.mockResolvedValueOnce({data: {...createPayload, id: 'generated-id'}});

        await FinishedBeerRepository.sendNewFinishedBeer(createPayload);

        expect(mockedApi.post).toHaveBeenCalledWith('finishedbeer', expect.not.objectContaining({id: expect.anything()}));
        expect(mockedApi.put).not.toHaveBeenCalled();
    });

    it('updates the complete existing record through PUT finishedbeer', async () => {
        const existing: FinishedBrew = {...createPayload, id: 'existing-id', state: eBrewState.MATURATION};
        mockedApi.put.mockResolvedValueOnce({data: existing});

        await FinishedBeerRepository.updateFinishedBeer(existing);

        expect(mockedApi.put).toHaveBeenCalledWith('finishedbeer', existing);
        expect(mockedApi.put.mock.calls[0][1]).toMatchObject({fermentationStartedAt: '2026-08-27T20:15:00+02:00'});
        expect(mockedApi.post).not.toHaveBeenCalled();
    });
});
