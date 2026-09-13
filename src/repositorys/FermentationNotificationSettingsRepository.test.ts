import {api} from './BaseRepository';
import {FermentationNotificationSettingsRepository} from './FermentationNotificationSettingsRepository';

jest.mock('./BaseRepository', () => {
    const get = jest.fn();
    const put = jest.fn();
    return {
        api: {get, put},
        BaseRepository: class {
            protected static async get<T>(url: string): Promise<T> {
                return (await get(url)).data;
            }
            protected static async put<T>(url: string, body: unknown): Promise<T> {
                return (await put(url, body)).data;
            }
        },
    };
});

const mockedApi = api as unknown as {get: jest.Mock; put: jest.Mock};
const settings = {fermentationActionWarningSeconds: 10800, fermentationActionReminderIntervalSeconds: 7200};

describe('FermentationNotificationSettingsRepository', () => {
    beforeEach(() => jest.clearAllMocks());

    it('uses GET config through the existing database API infrastructure', async () => {
        mockedApi.get.mockResolvedValueOnce({data: settings});
        await expect(FermentationNotificationSettingsRepository.get()).resolves.toEqual(settings);
        expect(mockedApi.get).toHaveBeenCalledWith('config');
    });

    it('uses partial PUT config and returns the canonical backend state', async () => {
        const update = {fermentationActionWarningSeconds: 21600};
        mockedApi.put.mockResolvedValueOnce({data: {...settings, ...update}});
        await expect(FermentationNotificationSettingsRepository.update(update)).resolves.toEqual({...settings, ...update});
        expect(mockedApi.put).toHaveBeenCalledWith('config', update);
    });
});
