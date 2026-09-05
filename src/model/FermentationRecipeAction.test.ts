import {clearRecipeAction, CONTACT_TIME_UNITS, FermentationTriggerType, FermentationTriggerUnit, isValidRecipeAction, normalizeRecipeAction, normalizeRecipeActionInput} from './FermentationRecipeAction';

describe('Recipe Action Contract', () => {
  it('preserves every canonical field and actionId', () => {
    const value = {actionId: 'action-1', triggerType: FermentationTriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: FermentationTriggerUnit.HOURS, contactTime: 3, contactTimeUnit: FermentationTriggerUnit.DAYS};
    expect(normalizeRecipeAction(value)).toEqual(value);
  });
  it.each([FermentationTriggerUnit.MINUTES, FermentationTriggerUnit.HOURS, FermentationTriggerUnit.DAYS])('accepts TIME_OFFSET %s', unit => {
    expect(isValidRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.TIME_OFFSET, triggerValue: 1, triggerUnit: unit})).toBe(true);
  });
  it('normalizes Plato and manual trigger changes', () => {
    expect(normalizeRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: FermentationTriggerUnit.DAYS}).triggerUnit).toBe(FermentationTriggerUnit.PLATO);
    expect(normalizeRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.MANUAL, triggerValue: 5, triggerUnit: FermentationTriggerUnit.PLATO})).toMatchObject({triggerValue: undefined, triggerUnit: undefined});
    expect(isValidRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.TIME_OFFSET, triggerValue: 1, triggerUnit: FermentationTriggerUnit.PLATO})).toBe(false);
    expect(CONTACT_TIME_UNITS).not.toContain(FermentationTriggerUnit.PLATO);
    expect(isValidRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.MANUAL, contactTime: 2, contactTimeUnit: FermentationTriggerUnit.PLATO as any})).toBe(false);
    expect(normalizeRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.MANUAL, contactTime: 2, contactTimeUnit: FermentationTriggerUnit.PLATO as any})).toMatchObject({contactTime: 2, contactTimeUnit: FermentationTriggerUnit.DAYS});
  });
  it('keeps every trigger-type transition valid', () => {
    const time = normalizeRecipeAction({actionId: 'a', triggerType: FermentationTriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: FermentationTriggerUnit.DAYS});
    const plato = normalizeRecipeAction({...time, triggerType: FermentationTriggerType.PLATO_THRESHOLD});
    const manual = normalizeRecipeAction({...plato, triggerType: FermentationTriggerType.MANUAL});
    const timeAgain = normalizeRecipeAction({...manual, triggerType: FermentationTriggerType.TIME_OFFSET});
    expect(plato).toMatchObject({triggerValue: 4, triggerUnit: FermentationTriggerUnit.PLATO});
    expect(manual).toMatchObject({triggerValue: undefined, triggerUnit: undefined});
    expect(timeAgain).toMatchObject({triggerUnit: FermentationTriggerUnit.DAYS});
    expect(isValidRecipeAction(timeAgain)).toBe(false); // a value is deliberately required before submit
  });
  it('migrates legacy values without retaining legacy fields', () => {
    const offset = normalizeRecipeActionInput({actionId: 'a', triggerType: FermentationTriggerType.TIME_OFFSET, triggerOffset: 4, triggerOffsetUnit: FermentationTriggerUnit.HOURS});
    const plato = normalizeRecipeActionInput({actionId: 'b', triggerType: FermentationTriggerType.PLATO_THRESHOLD, triggerPlato: 5});
    expect(offset).toMatchObject({triggerValue: 4, triggerUnit: FermentationTriggerUnit.HOURS});
    expect(plato).toMatchObject({triggerValue: 5, triggerUnit: FermentationTriggerUnit.PLATO});
    expect(offset).not.toHaveProperty('triggerOffset'); expect(plato).not.toHaveProperty('triggerPlato');
  });
  it('clears action metadata when usage or phase stops supporting actions', () => {
    expect(clearRecipeAction({id: 'master', actionId: 'action', triggerType: FermentationTriggerType.MANUAL, contactTime: 2, contactTimeUnit: FermentationTriggerUnit.DAYS})).toEqual({id: 'master'});
  });
});
