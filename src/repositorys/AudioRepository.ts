import axios from 'axios';
import { AudioURL } from '../global';
import { SoundType } from '../enums/eSoundType';

interface SoundTestResponse {
    success: boolean;
    sound?: SoundType;
    error?: string;
}

export class AudioRepository {
    static async testSound(sound: SoundType): Promise<void> {
        const response = await axios.post<SoundTestResponse>(`${AudioURL}/test`, { sound });
        if (!response.data.success) {
            throw new Error(response.data.error || 'Sound playback failed');
        }
    }
}
