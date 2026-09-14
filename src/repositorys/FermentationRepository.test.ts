import {api} from './BaseRepository';
import {FermentationRepository} from './FermentationRepository';

jest.mock('./BaseRepository', () => {
  const get = jest.fn(); const post = jest.fn(); const put = jest.fn(); const patch = jest.fn(); const remove = jest.fn();
  return {api: {get, post, put, patch, delete: remove}, BaseRepository: class {
    protected static async get<T>(url: string): Promise<T> { return (await get(url)).data; }
    protected static async post<T>(url: string, body: unknown): Promise<T> { return (await post(url, body)).data; }
    protected static async put<T>(url: string, body: unknown): Promise<T> { return (await put(url, body)).data; }
    protected static async patch<T>(url: string, body: unknown): Promise<T> { return (await patch(url, body)).data; }
    protected static async delete(url: string): Promise<void> { await remove(url); }
  }};
});
const mocked = api as unknown as {get: jest.Mock; post: jest.Mock; put: jest.Mock; patch: jest.Mock; delete: jest.Mock};

describe('FermentationRepository BeerDataStore routes', () => {
  beforeEach(() => { mocked.get.mockReset(); mocked.post.mockReset(); mocked.put.mockReset(); mocked.patch.mockReset(); mocked.delete.mockReset(); });
  it('combines actual action and measurement APIs instead of an aggregate endpoint', async () => {
    mocked.get.mockResolvedValue({data: []});
    await FermentationRepository.getDetails('brew/a');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/recipe-actions');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/measurements');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/sensor-measurements');
    expect(mocked.get).not.toHaveBeenCalledWith(expect.stringContaining('finishedbeers'));
  });
  it('maps nullable API trigger fields without renaming actionId', async () => {
    mocked.get
      .mockResolvedValueOnce({data: [{actionId: 'action', sourceType: 'HOP', status: 'PENDING', triggerType: 'MANUAL', triggerValue: null, triggerUnit: null}]})
      .mockResolvedValue({data: []});
    const details = await FermentationRepository.getDetails('brew');
    expect(details.actions[0]).toMatchObject({actionId: 'action', status: 'PENDING', triggerValue: null, triggerUnit: null});
    expect(details.actions[0]).not.toHaveProperty('id');
  });
  it('maps the legacy temperatureC response alias into the unified model', async () => {
    mocked.get
      .mockResolvedValueOnce({data: []})
      .mockResolvedValueOnce({data: [{id: 'm', finishedBeerId: 'brew', measuredAt: '2026-09-05T12:00:00Z', temperatureC: 18.2, ambientTemperatureC: 16.8, source: 'SENSOR'}]})
      .mockResolvedValue({data: []});
    const details = await FermentationRepository.getDetails('brew');
    expect(details.measurements[0]).toMatchObject({beerTemperatureC: 18.2, ambientTemperatureC: 16.8, source: 'SENSOR'});
  });
  it('maps the backend assignment DTO to the UI active assignment', async () => {
    mocked.get.mockResolvedValue({data: [{deviceUid: 'sensor-1', name: 'Keller', assignment: {beerId: 'brew', assignmentType: 'manual', assignedAt: '2026-09-13T15:20:00Z'}}]});
    const devices = await FermentationRepository.getDevices();
    expect(devices).toEqual([{deviceUid: 'sensor-1', deviceName: 'Keller', displayName: undefined, status: undefined, lastSeenAt: undefined, activeAssignment: {beerId: 'brew', assignmentType: 'manual', assignedAt: '2026-09-13T15:20:00Z'}}]);
  });
  it('maps a null backend assignment to a free UI device', async () => {
    mocked.get.mockResolvedValue({data: [{deviceUid: 'sensor-free', deviceName: 'Frei', assignment: null}]});
    const devices = await FermentationRepository.getDevices();
    expect(devices[0].activeAssignment).toBeNull();
  });
  it('patches and maps a device display name without using registration', async () => {
    mocked.patch.mockResolvedValue({data: {deviceUid: 'sensor/a', deviceName: 'FERM-1', displayName: 'Garage', assignment: null}});
    const device = await FermentationRepository.updateDeviceDisplayName('sensor/a', 'Garage');
    expect(mocked.patch).toHaveBeenCalledWith('fermentation/devices/sensor%2Fa', {displayName: 'Garage'});
    expect(mocked.post).not.toHaveBeenCalled();
    expect(device).toMatchObject({deviceUid: 'sensor/a', deviceName: 'FERM-1', displayName: 'Garage'});
  });
  it('uses finished beer and action identity for complete and skip', async () => {
    mocked.post.mockResolvedValue({data: {}});
    await FermentationRepository.completeAction('brew/a', 'action/b');
    await FermentationRepository.skipAction('brew/a', 'action/b');
    expect(mocked.post).toHaveBeenNthCalledWith(1, 'fermentation/beers/brew%2Fa/recipe-actions/action%2Fb/complete', {});
    expect(mocked.post).toHaveBeenNthCalledWith(2, 'fermentation/beers/brew%2Fa/recipe-actions/action%2Fb/skip', {});
  });
  it('posts measurements below the finished beer resource', async () => {
    const value = {finishedBeerId: 'brew/a', measuredAt: '2026-09-05T12:00:00Z', beerTemperatureC: 18.4, ambientTemperatureC: 17.1, plato: 5};
    mocked.post.mockResolvedValue({data: {...value, id: 'm'}});
    await FermentationRepository.createMeasurement(value);
    expect(mocked.post).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/measurements', {measuredAt: value.measuredAt, plato: 5, beerTemperatureC: 18.4, ambientTemperatureC: 17.1});
  });
  it('loads bubble activity by finished beer with ISO time filters', async () => {
    mocked.get.mockResolvedValue({data: [
      {deviceId: 'sensor', sequence: 1, bubbleCount: 8, windowSeconds: 60, averagePressureDeltaPa: 1.42, windowEndedAt: '2026-09-11T10:00:00Z'},
      {deviceId: 'sensor', sequence: 2, bubbleCount: 0, windowSeconds: 60, averagePressureDeltaPa: 0, windowEndedAt: '2026-09-11T10:01:00Z'},
      {deviceId: 'sensor', sequence: 3, bubbleCount: 1, windowSeconds: 60, averagePressureDeltaPa: -0.2, windowEndedAt: '2026-09-11T10:02:00Z'},
      {deviceId: 'sensor', sequence: 4, bubbleCount: 1, windowSeconds: 60, averagePressureDeltaPa: null, windowEndedAt: '2026-09-11T10:03:00Z'},
      {deviceId: 'legacy', sequence: 5, bubbleCount: 1, windowSeconds: 60, windowEndedAt: '2026-09-11T10:04:00Z'},
    ]});
    const result = await FermentationRepository.getBubbleActivity('brew/a', '2026-09-10T10:00:00.000Z', '2026-09-11T10:00:00.000Z');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew%2Fa/bubble-activity?from=2026-09-10T10%3A00%3A00.000Z&to=2026-09-11T10%3A00%3A00.000Z');
    expect(result.map(value => value.averagePressureDeltaPa)).toEqual([1.42, 0, -0.2, null, undefined]);
    expect(result[4]).not.toHaveProperty('averagePressureDeltaPa');
  });
  it('loads all bubble activity without unnecessary filters', async () => {
    mocked.get.mockResolvedValue({data: []});
    await FermentationRepository.getBubbleActivity('brew');
    expect(mocked.get).toHaveBeenCalledWith('fermentation/beers/brew/bubble-activity');
  });
  it('uses the current assignment and unassignment contracts with an encoded device uid', async () => {
    mocked.post.mockResolvedValue({data: {deviceUid: 'sensor/a', deviceName: 'Keller', assignment: {beerId: 'brew-1', assignmentType: 'manual'}}});
    mocked.delete.mockResolvedValue({data: undefined});
    const assigned = await FermentationRepository.assignDevice('sensor/a', 'brew-1');
    await FermentationRepository.unassignDevice('sensor/a');
    expect(mocked.post).toHaveBeenCalledWith('fermentation/devices/sensor%2Fa/assignment', {beerId: 'brew-1'});
    expect(mocked.put).not.toHaveBeenCalled();
    expect(mocked.delete).toHaveBeenCalledWith('fermentation/devices/sensor%2Fa/assignment');
    expect(assigned.activeAssignment).toEqual({beerId: 'brew-1', assignmentType: 'manual'});
  });
});
