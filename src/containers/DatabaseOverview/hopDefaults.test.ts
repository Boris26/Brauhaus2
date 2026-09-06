import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';
import { hopTimeUnitsByUsage, normalizeHopDto, updateHopUsage, validateHopDto } from './hopDefaults';
import {TimeUnit, TriggerType, TriggerUnit} from '../../model/FermentationRecipeAction';

const hop = (overrides: Partial<HopDTO> = {}): HopDTO => ({
    id: '1', quantity: 10, usage: HopUsage.BOIL, ...overrides,
});

const expectedUnits: Record<HopUsage, readonly HopTimeUnit[]> = {
    [HopUsage.FIRST_WORT]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.BOIL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.WHIRLPOOL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.DRY_HOP]: [],
};

describe('hopDefaults', () => {
    test.each(Object.entries(expectedUnits))('%s exposes only its allowed time units', (usage, units) => {
        expect(hopTimeUnitsByUsage[usage as HopUsage]).toEqual(units);
    });

    test.each([HopUsage.FIRST_WORT, HopUsage.BOIL, HopUsage.WHIRLPOOL])('%s without addition time is valid', (usage) => {
        expect(validateHopDto(hop({ usage }))).toBe(true);
    });

    test('DRY_HOP requires a complete Recipe Action', () => {
        expect(validateHopDto(hop({usage: HopUsage.DRY_HOP}))).toBe(false);
        expect(validateHopDto(hop({usage: HopUsage.DRY_HOP, triggerType: TriggerType.MANUAL, triggerValue: null, triggerUnit: null}))).toBe(true);
    });

    test.each(Object.values(HopUsage).flatMap((usage) =>
        Object.values(HopTimeUnit).map((timeUnit) => [usage, timeUnit, expectedUnits[usage].includes(timeUnit)] as const)
    ))('%s + %s validity is %s', (usage, timeUnit, isValid) => {
        expect(validateHopDto(hop({ usage, additionTime: 3, timeUnit }))).toBe(isValid);
    });

    test('quantity <= 0 is invalid', () => {
        expect(validateHopDto(hop({ quantity: 0 }))).toBe(false);
        expect(validateHopDto(hop({ quantity: -1 }))).toBe(false);
    });

    test('time and timeUnit must either both be present or both be absent', () => {
        expect(validateHopDto(hop({ additionTime: 10 }))).toBe(false);
        expect(validateHopDto(hop({ timeUnit: HopTimeUnit.MINUTES }))).toBe(false);
    });

    test.each([
        [HopUsage.FIRST_WORT, HopTimeUnit.MINUTES],
        [HopUsage.BOIL, HopTimeUnit.MINUTES],
        [HopUsage.WHIRLPOOL, HopTimeUnit.MINUTES],
    ])('normalizes an invalid timed %s unit to %s without changing usage or time', (usage, expectedUnit) => {
        const invalidUnit = HopTimeUnit.DAYS;
        expect(normalizeHopDto(hop({ usage, additionTime: 3, timeUnit: invalidUnit }))).toMatchObject({
            usage, additionTime: 3, timeUnit: expectedUnit,
        });
    });

    test('normalization does not invent time or a unit for an untimed hop', () => {
        expect(normalizeHopDto(hop({ usage: HopUsage.DRY_HOP }))).toMatchObject({usage: HopUsage.DRY_HOP});
        expect(normalizeHopDto(hop({ usage: HopUsage.DRY_HOP })).timeUnit).toBeUndefined();
    });

    test('switching a brew-day hop to DRY_HOP drops timing without interpreting it as an action', () => {
        const updated = updateHopUsage(hop({usage: HopUsage.BOIL, additionTime: 10, timeUnit: HopTimeUnit.MINUTES}), HopUsage.DRY_HOP);
        expect(updated).toMatchObject({usage: HopUsage.DRY_HOP});
        expect(updated).not.toHaveProperty('triggerValue');
        expect(updated).not.toHaveProperty('triggerUnit');
        expect(updated.additionTime).toBeUndefined();
        expect(updated.timeUnit).toBeUndefined();
    });

    test.each([
        [HopUsage.WHIRLPOOL, HopTimeUnit.HOURS, HopUsage.BOIL, HopTimeUnit.HOURS],
    ])('%s + %s changed to %s keeps or defaults the unit correctly', (oldUsage, oldUnit, newUsage, expectedUnit) => {
        expect(updateHopUsage(hop({usage: oldUsage, additionTime: 3, timeUnit: oldUnit}), newUsage)).toMatchObject({
            usage: newUsage, additionTime: 3, timeUnit: expectedUnit,
        });
    });

    test('a brew-day hop defaults to BOIL and MINUTES', () => {
        expect(normalizeHopDto({id: '1', quantity: 10, additionTime: 15})).toMatchObject({
            usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES,
        });
    });

    test('DRY_HOP removes brew-day time fields', () => {
        const normalized = normalizeHopDto(hop({usage: HopUsage.DRY_HOP, additionTime: 3, timeUnit: HopTimeUnit.DAYS}));
        expect(normalized.additionTime).toBeUndefined();
        expect(normalized.timeUnit).toBeUndefined();
    });

    test('leaving DRY_HOP removes only recipe-action metadata', () => {
        const updated = updateHopUsage(hop({usage: HopUsage.DRY_HOP, additionTime: 3, timeUnit: HopTimeUnit.DAYS, triggerType: TriggerType.TIME_OFFSET, triggerValue: 2, triggerUnit: TriggerUnit.DAYS, contactTime: 1, contactTimeUnit: TimeUnit.HOURS}), HopUsage.BOIL);
        expect(updated).toMatchObject({id: '1', additionTime: 3, timeUnit: HopTimeUnit.MINUTES, usage: HopUsage.BOIL});
        for (const field of ['triggerType', 'triggerValue', 'triggerUnit', 'contactTime', 'contactTimeUnit']) expect(updated).not.toHaveProperty(field);
    });
});
