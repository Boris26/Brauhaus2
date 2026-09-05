import {api} from './BaseRepository';
import {FermentationRepository} from './FermentationRepository';

jest.mock('./BaseRepository', () => {
  const get = jest.fn(); const post = jest.fn(); const put = jest.fn();
  return {api: {get, post, put}, BaseRepository: class {
    protected static async get<T>(url: string): Promise<T> { return (await get(url)).data; }
    protected static async post<T>(url: string, body: unknown): Promise<T> { return (await post(url, body)).data; }
    protected static async put<T>(url: string, body: unknown): Promise<T> { return (await put(url, body)).data; }
  }};
});
const mocked = api as unknown as {get: jest.Mock; post: jest.Mock; put: jest.Mock};

describe('FermentationRepository BeerDataStore routes', () => {
  beforeEach(() => { mocked.get.mockReset(); mocked.post.mockReset(); mocked.put.mockReset(); });
  it('combines actual action and measurement APIs instead of an aggregate endpoint', async () => {
    mocked.get.mockResolvedValue({data: []});
    await FermentationRepository.getDetails('brew/a');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/recipe-actions');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/measurements');
    expect(mocked.get).not.toHaveBeenCalledWith(expect.stringContaining('finishedbeers'));
  });
  it('maps nullable API trigger fields without renaming actionId', async () => {
    mocked.get
      .mockResolvedValueOnce({data: [{actionId: 'action', sourceType: 'HOP', status: 'PENDING', triggerType: 'MANUAL', triggerValue: null, triggerUnit: null}]})
      .mockResolvedValue({data: []});
    const details = await FermentationRepository.getDetails('brew');
    expect(details.actions[0]).toMatchObject({actionId: 'action', status: 'PENDING', triggerValue: undefined, triggerUnit: undefined});
    expect(details.actions[0]).not.toHaveProperty('id');
  });
  it('uses finished beer and action identity for complete and skip', async () => {
    mocked.post.mockResolvedValue({data: {}});
    await FermentationRepository.completeAction('brew/a', 'action/b');
    await FermentationRepository.skipAction('brew/a', 'action/b');
    expect(mocked.post).toHaveBeenNthCalledWith(1, 'fermentation/beers/brew%2Fa/recipe-actions/action%2Fb/complete', {});
    expect(mocked.post).toHaveBeenNthCalledWith(2, 'fermentation/beers/brew%2Fa/recipe-actions/action%2Fb/skip', {});
  });
  it('posts measurements below the finished beer resource', async () => {
    const value = {finishedBeerId: 'brew/a', measuredAt: '2026-09-05T12:00:00Z', plato: 5};
    mocked.post.mockResolvedValue({data: {...value, id: 'm'}});
    await FermentationRepository.createMeasurement(value);
    expect(mocked.post).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/measurements', {measuredAt: value.measuredAt, plato: 5});
  });
});
