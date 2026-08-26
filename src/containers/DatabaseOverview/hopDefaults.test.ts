import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';
import { normalizeHopDto, updateHopUsage, validateHopDto } from './hopDefaults';

const hop = (overrides: Partial<HopDTO> = {}): HopDTO => ({
    id: '1', name: 'Cascade', quantity: 10, usage: HopUsage.BOIL, ...overrides,
});

describe('hopDefaults', () => {
    test.each(Object.values(HopUsage))('%s is accepted', (usage) => {
        expect(validateHopDto(hop({ usage }))).toBe(true);
    });

    test.each([HopUsage.FIRST_WORT, HopUsage.WHIRLPOOL])('%s without time is valid', (usage) => {
        expect(validateHopDto(hop({ usage }))).toBe(true);
    });

    test.each([
        [HopUsage.BOIL, 0, HopTimeUnit.MINUTES],
        [HopUsage.BOIL, 60, HopTimeUnit.MINUTES],
        [HopUsage.DRY_HOP, 3, HopTimeUnit.DAYS],
    ])('%s with time %s and %s is valid', (usage, time, timeUnit) => {
        expect(validateHopDto(hop({ usage: usage as HopUsage, time: time as number, timeUnit: timeUnit as HopTimeUnit }))).toBe(true);
    });

    test('quantity <= 0 is invalid', () => {
        expect(validateHopDto(hop({ quantity: 0 }))).toBe(false);
        expect(validateHopDto(hop({ quantity: -1 }))).toBe(false);
    });

    test('time without timeUnit is invalid', () => {
        expect(validateHopDto(hop({ time: 10 }))).toBe(false);
    });

    test('timeUnit without time is invalid', () => {
        expect(validateHopDto(hop({ timeUnit: HopTimeUnit.MINUTES }))).toBe(false);
    });

    test.each([HopUsage.FIRST_WORT, HopUsage.WHIRLPOOL])('%s with a time but no unit remains invalid', (usage) => {
        expect(validateHopDto(normalizeHopDto(hop({ usage, time: 10 })))).toBe(false);
    });

    test.each([HopUsage.FIRST_WORT, HopUsage.WHIRLPOOL])('normalization preserves %s without inventing time data', (usage) => {
        const normalized = normalizeHopDto(hop({ usage }));
        expect(normalized.usage).toBe(usage);
        expect(normalized.time).toBeUndefined();
        expect(normalized.timeUnit).toBeUndefined();
    });

    test.each([HopUsage.FIRST_WORT, HopUsage.WHIRLPOOL])('usage update preserves selected %s', (usage) => {
        expect(updateHopUsage(hop(), usage).usage).toBe(usage);
    });

    test('import-style normalization preserves all four usages', () => {
        const usages = Object.values(HopUsage);
        expect(usages.map((usage) => normalizeHopDto(hop({ usage })).usage)).toEqual(usages);
    });

    test('legacy hop without usage remains BOIL and timed legacy data gets MINUTES', () => {
        const normalized = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 15 });
        expect(normalized.usage).toBe(HopUsage.BOIL);
        expect(normalized.timeUnit).toBe(HopTimeUnit.MINUTES);
    });

    test('existing usage and unit are preserved without usage-specific coercion', () => {
        const normalized = normalizeHopDto(hop({ usage: HopUsage.BOIL, time: 2, timeUnit: HopTimeUnit.DAYS }));
        expect(normalized).toMatchObject({ usage: HopUsage.BOIL, time: 2, timeUnit: HopTimeUnit.DAYS });
    });
});
