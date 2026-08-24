export enum SoundType {
    ALARM = 'ALARM',
    WARNING = 'WARNING',
    CONFIRMATION = 'CONFIRMATION',
    REST_FINISHED = 'REST_FINISHED',
    BREW_FINISHED = 'BREW_FINISHED',
    SUCCESS = 'SUCCESS',
}

export const SOUND_LABELS: Record<SoundType, string> = {
    [SoundType.ALARM]: 'Alarm',
    [SoundType.WARNING]: 'Warnung',
    [SoundType.CONFIRMATION]: 'Bestätigung',
    [SoundType.REST_FINISHED]: 'Rast beendet',
    [SoundType.BREW_FINISHED]: 'Brauvorgang beendet',
    [SoundType.SUCCESS]: 'Erfolgreich',
};

export const SOUND_TYPES: SoundType[] = Object.values(SoundType);
