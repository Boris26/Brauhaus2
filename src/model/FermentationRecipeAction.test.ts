import {clearRecipeAction, CONTACT_TIME_UNITS, TimeUnit, TriggerType, TriggerUnit, isValidRecipeAction, normalizeRecipeAction} from './FermentationRecipeAction';

describe('Recipe Action Contract', () => {
  it('defines exactly the BRAUHAUS v2 enums', () => {
    expect(Object.values(TriggerType)).toEqual(['TIME_OFFSET', 'PLATO_THRESHOLD', 'MANUAL']);
    expect(Object.values(TriggerUnit)).toEqual(['MINUTES', 'HOURS', 'DAYS', 'PLATO']);
    expect(Object.values(TimeUnit)).toEqual(['MINUTES', 'HOURS', 'DAYS']);
  });
  it('preserves every canonical field and actionId', () => {
    const value = {actionId: 'action-1', triggerType: TriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: TriggerUnit.HOURS, contactTime: 3, contactTimeUnit: TimeUnit.DAYS};
    expect(normalizeRecipeAction(value)).toEqual(value);
  });
  it.each([TriggerUnit.MINUTES, TriggerUnit.HOURS, TriggerUnit.DAYS])('accepts TIME_OFFSET %s', unit => {
    expect(isValidRecipeAction({actionId: 'a', triggerType: TriggerType.TIME_OFFSET, triggerValue: 1, triggerUnit: unit})).toBe(true);
  });
  it('normalizes Plato and manual trigger changes', () => {
    expect(normalizeRecipeAction({actionId: 'a', triggerType: TriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: TriggerUnit.DAYS}).triggerUnit).toBe(TriggerUnit.PLATO);
    expect(normalizeRecipeAction({actionId: 'a', triggerType: TriggerType.MANUAL, triggerValue: 5, triggerUnit: TriggerUnit.PLATO})).toMatchObject({triggerValue: null, triggerUnit: null});
    expect(isValidRecipeAction({actionId: 'a', triggerType: TriggerType.TIME_OFFSET, triggerValue: 1, triggerUnit: TriggerUnit.PLATO})).toBe(false);
    expect(CONTACT_TIME_UNITS).not.toContain(TriggerUnit.PLATO);
    expect(isValidRecipeAction({actionId: 'a', triggerType: TriggerType.MANUAL, contactTime: 2, contactTimeUnit: TriggerUnit.PLATO as any})).toBe(false);
    expect(normalizeRecipeAction({actionId: 'a', triggerType: TriggerType.MANUAL, contactTime: 2, contactTimeUnit: TriggerUnit.PLATO as any})).toMatchObject({contactTime: 2, contactTimeUnit: TimeUnit.DAYS});
  });
  it('keeps every trigger-type transition valid', () => {
    const time = normalizeRecipeAction({actionId: 'a', triggerType: TriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: TriggerUnit.DAYS});
    const plato = normalizeRecipeAction({...time, triggerType: TriggerType.PLATO_THRESHOLD});
    const manual = normalizeRecipeAction({...plato, triggerType: TriggerType.MANUAL});
    const timeAgain = normalizeRecipeAction({...manual, triggerType: TriggerType.TIME_OFFSET});
    expect(plato).toMatchObject({triggerValue: 4, triggerUnit: TriggerUnit.PLATO});
    expect(manual).toMatchObject({triggerValue: null, triggerUnit: null});
    expect(timeAgain).toMatchObject({triggerUnit: TriggerUnit.DAYS});
    expect(isValidRecipeAction(timeAgain)).toBe(false); // a value is deliberately required before submit
  });
  it('clears action metadata when usage or phase stops supporting actions', () => {
    expect(clearRecipeAction({id: 'master', actionId: 'action', triggerType: TriggerType.MANUAL, contactTime: 2, contactTimeUnit: TimeUnit.DAYS})).toEqual({id: 'master'});
  });
});
