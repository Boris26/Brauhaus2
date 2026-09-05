export enum FermentationTriggerType {
    TIME_OFFSET = 'TIME_OFFSET',
    PLATO_THRESHOLD = 'PLATO_THRESHOLD',
    MANUAL = 'MANUAL',
}

export enum FermentationTriggerUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
    DAYS = 'DAYS',
    PLATO = 'PLATO',
}

export const CONTACT_TIME_UNITS = [
    FermentationTriggerUnit.MINUTES,
    FermentationTriggerUnit.HOURS,
    FermentationTriggerUnit.DAYS,
] as const;

export type ContactTimeUnit = typeof CONTACT_TIME_UNITS[number];

export const createRecipeActionId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
};

export interface FermentationRecipeActionFields {
    actionId?: string;
    triggerType?: FermentationTriggerType;
    triggerValue?: number;
    triggerUnit?: FermentationTriggerUnit;
    contactTime?: number;
    contactTimeUnit?: ContactTimeUnit;
}

type LegacyRecipeActionFields = FermentationRecipeActionFields & {
    triggerOffset?: number;
    triggerOffsetUnit?: FermentationTriggerUnit;
    triggerPlato?: number;
};

export const isTimeTriggerUnit = (unit: unknown): unit is ContactTimeUnit =>
    CONTACT_TIME_UNITS.includes(unit as ContactTimeUnit);

export const isValidRecipeAction = (value: FermentationRecipeActionFields): boolean => {
    if (!value.triggerType) return true;
    if (!value.actionId) return false;
    if (value.contactTime === undefined) {
        if (value.contactTimeUnit !== undefined) return false;
    } else if (!Number.isFinite(value.contactTime) || value.contactTime < 0 || !isTimeTriggerUnit(value.contactTimeUnit)) return false;
    if (value.triggerType === FermentationTriggerType.MANUAL) return value.triggerValue === undefined && value.triggerUnit === undefined;
    if (!Number.isFinite(value.triggerValue) || Number(value.triggerValue) < 0) return false;
    return value.triggerType === FermentationTriggerType.PLATO_THRESHOLD
        ? value.triggerUnit === FermentationTriggerUnit.PLATO
        : isTimeTriggerUnit(value.triggerUnit);
};

export const normalizeRecipeAction = <T extends LegacyRecipeActionFields>(value: T): T & FermentationRecipeActionFields => {
    const {triggerOffset: _offset, triggerOffsetUnit: _offsetUnit, triggerPlato: _plato, ...current} = value;
    const triggerType = current.triggerType;
    const legacyValue = triggerType === FermentationTriggerType.PLATO_THRESHOLD ? _plato : _offset;
    const triggerValue = current.triggerValue ?? legacyValue;
    const normalizedContact = current.contactTime === undefined || current.contactTime === null
        ? {...current, contactTime: undefined, contactTimeUnit: undefined}
        : {...current, contactTime: Number(current.contactTime), contactTimeUnit: isTimeTriggerUnit(current.contactTimeUnit) ? current.contactTimeUnit : FermentationTriggerUnit.DAYS};
    if (triggerType === FermentationTriggerType.MANUAL) {
        return {...normalizedContact, triggerValue: undefined, triggerUnit: undefined} as T & FermentationRecipeActionFields;
    }
    if (triggerType === FermentationTriggerType.PLATO_THRESHOLD) {
        return {...normalizedContact, triggerValue, triggerUnit: FermentationTriggerUnit.PLATO} as T & FermentationRecipeActionFields;
    }
    if (triggerType === FermentationTriggerType.TIME_OFFSET) {
        const candidate = normalizedContact.triggerUnit ?? _offsetUnit;
        return {...normalizedContact, triggerValue, triggerUnit: isTimeTriggerUnit(candidate) ? candidate : FermentationTriggerUnit.DAYS} as T & FermentationRecipeActionFields;
    }
    return {...normalizedContact, triggerValue: undefined, triggerUnit: undefined} as T & FermentationRecipeActionFields;
};

/** One-way browser-state compatibility boundary; callers receive canonical fields only. */
export const normalizeRecipeActionInput = (value: unknown): FermentationRecipeActionFields => {
    const candidate = (value && typeof value === 'object' ? value : {}) as LegacyRecipeActionFields;
    const normalized = normalizeRecipeAction(candidate);
    return {
        actionId: normalized.actionId,
        triggerType: normalized.triggerType,
        triggerValue: normalized.triggerValue,
        triggerUnit: normalized.triggerUnit,
        contactTime: normalized.contactTime,
        contactTimeUnit: normalized.contactTimeUnit,
    };
};

export const clearRecipeAction = <T extends FermentationRecipeActionFields>(value: T): T => {
    const {actionId, triggerType, triggerValue, triggerUnit, contactTime, contactTimeUnit, ...rest} = value;
    return rest as T;
};

export const fermentationUnitLabel = (unit?: FermentationTriggerUnit): string => ({
    [FermentationTriggerUnit.MINUTES]: 'Minuten',
    [FermentationTriggerUnit.HOURS]: 'Stunden',
    [FermentationTriggerUnit.DAYS]: 'Tage',
    [FermentationTriggerUnit.PLATO]: '°P',
}[unit ?? FermentationTriggerUnit.DAYS]);
