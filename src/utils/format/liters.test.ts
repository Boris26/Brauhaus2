import { formatLiters } from './liters';

describe('formatLiters', () => {
    it.each([
        [0, '0,0 l'],
        [8, '8,0 l'],
        [8.44, '8,4 l'],
        [8.46, '8,5 l'],
        [16.6, '16,6 l'],
    ])('formats %p with one German decimal place', (aValue: number, aExpected: string) => {
        expect(formatLiters(aValue)).toBe(aExpected);
    });
});
