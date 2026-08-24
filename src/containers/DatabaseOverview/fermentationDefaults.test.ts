import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { normalizeFermentationStep, isValidExecutionMode, numberMashSteps } from './fermentationDefaults';
import {ProcedureType} from '../../enums/eProcedureType';

describe('fermentationDefaults', () => {
    test('imported step without executionMode defaults to TIMED', () => {
        const step = normalizeFermentationStep({ type: 'Rast 1', temperature: 64, time: 40 });
        expect(step.executionMode).toBe(RestExecutionMode.TIMED);
        expect(step.procedureType).toBe(ProcedureType.RAST);
    });

    test('legacy confirmation hold is normalized to DECOCTION without using its display name', () => {
        const step = normalizeFermentationStep({type: 'Kochmaische', temperature: 66, executionMode: RestExecutionMode.CONFIRMATION_HOLD});

        expect(step.procedureType).toBe(ProcedureType.DECOCTION);
    });

    test('imported CONFIRMATION_HOLD without time remains CONFIRMATION_HOLD', () => {
        const step = normalizeFermentationStep({
            type: 'Dickmaische führen',
            temperature: 64,
            executionMode: RestExecutionMode.CONFIRMATION_HOLD,
        });
        expect(step.executionMode).toBe(RestExecutionMode.CONFIRMATION_HOLD);
        expect(step.time).toBeUndefined();
    });

    test('time=0 is not converted to CONFIRMATION_HOLD', () => {
        const step = normalizeFermentationStep({ type: 'Rast 1', temperature: 64, time: 0 });
        expect(step.executionMode).toBe(RestExecutionMode.TIMED);
        expect(step.time).toBe(0);
    });

    test('invalid executionMode is rejected clearly by validator helper', () => {
        expect(isValidExecutionMode('SOMETHING_ELSE')).toBe(false);
    });

    test('explicit confirmation-hold RAST remains a RAST', () => {
        const step = normalizeFermentationStep({type: 'Rast', temperature: 68, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.CONFIRMATION_HOLD});
        expect(step).toMatchObject({procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.CONFIRMATION_HOLD, temperature: 68});
        expect(step.time).toBeUndefined();
    });

    test('decoctions contain no fake recipe temperature or time', () => {
        const step = normalizeFermentationStep({type: 'Alt', temperature: 68, time: 10, procedureType: ProcedureType.DECOCTION});
        expect(step).toEqual({type: 'Alt', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD});
    });

    test('numbers only RAST steps', () => {
        expect(numberMashSteps([
            {type: 'a', temperature: 62, procedureType: ProcedureType.RAST},
            {type: 'b', procedureType: ProcedureType.DECOCTION},
            {type: 'c', temperature: 68, procedureType: ProcedureType.RAST},
            {type: 'd', procedureType: ProcedureType.DECOCTION},
            {type: 'e', temperature: 72, procedureType: ProcedureType.RAST},
        ]).map(step => step.type)).toEqual(['Rast 1', 'Dekoktion', 'Rast 2', 'Dekoktion', 'Rast 3']);
    });
});
