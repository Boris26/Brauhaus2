import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';
import { hopTimeUnitsByUsage, normalizeHopDto, updateHopUsage, validateHopDto } from './hopDefaults';
import {FermentationTriggerType, FermentationTriggerUnit} from '../../model/FermentationRecipeAction';

const hop = (overrides: Partial<HopDTO> = {}): HopDTO => ({
    id: '1', name: 'Cascade', quantity: 10, usage: HopUsage.BOIL, ...overrides,
});

const expectedUnits: Record<HopUsage, readonly HopTimeUnit[]> = {
    [HopUsage.FIRST_WORT]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.BOIL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.WHIRLPOOL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.DRY_HOP]: [HopTimeUnit.HOURS, HopTimeUnit.DAYS],
};

describe('hopDefaults', () => {
    test.each(Object.entries(expectedUnits))('%s exposes only its allowed time units', (usage, units) => {
        expect(hopTimeUnitsByUsage[usage as HopUsage]).toEqual(units);
    });

    test.each(Object.values(HopUsage))('%s without time is valid', (usage) => {
        expect(validateHopDto(hop({ usage }))).toBe(true);
    });

    test.each(Object.values(HopUsage).flatMap((usage) =>
        Object.values(HopTimeUnit).map((timeUnit) => [usage, timeUnit, expectedUnits[usage].includes(timeUnit)] as const)
    ))('%s + %s validity is %s', (usage, timeUnit, isValid) => {
        expect(validateHopDto(hop({ usage, time: 3, timeUnit }))).toBe(isValid);
    });

    test('quantity <= 0 is invalid', () => {
        expect(validateHopDto(hop({ quantity: 0 }))).toBe(false);
        expect(validateHopDto(hop({ quantity: -1 }))).toBe(false);
    });

    test('time and timeUnit must either both be present or both be absent', () => {
        expect(validateHopDto(hop({ time: 10 }))).toBe(false);
        expect(validateHopDto(hop({ timeUnit: HopTimeUnit.MINUTES }))).toBe(false);
    });

    test.each([
        [HopUsage.FIRST_WORT, HopTimeUnit.MINUTES],
        [HopUsage.BOIL, HopTimeUnit.MINUTES],
        [HopUsage.WHIRLPOOL, HopTimeUnit.MINUTES],
        [HopUsage.DRY_HOP, HopTimeUnit.DAYS],
    ])('normalizes an invalid timed %s unit to %s without changing usage or time', (usage, expectedUnit) => {
        const invalidUnit = usage === HopUsage.DRY_HOP ? HopTimeUnit.MINUTES : HopTimeUnit.DAYS;
        expect(normalizeHopDto(hop({ usage, time: 3, timeUnit: invalidUnit }))).toMatchObject({
            usage, time: 3, timeUnit: expectedUnit,
        });
    });

    test('normalization does not invent time or a unit for an untimed hop', () => {
        expect(normalizeHopDto(hop({ usage: HopUsage.DRY_HOP }))).toMatchObject({usage: HopUsage.DRY_HOP});
        expect(normalizeHopDto(hop({ usage: HopUsage.DRY_HOP })).timeUnit).toBeUndefined();
    });

    test.each([
        [HopUsage.DRY_HOP, HopTimeUnit.DAYS, HopUsage.WHIRLPOOL, HopTimeUnit.MINUTES],
        [HopUsage.WHIRLPOOL, HopTimeUnit.HOURS, HopUsage.BOIL, HopTimeUnit.HOURS],
        [HopUsage.WHIRLPOOL, HopTimeUnit.MINUTES, HopUsage.DRY_HOP, HopTimeUnit.DAYS],
    ])('%s + %s changed to %s keeps or defaults the unit correctly', (oldUsage, oldUnit, newUsage, expectedUnit) => {
        expect(updateHopUsage(hop({usage: oldUsage, time: 3, timeUnit: oldUnit}), newUsage)).toMatchObject({
            usage: newUsage, time: 3, timeUnit: expectedUnit,
        });
    });

    test('legacy timed hop without usage remains BOIL and gets MINUTES', () => {
        expect(normalizeHopDto({id: '1', name: 'Cascade', quantity: 10, time: 15})).toMatchObject({
            usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES,
        });
    });

    test.each([
        [HopUsage.DRY_HOP, 3, HopTimeUnit.DAYS],
        [HopUsage.WHIRLPOOL, 20, HopTimeUnit.MINUTES],
    ])('import-style normalization preserves %s + %s + %s', (usage, time, timeUnit) => {
        expect(normalizeHopDto(hop({usage, time, timeUnit}))).toMatchObject({usage, time, timeUnit});
    });

    test('leaving DRY_HOP removes only recipe-action metadata', () => {
        const updated = updateHopUsage(hop({usage: HopUsage.DRY_HOP, time: 3, timeUnit: HopTimeUnit.DAYS, actionId: 'action', triggerType: FermentationTriggerType.TIME_OFFSET, triggerValue: 2, triggerUnit: FermentationTriggerUnit.DAYS, contactTime: 1, contactTimeUnit: FermentationTriggerUnit.HOURS}), HopUsage.BOIL);
        expect(updated).toMatchObject({id: '1', time: 3, timeUnit: HopTimeUnit.MINUTES, usage: HopUsage.BOIL});
        for (const field of ['actionId', 'triggerType', 'triggerValue', 'triggerUnit', 'contactTime', 'contactTimeUnit']) expect(updated).not.toHaveProperty(field);
    });
});
