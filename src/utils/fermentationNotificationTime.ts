export type FermentationTimeUnit = 'minutes' | 'hours';

export interface FermentationTimeValue {
    value: string;
    unit: FermentationTimeUnit;
}

const secondsPerUnit: Record<FermentationTimeUnit, number> = {minutes: 60, hours: 3600};

export const secondsToFermentationTime = (seconds: number): FermentationTimeValue => {
    const unit: FermentationTimeUnit = seconds % secondsPerUnit.hours === 0 ? 'hours' : 'minutes';
    return {value: String(seconds / secondsPerUnit[unit]), unit};
};

export const fermentationTimeToSeconds = (value: string, unit: FermentationTimeUnit): number | null => {
    if (!value.trim()) return null;
    const seconds = Number(value) * secondsPerUnit[unit];
    return Number.isFinite(seconds) && Number.isInteger(seconds) ? seconds : null;
};
