import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { normalizeFermentationStep, isValidExecutionMode } from './fermentationDefaults';
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
});
