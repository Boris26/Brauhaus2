import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { FermentationSteps } from '../../model/Beer';
import { ProcedureType } from '../../enums/eProcedureType';

const allowedExecutionModes = [RestExecutionMode.TIMED, RestExecutionMode.CONFIRMATION_HOLD];

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
    return steps.map((step) => {
        if (["Einmaischen", "Abmaischen", "Kochen"].includes(step.type)) return step;
        const normalized = normalizeFermentationStep(step);
        if (normalized.procedureType === ProcedureType.DECOCTION) {
            return {...normalized, type: 'Dekoktion'};
        }
        rastNumber += 1;
        return {...normalized, type: `Rast ${rastNumber}`};
    });
};

export const isValidExecutionMode = (value: unknown): value is RestExecutionMode => {
    return allowedExecutionModes.includes(value as RestExecutionMode);
};
