import {getApplicationVersion} from './appVersion';

describe('getApplicationVersion', () => {
    const originalVersion = process.env.REACT_APP_VERSION;

    afterEach((): void => {
        process.env.REACT_APP_VERSION = originalVersion;
    });

    it('returns the injected application version', (): void => {
        process.env.REACT_APP_VERSION = 'v1.2.3';

        expect(getApplicationVersion()).toBe('v1.2.3');
    });

    it('falls back to unknown when no version is injected', (): void => {
        delete process.env.REACT_APP_VERSION;

        expect(getApplicationVersion()).toBe('unknown');
    });
});
