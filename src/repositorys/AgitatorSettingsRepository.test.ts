import axios from 'axios';
import {AgitatorSettingsRepository} from './AgitatorSettingsRepository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AgitatorSettingsRepository', () => {
    const settings = {speedPercent: 32, runningMinutes: 2, breakMinutes: 7};

    beforeEach(() => jest.clearAllMocks());

    it('loads persistent defaults from the settings endpoint', async () => {
        mockedAxios.get.mockResolvedValueOnce({data: settings});
        await expect(AgitatorSettingsRepository.get()).resolves.toEqual(settings);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/controller/Settings/Agitator');
    });

    it('sends a full replacement and returns the confirmed controller response', async () => {
        const confirmed = {...settings, speedPercent: 31};
        mockedAxios.put.mockResolvedValueOnce({data: confirmed});
        await expect(AgitatorSettingsRepository.update(settings)).resolves.toEqual(confirmed);
        expect(mockedAxios.put).toHaveBeenCalledWith('/api/controller/Settings/Agitator', settings);
    });
});
