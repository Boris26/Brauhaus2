import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { normalizeHopDto, updateHopUsage, validateHopDto } from './hopDefaults';

describe('hopDefaults', () => {
    test('old hop without usage/timeUnit defaults to BOIL/MINUTES', () => {
        const hop = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 15 });
        expect(hop.usage).toBe(HopUsage.BOIL);
        expect(hop.timeUnit).toBe(HopTimeUnit.MINUTES);
    });

    test('BOIL hop stays BOIL/MINUTES in payload-relevant shape', () => {
        const hop = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 15, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.DAYS });
        expect(hop.usage).toBe(HopUsage.BOIL);
        expect(hop.timeUnit).toBe(HopTimeUnit.MINUTES);
    });

    test('DRY_HOP defaults to DAYS when no valid unit is set', () => {
        const hop = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 5, usage: HopUsage.DRY_HOP });
        expect(hop.usage).toBe(HopUsage.DRY_HOP);
        expect(hop.timeUnit).toBe(HopTimeUnit.DAYS);
    });

    test('switch BOIL -> DRY_HOP does not set time to 0', () => {
        const original = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 7, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES });
        const updated = updateHopUsage(original, HopUsage.DRY_HOP);
        expect(updated.usage).toBe(HopUsage.DRY_HOP);
        expect(updated.time).toBe(7);
        expect(updated.timeUnit).toBe(HopTimeUnit.DAYS);
    });

    test('switch DRY_HOP -> BOIL sets MINUTES', () => {
        const original = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 7, usage: HopUsage.DRY_HOP, timeUnit: HopTimeUnit.HOURS });
        const updated = updateHopUsage(original, HopUsage.BOIL);
        expect(updated.usage).toBe(HopUsage.BOIL);
        expect(updated.timeUnit).toBe(HopTimeUnit.MINUTES);
    });

    test('loaded recipe with usage/timeUnit preserves those fields', () => {
        const hop = normalizeHopDto({ id: '1', name: 'Cascade', quantity: 10, time: 2, usage: HopUsage.DRY_HOP, timeUnit: HopTimeUnit.HOURS });
        expect(hop.usage).toBe(HopUsage.DRY_HOP);
        expect(hop.timeUnit).toBe(HopTimeUnit.HOURS);
    });

    test('invalid usage/timeUnit combination is rejected by validation', () => {
        const invalid = { id: '1', name: 'Cascade', quantity: 10, time: 30, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.DAYS };
        expect(validateHopDto(invalid)).toBe(false);
    });
});
