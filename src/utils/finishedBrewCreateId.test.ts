import {eBrewState} from '../enums/eBrewState';
import {FinishedBrewCreatePayload} from '../model/FinishedBrew';
import {withFinishedBrewCreateId} from './finishedBrewCreateId';

const payload = (): FinishedBrewCreatePayload => ({
    name: 'Testbier',
    startDate: '2026-09-05',
    liters: 20,
    originalwort: 12,
    residual_extract: 4,
    note: '',
    active: true,
    beer_id: 'recipe-id',
    state: eBrewState.FERMENTATION,
});

describe('withFinishedBrewCreateId', () => {
    it('adds a UUID to a new create payload', () => {
        const identified = withFinishedBrewCreateId(payload());

        expect(identified.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('preserves an existing create ID for retries', () => {
        const first = withFinishedBrewCreateId(payload());
        const retry = withFinishedBrewCreateId(first);

        expect(retry.id).toBe(first.id);
    });
});
