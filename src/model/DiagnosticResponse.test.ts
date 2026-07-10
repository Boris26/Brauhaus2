import {normalizeDiagnosticVersion} from './DiagnosticResponse';

describe('normalizeDiagnosticVersion', () => {
    it('returns a valid diagnostic version', (): void => {
        expect(normalizeDiagnosticVersion({version: 'v1.2.3'})).toBe('v1.2.3');
    });

    it('handles invalid diagnostic responses safely', (): void => {
        expect(normalizeDiagnosticVersion({})).toBe('unknown');
        expect(normalizeDiagnosticVersion({version: ''})).toBe('unknown');
        expect(normalizeDiagnosticVersion(null)).toBe('unknown');
    });
});
