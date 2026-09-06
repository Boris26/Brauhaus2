/** Trigger kinds supported by the BRAUHAUS v2 recipe-action contract. */
export enum TriggerType {
    TIME_OFFSET = 'TIME_OFFSET',
    PLATO_THRESHOLD = 'PLATO_THRESHOLD',
    MANUAL = 'MANUAL',
}

/** Units for a trigger value. PLATO is intentionally not a time unit. */
export enum TriggerUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
    DAYS = 'DAYS',
    PLATO = 'PLATO',
}

/** Units accepted by duration fields such as contactTime. */
export enum TimeUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
    DAYS = 'DAYS',
}

export const TIME_TRIGGER_UNITS = [TriggerUnit.MINUTES, TriggerUnit.HOURS, TriggerUnit.DAYS] as const;
export const CONTACT_TIME_UNITS = [TimeUnit.MINUTES, TimeUnit.HOURS, TimeUnit.DAYS] as const;

export interface RecipeActionFields {
    triggerType: TriggerType;
    triggerValue?: number | null;
    triggerUnit?: TriggerUnit | null;
    contactTime?: number | null;
    contactTimeUnit?: TimeUnit | null;
}

export const isTimeTriggerUnit = (unit: unknown): unit is TriggerUnit.MINUTES | TriggerUnit.HOURS | TriggerUnit.DAYS =>
    TIME_TRIGGER_UNITS.includes(unit as typeof TIME_TRIGGER_UNITS[number]);
export const isTimeUnit = (unit: unknown): unit is TimeUnit => Object.values(TimeUnit).includes(unit as TimeUnit);

export const isValidRecipeAction = (value: Partial<RecipeActionFields>): boolean => {
    if (!value.triggerType) return true;
    if (value.contactTime == null) {
        if (value.contactTimeUnit != null) return false;
    } else if (!Number.isFinite(value.contactTime) || value.contactTime < 0 || !isTimeUnit(value.contactTimeUnit)) return false;
    if (value.triggerType === TriggerType.MANUAL) return value.triggerValue == null && value.triggerUnit == null;
    if (!Number.isFinite(value.triggerValue) || Number(value.triggerValue) < 0) return false;
    return value.triggerType === TriggerType.PLATO_THRESHOLD
        ? value.triggerUnit === TriggerUnit.PLATO
        : isTimeTriggerUnit(value.triggerUnit);
};

export const hasRecipeAction = (value: Partial<RecipeActionFields>): boolean =>
    Boolean(value.triggerType && isValidRecipeAction(value));

/** Normalizes only the current BRAUHAUS v2 contract when an editor field changes. */
export const normalizeRecipeAction = <T extends Partial<RecipeActionFields>>(value: T): T => {
    const normalizedContact = value.contactTime === undefined || value.contactTime === null
        ? {...value, contactTime: null, contactTimeUnit: null}
        : {...value, contactTime: Number(value.contactTime), contactTimeUnit: isTimeUnit(value.contactTimeUnit) ? value.contactTimeUnit : TimeUnit.DAYS};
    if (value.triggerType === TriggerType.MANUAL) return {...normalizedContact, triggerValue: null, triggerUnit: null} as T;
    if (value.triggerType === TriggerType.PLATO_THRESHOLD) return {...normalizedContact, triggerUnit: TriggerUnit.PLATO} as T;
    if (value.triggerType === TriggerType.TIME_OFFSET) {
        return {...normalizedContact, triggerUnit: isTimeTriggerUnit(value.triggerUnit) ? value.triggerUnit : TriggerUnit.DAYS} as T;
    }
    return {...normalizedContact, triggerValue: null, triggerUnit: null} as T;
};

export const clearRecipeAction = <T extends Partial<RecipeActionFields>>(value: T): Omit<T, keyof RecipeActionFields> => {
    const {triggerType, triggerValue, triggerUnit, contactTime, contactTimeUnit, ...rest} = value;
    return rest;
};

export const unitLabel = (unit?: TriggerUnit | TimeUnit): string => ({
    MINUTES: 'Minuten', HOURS: 'Stunden', DAYS: 'Tage', PLATO: '°P',
}[unit ?? TimeUnit.DAYS]);
