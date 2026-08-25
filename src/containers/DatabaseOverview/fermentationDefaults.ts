import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { FermentationSteps } from '../../model/Beer';
import { ProcedureType } from '../../enums/eProcedureType';

const allowedExecutionModes = [RestExecutionMode.TIMED, RestExecutionMode.CONFIRMATION_HOLD];
export const fixedProcedureTypes = ['Einmaischen', 'Abmaischen', 'Kochen'] as const;

export const createDefaultFermentationSteps = (): FermentationSteps[] => [
    {type: 'Einmaischen', temperature: 0},
    {type: 'Abmaischen', temperature: 0},
    {type: 'Kochen'},
];

const normalizeFixedStep = (step: FermentationSteps): FermentationSteps => {
    if (step.type === 'Einmaischen' || step.type === 'Abmaischen') {
        return {type: step.type, temperature: step.temperature};
    }
    // Kochzeit und -temperatur liegen im Formular ausschließlich auf dem Rezept.
    // Der feste Schritt wird erst beim Serialisieren daraus befüllt.
    return {type: 'Kochen'};
};

export const decoctionRequiresRastError = 'Bitte ordne der Dekoktion eine Rast zu.';
export const invalidDecoctionRastError = 'Bitte ordne der Dekoktion eine gültige Rast zu.';

export const createMashStepId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
};

export const normalizeFermentationStep = (step: Partial<FermentationSteps>): FermentationSteps => {
    // Altrezepte ohne executionMode bleiben kompatibel und werden als TIMED behandelt.
    const procedureType = step.procedureType
        ?? (step.executionMode === RestExecutionMode.CONFIRMATION_HOLD ? ProcedureType.DECOCTION : ProcedureType.RAST);
    const executionMode = procedureType === ProcedureType.DECOCTION
        ? RestExecutionMode.CONFIRMATION_HOLD
        : (step.executionMode ?? RestExecutionMode.TIMED);

    if (procedureType === ProcedureType.DECOCTION) {
        return {
            stepId: step.stepId,
            relatedRastId: step.relatedRastId,
            type: step.type || 'Dekoktion',
            executionMode: RestExecutionMode.CONFIRMATION_HOLD,
            procedureType,
        };
    }

    return {
        stepId: step.stepId,
        type: step.type ?? '',
        temperature: step.temperature === undefined || step.temperature === null ? undefined : Number(step.temperature),
        time: step.time,
        executionMode,
        procedureType,
    };
};

export const numberMashSteps = (steps: FermentationSteps[]): FermentationSteps[] => {
    let rastNumber = 0;
    const fixedSteps = new Map<string, FermentationSteps>();
    const mashSteps = steps.flatMap((step) => {
        if (fixedProcedureTypes.some((type) => type === step.type)) {
            if (!fixedSteps.has(step.type)) fixedSteps.set(step.type, normalizeFixedStep(step));
            return [];
        }
        const normalized = normalizeFermentationStep(step);
        normalized.stepId = normalized.stepId || createMashStepId();
        if (normalized.procedureType === ProcedureType.DECOCTION) {
            return [{...normalized, type: 'Dekoktion'}];
        }
        rastNumber += 1;
        return [{...normalized, type: `Rast ${rastNumber}`}];
    });

    createDefaultFermentationSteps().forEach((step) => {
        if (!fixedSteps.has(step.type)) fixedSteps.set(step.type, step);
    });

    return [
        fixedSteps.get('Einmaischen')!,
        ...mashSteps,
        fixedSteps.get('Abmaischen')!,
        fixedSteps.get('Kochen')!,
    ];
};

/** Adds stable IDs and migrates only legacy decoctions to the last preceding RAST. */
export const normalizeMashPlan = (steps: FermentationSteps[]): FermentationSteps[] => {
    let previousRastId: string | undefined;
    const normalized = numberMashSteps(steps);
    return normalized.map((step) => {
        if (fixedProcedureTypes.some((type) => type === step.type)) return step;
        if (step.procedureType === ProcedureType.RAST) {
            previousRastId = step.stepId;
            return step;
        }
        if (step.relatedRastId) return step;
        return previousRastId ? {...step, relatedRastId: previousRastId} : step;
    });
};

export const positionDecoctionAfterRast = (steps: FermentationSteps[], decoctionId: string): FermentationSteps[] => {
    const movingIndex = steps.findIndex((step) => step.stepId === decoctionId);
    if (movingIndex < 0) return steps;
    const moving = steps[movingIndex];
    if (moving.procedureType !== ProcedureType.DECOCTION || !moving.relatedRastId) return steps;
    const withoutMoving = steps.filter((_, index) => index !== movingIndex);
    const rastIndex = withoutMoving.findIndex((step) => step.stepId === moving.relatedRastId && step.procedureType === ProcedureType.RAST);
    if (rastIndex < 0) return steps;
    let insertionIndex = rastIndex + 1;
    while (insertionIndex < withoutMoving.length
        && withoutMoving[insertionIndex].procedureType === ProcedureType.DECOCTION
        && withoutMoving[insertionIndex].relatedRastId === moving.relatedRastId) insertionIndex += 1;
    withoutMoving.splice(insertionIndex, 0, moving);
    return numberMashSteps(withoutMoving);
};

export const isValidExecutionMode = (value: unknown): value is RestExecutionMode => {
    return allowedExecutionModes.includes(value as RestExecutionMode);
};

export const getFermentationStepValidationErrors = (steps: FermentationSteps[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const rastIds = new Set(steps
        .filter((step) => !fixedProcedureTypes.some((type) => type === step.type) && normalizeFermentationStep(step).procedureType === ProcedureType.RAST)
        .map((step) => step.stepId)
        .filter((id): id is string => Boolean(id)));

    steps.forEach((step, index) => {
        if (fixedProcedureTypes.some((type) => type === step.type)) return;

        const normalized = normalizeFermentationStep(step);
        if (normalized.procedureType === ProcedureType.DECOCTION) {
            if (!normalized.relatedRastId) errors[`fermentationSteps.${index}.relatedRastId`] = decoctionRequiresRastError;
            else if (!rastIds.has(normalized.relatedRastId)) errors[`fermentationSteps.${index}.relatedRastId`] = invalidDecoctionRastError;
            return;
        }
    });

    return errors;
};
