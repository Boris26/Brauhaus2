import {Beer} from '../../../model/Beer';
import {calculateHopSchedule, getDueHopAddition} from './hopSchedule';
import {HopUsage} from '../../../enums/eHopUsage';

const beer = {
    cookingTime: 60,
    wortBoiling: {
        hops: [
            {id: 1, quantity: 1, usage: HopUsage.BOIL, additionTime: 10},
            {id: 2, quantity: 1, usage: HopUsage.BOIL, additionTime: 10},
            {id: 3, quantity: 1, usage: HopUsage.BOIL, additionTime: 5}
        ]
    }
} as unknown as Beer;
const masterHops = [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}];

describe('hop schedule', () => {
    it('resolves master names by id, keeps equal-time additions, and triggers once', () => {
        const schedule = calculateHopSchedule(beer, masterHops);
        expect(schedule[0].names).toEqual(['A', 'B']);
        const due = getDueHopAddition(schedule, 3001, []);
        expect(due?.names).toEqual(['A', 'B']);
        expect(getDueHopAddition(schedule, 3001, [3000])?.names).toEqual(['C']);
    });

    it('marks a missing master hop without dropping its recipe reference', () => {
        expect(calculateHopSchedule(beer, []).map(item => item.names).flat()).toContain('Unbekannter Hopfen (ID 1)');
    });
});
