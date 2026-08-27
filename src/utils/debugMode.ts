const DEBUG_MODE_STORAGE_KEY = 'debug';

export const getStoredDebugMode = (): boolean => {
    try {
        return window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

export const setStoredDebugMode = (debug: boolean): void => {
    try {
        window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, String(debug));
    } catch {
        // Redux still keeps the setting for the current session when storage is unavailable.
    }
};
