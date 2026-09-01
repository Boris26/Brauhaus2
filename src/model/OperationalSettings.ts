export interface WaterFillingSettings {
    pulsesPerLiter: number;
    sensorStartDelaySeconds: number;
}

export interface AudioSettings {
    enabled: boolean;
    confirmationRepeatSeconds: number;
    alarmRepeatSeconds: number;
}

export interface ProcessSafetySettings {
    heatingTimeoutMinutes: number;
    confirmationTimeoutMinutes: number;
}

export interface HeaterSafetySettings {
    offGracePeriodSeconds: number;
    maxOffTemperatureRise: number;
    riseObservationWindowSeconds: number;
}

export interface OperationalSettings {
    waterFilling: WaterFillingSettings;
    audio: AudioSettings;
    processSafety: ProcessSafetySettings;
    heaterSafety: HeaterSafetySettings;
}

export type OperationalSettingsSection = keyof OperationalSettings;
