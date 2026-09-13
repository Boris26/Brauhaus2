import {BaseRepository} from './BaseRepository';
import {FermentationNotificationSettings, FermentationNotificationSettingsUpdate} from '../model/FermentationNotificationSettings';

export class FermentationNotificationSettingsRepository extends BaseRepository {
    static async get(): Promise<FermentationNotificationSettings> {
        return this.get<FermentationNotificationSettings>('config');
    }

    static async update(settings: FermentationNotificationSettingsUpdate): Promise<FermentationNotificationSettings> {
        return this.put<FermentationNotificationSettings>('config', settings);
    }
}
