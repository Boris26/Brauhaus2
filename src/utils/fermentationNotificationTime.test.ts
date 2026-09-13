import {fermentationTimeToSeconds, secondsToFermentationTime} from './fermentationNotificationTime';

describe('fermentation notification time conversion', () => {
    it.each([
        [10800, {value: '3', unit: 'hours'}],
        [7200, {value: '2', unit: 'hours'}],
        [1800, {value: '30', unit: 'minutes'}],
        [0, {value: '0', unit: 'hours'}],
    ])('represents %i seconds in a friendly unit', (seconds, expected) => {
        expect(secondsToFermentationTime(seconds)).toEqual(expected);
    });

    it('converts minutes and hours to integer seconds', () => {
        expect(fermentationTimeToSeconds('30', 'minutes')).toBe(1800);
        expect(fermentationTimeToSeconds('6', 'hours')).toBe(21600);
    });

    it('rejects values that cannot be represented as whole seconds', () => {
        expect(fermentationTimeToSeconds('0.0001', 'minutes')).toBeNull();
    });
});
