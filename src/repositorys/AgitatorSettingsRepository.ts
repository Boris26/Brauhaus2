import axios from 'axios';
import {BaseURL} from '../global';
import {AgitatorSettings} from '../model/AgitatorSettings';

const AGITATOR_SETTINGS_URL = `${BaseURL}/Settings/Agitator`;

export class AgitatorSettingsRepository {
    static async get(): Promise<AgitatorSettings> {
        const response = await axios.get<AgitatorSettings>(AGITATOR_SETTINGS_URL);
        return response.data;
    }

    static async update(settings: AgitatorSettings): Promise<AgitatorSettings> {
        const response = await axios.put<AgitatorSettings>(AGITATOR_SETTINGS_URL, settings);
        return response.data;
    }
}
