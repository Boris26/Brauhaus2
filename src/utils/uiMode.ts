import { UiMode } from '../enums/eUiMode';

export const UI_MODE_STORAGE_KEY = 'brauhaus.uiMode';

export const getUiMode = (): UiMode => {
    try {
        const storedMode = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
        return storedMode === UiMode.CONTROLLER ? UiMode.CONTROLLER : UiMode.DESKTOP;
    } catch {
        return UiMode.DESKTOP;
    }
};

export const setUiMode = (mode: UiMode): void => {
    try {
        window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
    } catch {
        // The mode remains desktop after the reload when storage is unavailable.
    }
};
