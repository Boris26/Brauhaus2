import {Beer} from '../../../model/Beer';
import {calculateHopSchedule, getDueHopAddition} from './hopSchedule';

const beer = {
    cookingTime: 60,
    wortBoiling: {
        hops: [
            {name: 'A', time: 10},
            {name: 'B', time: 10},
            {name: 'C', time: 5}
        ]
    }
} as unknown as Beer;

describe('hop schedule', () => {
    it('keeps multiple hops for the same time and triggers once when reached or skipped', () => {
        const schedule = calculateHopSchedule(beer);
        expect(schedule[0].names).toEqual(['A', 'B']);
        const due = getDueHopAddition(schedule, 3001, []);
        expect(due?.names).toEqual(['A', 'B']);
        expect(getDueHopAddition(schedule, 3001, [3000])?.names).toEqual(['C']);
    });
});
