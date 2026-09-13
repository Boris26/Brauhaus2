export interface FermentationNotificationSettings {
    fermentationActionWarningSeconds: number;
    fermentationActionReminderIntervalSeconds: number;
}

export type FermentationNotificationSettingsUpdate = Partial<FermentationNotificationSettings>;
