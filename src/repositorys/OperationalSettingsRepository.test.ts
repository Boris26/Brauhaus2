import axios from 'axios';
import {OperationalSettings} from '../model/OperationalSettings';
import {OperationalSettingsRepository} from './OperationalSettingsRepository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OperationalSettingsRepository', () => {
    const settings: OperationalSettings = {
        waterFilling: {pulsesPerLiter: 411, sensorStartDelaySeconds: 0.4},
        audio: {enabled: true, confirmationRepeatSeconds: 9, alarmRepeatSeconds: 2},
        processSafety: {heatingTimeoutMinutes: 55, confirmationTimeoutMinutes: 4},
        heaterSafety: {offGracePeriodSeconds: 100, maxOffTemperatureRise: 1.8, riseObservationWindowSeconds: 25},
    };

    beforeEach(() => jest.clearAllMocks());

    it('loads the complete settings snapshot in one request', async () => {
        mockedAxios.get.mockResolvedValueOnce({data: settings});

        await expect(OperationalSettingsRepository.get()).resolves.toEqual(settings);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/controller/Settings');
    });

    it('loads an individual typed section', async () => {
        mockedAxios.get.mockResolvedValueOnce({data: settings.audio});

        await expect(OperationalSettingsRepository.getSection('audio')).resolves.toEqual(settings.audio);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/controller/Settings/audio');
    });

    it.each([
        ['waterFilling', settings.waterFilling],
        ['audio', settings.audio],
        ['processSafety', settings.processSafety],
        ['heaterSafety', settings.heaterSafety],
    ] as const)('puts the complete %s section and returns the confirmed response', async (section, payload) => {
        const confirmed = {...payload};
        mockedAxios.put.mockResolvedValueOnce({data: confirmed});

        await expect(OperationalSettingsRepository.updateSection(section, payload)).resolves.toEqual(confirmed);
        expect(mockedAxios.put).toHaveBeenCalledWith(`/api/controller/Settings/${section}`, payload);
    });

    it('propagates backend validation and network errors', async () => {
        const error = new Error('validation failed');
        mockedAxios.put.mockRejectedValueOnce(error);

        await expect(OperationalSettingsRepository.updateSection('audio', settings.audio)).rejects.toBe(error);
    });
});
