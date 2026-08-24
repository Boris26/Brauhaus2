import { RestExecutionMode } from '../../enums/eRestExecutionMode';
import { createMashStepId, decoctionRequiresRastError, getFermentationStepValidationErrors, invalidDecoctionRastError, normalizeFermentationStep, isValidExecutionMode, normalizeMashPlan, numberMashSteps, positionDecoctionAfterRast, createDefaultFermentationSteps } from './fermentationDefaults';
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
        expect(step).toEqual({stepId: undefined, relatedRastId: undefined, type: 'Alt', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD});
    });

    test('numbers only RAST steps', () => {
        expect(numberMashSteps([
            {type: 'a', temperature: 62, procedureType: ProcedureType.RAST},
            {type: 'b', procedureType: ProcedureType.DECOCTION},
            {type: 'c', temperature: 68, procedureType: ProcedureType.RAST},
            {type: 'd', procedureType: ProcedureType.DECOCTION},
            {type: 'e', temperature: 72, procedureType: ProcedureType.RAST},
        ]).map(step => step.type)).toEqual(['Einmaischen', 'Rast 1', 'Dekoktion', 'Rast 2', 'Dekoktion', 'Rast 3', 'Abmaischen', 'Kochen']);
    });

    test('default mash plan contains each fixed process step once and no fake mash-in/out time', () => {
        expect(createDefaultFermentationSteps()).toEqual([
            {type: 'Einmaischen', temperature: 0},
            {type: 'Abmaischen', temperature: 0},
            {type: 'Kochen', temperature: 0, time: 0},
        ]);
    });

    test('normalization restores missing fixed steps, removes duplicates and preserves saved values', () => {
        const normalized = numberMashSteps([
            {type: 'Einmaischen', temperature: 57, time: 12},
            {type: 'Einmaischen', temperature: 60},
            {type: 'Rast', temperature: 63, time: 30},
            {type: 'Abmaischen', temperature: 78, time: 5},
        ]);

        expect(normalized.map((step) => step.type)).toEqual(['Einmaischen', 'Rast 1', 'Abmaischen', 'Kochen']);
        expect(normalized[0]).toEqual({type: 'Einmaischen', temperature: 57});
        expect(normalized[2]).toEqual({type: 'Abmaischen', temperature: 78});
    });

    test('repeated normalization never duplicates fixed steps', () => {
        const once = numberMashSteps([]);
        const twice = numberMashSteps(once);
        expect(twice.filter((step) => step.type === 'Einmaischen')).toHaveLength(1);
        expect(twice.filter((step) => step.type === 'Abmaischen')).toHaveLength(1);
        expect(twice.filter((step) => step.type === 'Kochen')).toHaveLength(1);
    });

    test('creates stable UUIDs and migrates a legacy decoction to the preceding rast', () => {
        const once = normalizeMashPlan([
            {type: 'Rast', temperature: 63, time: 20},
            {type: 'Dekoktion', executionMode: RestExecutionMode.CONFIRMATION_HOLD},
        ]);
        const configurable = once.filter((step) => step.stepId);
        expect(configurable.every((step) => step.stepId).valueOf()).toBe(true);
        expect(configurable[1].relatedRastId).toBe(configurable[0].stepId);
        const twice = numberMashSteps(once);
        expect(twice.filter((step) => step.stepId).map((step) => step.stepId)).toEqual(configurable.map((step) => step.stepId));
        expect(createMashStepId()).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('does not invent a legacy relationship when decoction precedes every rast', () => {
        const normalized = normalizeMashPlan([
            {type: 'Dekoktion', executionMode: RestExecutionMode.CONFIRMATION_HOLD},
            {type: 'Rast', temperature: 63, time: 20},
        ]);
        expect(normalized.find((step) => step.procedureType === ProcedureType.DECOCTION)?.relatedRastId).toBeUndefined();
    });

    test('positions reassigned and multiple decoctions after their rast in stable order', () => {
        const [a, b, c, decoctionA, decoctionB] = ['a', 'b', 'c', 'da', 'db'].map((stepId, index) => ({
            stepId, type: index < 3 ? `Rast ${index + 1}` : 'Dekoktion', temperature: index < 3 ? 60 + index : undefined,
            procedureType: index < 3 ? ProcedureType.RAST : ProcedureType.DECOCTION,
            relatedRastId: index < 3 ? undefined : 'a',
        } as any));
        let positioned = positionDecoctionAfterRast([a, b, c, decoctionA, decoctionB], 'da');
        positioned = positionDecoctionAfterRast(positioned, 'db');
        expect(positioned.filter((step) => step.stepId).map((step) => step.stepId)).toEqual(['a', 'da', 'db', 'b', 'c']);
        positioned = positioned.map((step) => step.stepId === 'da' ? {...step, relatedRastId: 'c'} : step);
        expect(positionDecoctionAfterRast(positioned, 'da').filter((step) => step.stepId).map((step) => step.stepId)).toEqual(['a', 'db', 'b', 'c', 'da']);
    });
});

describe('getFermentationStepValidationErrors', () => {
    const rast = (stepId = 'rast-id', executionMode: RestExecutionMode = RestExecutionMode.TIMED) => ({
        type: 'Rast', temperature: 65, time: executionMode === RestExecutionMode.TIMED ? 10 : undefined,
        stepId, procedureType: ProcedureType.RAST, executionMode,
    });
    const decoction = (relatedRastId?: string) => ({stepId: 'decoction-id', relatedRastId, type: 'Dekoktion', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD});

    test.each([
        ['decoction without an assignment', [decoction(), rast()], 0],
        ['fixed mash-in before unassigned decoction', [{type: 'Einmaischen', temperature: 55}, decoction(), rast()], 1],
    ])('rejects %s', (_name, steps, invalidIndex) => {
        expect(getFermentationStepValidationErrors(steps as any)).toEqual({
            [`fermentationSteps.${invalidIndex}.relatedRastId`]: decoctionRequiresRastError,
        });
    });

    test.each([
        ['rast, decoction, rast', [rast(), decoction('rast-id'), rast('other')]],
        ['multiple decoctions after a rast', [rast(), decoction('rast-id'), {...decoction('rast-id'), stepId: 'decoction-2'}, rast('other')]],
        ['confirmation-hold rast before decoction', [rast('rast-id', RestExecutionMode.CONFIRMATION_HOLD), decoction('rast-id')]],
    ])('accepts %s', (_name, steps) => {
        expect(getFermentationStepValidationErrors(steps as any)).toEqual({});
    });

    test('rejects a relationship that points to a decoction', () => {
        expect(getFermentationStepValidationErrors([rast(), decoction('decoction-id')] as any)).toEqual({
            'fermentationSteps.1.relatedRastId': invalidDecoctionRastError,
        });
    });
});
