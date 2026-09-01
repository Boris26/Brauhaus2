import {getActiveWarnings, getWarningHeaderText, getWarningMessage} from './warningDisplay';

describe('warningDisplay', () => {
    it('maps temperature sensor health to a user-facing warning', () => {
        expect(getWarningMessage({
            type: 'TEMPERATURE_SENSOR',
            active: true,
            details: {health: 'MISSING'},
        })).toBe('Temperatursensor nicht verfügbar');
    });

    it('falls back safely for an unknown temperature health value', () => {
        expect(getWarningMessage({
            type: 'TEMPERATURE_SENSOR',
            active: true,
            details: {health: 'UNKNOWN_STATE'},
        })).toBe('Temperatursensor prüfen');
    });

    it('supports future warning types without requiring a transport change', () => {
        expect(getWarningMessage({type: 'WATER_SUPPLY', active: true}))
            .toBe('Betriebswarnung: WATER_SUPPLY');
    });

    it('ignores inactive warnings', () => {
        expect(getActiveWarnings([
            {type: 'TEMPERATURE_SENSOR', active: false, details: {health: 'MISSING'}},
        ])).toEqual([]);
        expect(getWarningHeaderText([
            {type: 'TEMPERATURE_SENSOR', active: false, details: {health: 'MISSING'}},
        ])).toBeUndefined();
    });

    it('summarizes multiple active warnings in one header message', () => {
        expect(getWarningHeaderText([
            {type: 'TEMPERATURE_SENSOR', active: true, details: {health: 'STALE'}},
            {type: 'WATER_SUPPLY', active: true},
        ])).toBe('⚠ 2 Warnungen: Temperaturmessung nicht aktuell · Betriebswarnung: WATER_SUPPLY');
    });
});
