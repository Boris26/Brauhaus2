import axios from 'axios';
import {SystemRepository} from './SystemRepository';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SystemRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.post.mockResolvedValue({data: {success: true}} as any);
    });

    it('sends the shutdown command through the system API', async () => {
        await SystemRepository.shutdown();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/system/shutdown');
    });
});
