import axios from 'axios';
import {BaseURL} from '../global';
import {OperationalSettings, OperationalSettingsSection} from '../model/OperationalSettings';

const SETTINGS_URL = `${BaseURL}/Settings`;

export class OperationalSettingsRepository {
    static async get(): Promise<OperationalSettings> {
        const response = await axios.get<OperationalSettings>(SETTINGS_URL);
        return response.data;
    }

    static async getSection<Section extends OperationalSettingsSection>(
        section: Section,
    ): Promise<OperationalSettings[Section]> {
        const response = await axios.get<OperationalSettings[Section]>(`${SETTINGS_URL}/${section}`);
        return response.data;
    }

    static async updateSection<Section extends OperationalSettingsSection>(
        section: Section,
        settings: OperationalSettings[Section],
    ): Promise<OperationalSettings[Section]> {
        const response = await axios.put<OperationalSettings[Section]>(`${SETTINGS_URL}/${section}`, settings);
        return response.data;
    }
}
