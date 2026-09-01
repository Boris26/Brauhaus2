import axios from 'axios';
import {HeaterSafetyRepository} from './HeaterSafetyRepository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HeaterSafetyRepository', () => {
    beforeEach(() => jest.clearAllMocks());

    it('loads the confirmed heater safety snapshot', async () => {
        const snapshot = {state: 'MONITORING' as const, latched: false};
        mockedAxios.get.mockResolvedValueOnce({data: snapshot});

        await expect(HeaterSafetyRepository.get()).resolves.toEqual(snapshot);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/controller/Safety/Heater');
    });

    it('posts reset and returns the confirmed backend snapshot', async () => {
        const snapshot = {state: 'DISARMED' as const, latched: false};
        mockedAxios.post.mockResolvedValueOnce({data: snapshot});

        await expect(HeaterSafetyRepository.reset()).resolves.toEqual(snapshot);
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/controller/Safety/Heater/Reset');
    });

    it('propagates reset errors without manufacturing a local state', async () => {
        const error = new Error('reset rejected');
        mockedAxios.post.mockRejectedValueOnce(error);

        await expect(HeaterSafetyRepository.reset()).rejects.toBe(error);
    });
});
