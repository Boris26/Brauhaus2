import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { FermentationSteps } from '../../model/Beer';
import { ProcedureType } from '../../enums/eProcedureType';

const allowedExecutionModes = [RestExecutionMode.TIMED, RestExecutionMode.CONFIRMATION_HOLD];
export const fixedProcedureTypes = ['Einmaischen', 'Abmaischen', 'Kochen'] as const;

export const createDefaultFermentationSteps = (): FermentationSteps[] => [
    {type: 'Einmaischen', temperature: 0},
    {type: 'Abmaischen', temperature: 0},
    {type: 'Kochen', temperature: 0, time: 0},
];

const normalizeFixedStep = (step: FermentationSteps): FermentationSteps => {
    if (step.type === 'Einmaischen' || step.type === 'Abmaischen') {
        return {type: step.type, temperature: step.temperature};
    }
    return {...step};
};

export const decoctionRequiresPreviousRastError = 'Dekoktion benötigt eine vorherige Rast.';

export const normalizeFermentationStep = (step: Partial<FermentationSteps>): FermentationSteps => {
    // Altrezepte ohne executionMode bleiben kompatibel und werden als TIMED behandelt.
    const procedureType = step.procedureType
        ?? (step.executionMode === RestExecutionMode.CONFIRMATION_HOLD ? ProcedureType.DECOCTION : ProcedureType.RAST);
    const executionMode = procedureType === ProcedureType.DECOCTION
        ? RestExecutionMode.CONFIRMATION_HOLD
        : (step.executionMode ?? RestExecutionMode.TIMED);

    if (procedureType === ProcedureType.DECOCTION) {
        return {
            type: step.type || 'Dekoktion',
            executionMode: RestExecutionMode.CONFIRMATION_HOLD,
            procedureType,
        };
    }

    return {
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

export const isValidExecutionMode = (value: unknown): value is RestExecutionMode => {
    return allowedExecutionModes.includes(value as RestExecutionMode);
};

export const getFermentationStepValidationErrors = (steps: FermentationSteps[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    let hasPreviousRast = false;

    steps.forEach((step, index) => {
        if (fixedProcedureTypes.some((type) => type === step.type)) return;

        const normalized = normalizeFermentationStep(step);
        if (normalized.procedureType === ProcedureType.DECOCTION) {
            if (!hasPreviousRast) {
                errors[`fermentationSteps.${index}.procedureType`] = decoctionRequiresPreviousRastError;
            }
            return;
        }

        hasPreviousRast = true;
    });

    return errors;
};
