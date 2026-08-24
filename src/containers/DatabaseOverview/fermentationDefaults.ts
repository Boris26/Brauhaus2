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

    return {
        type: step.type ?? '',
        temperature: Number(step.temperature ?? 0),
        time: step.time,
        executionMode,
        procedureType,
    };
};

export const isValidExecutionMode = (value: unknown): value is RestExecutionMode => {
    return allowedExecutionModes.includes(value as RestExecutionMode);
};
