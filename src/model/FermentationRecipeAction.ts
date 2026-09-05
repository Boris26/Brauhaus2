export enum FermentationTriggerType {
    TIME_OFFSET = 'TIME_OFFSET',
    PLATO_THRESHOLD = 'PLATO_THRESHOLD',
    MANUAL = 'MANUAL',
}

export enum FermentationTriggerTimeUnit {
    HOURS = 'HOURS',
    DAYS = 'DAYS',
}

/** Optional recipe fields. Their absence is the supported legacy representation. */
export interface FermentationRecipeActionFields {
    triggerType?: FermentationTriggerType;
    triggerOffset?: number;
    triggerUnit?: FermentationTriggerTimeUnit;
    triggerPlato?: number;
    contactTime?: number;
    contactTimeUnit?: FermentationTriggerTimeUnit;
}
