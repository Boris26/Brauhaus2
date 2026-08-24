import axios from 'axios';
import { AudioRepository } from './AudioRepository';
import { SoundType } from '../enums/eSoundType';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AudioRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.post.mockResolvedValue({ data: { success: true, sound: SoundType.ALARM } } as any);
    });

    it.each([
        [SoundType.ALARM, 'ALARM'],
        [SoundType.BREW_FINISHED, 'BREW_FINISHED'],
    ])('posts %s as a logical sound value', async (sound, expectedSound) => {
        await AudioRepository.testSound(sound);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            '/api/audio/test',
            { sound: expectedSound },
        );
    });

    it('rejects an unsuccessful response', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { success: false, error: 'Sound playback failed' },
        } as any);

        await expect(AudioRepository.testSound(SoundType.WARNING)).rejects.toThrow('Sound playback failed');
    });
});
