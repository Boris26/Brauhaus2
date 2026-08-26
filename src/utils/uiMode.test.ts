import { UiMode } from '../enums/eUiMode';
import { getUiMode, setUiMode, UI_MODE_STORAGE_KEY } from './uiMode';

describe('UI mode persistence', () => {
    beforeEach(() => window.localStorage.clear());

    it('defaults to desktop when no value exists', () => {
        expect(getUiMode()).toBe(UiMode.DESKTOP);
    });

    it.each([
        [UiMode.DESKTOP, UiMode.DESKTOP],
        [UiMode.CONTROLLER, UiMode.CONTROLLER],
        ['invalid', UiMode.DESKTOP],
    ])('resolves %s as %s', (stored, expected) => {
        window.localStorage.setItem(UI_MODE_STORAGE_KEY, stored);
        expect(getUiMode()).toBe(expected);
    });

    it.each([UiMode.CONTROLLER, UiMode.DESKTOP])('stores a switch to %s', (mode) => {
        setUiMode(mode);
        expect(window.localStorage.getItem(UI_MODE_STORAGE_KEY)).toBe(mode);
    });

    it('falls back safely when localStorage throws', () => {
        const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage disabled');
        });
        expect(getUiMode()).toBe(UiMode.DESKTOP);
        getItem.mockRestore();
    });
});
