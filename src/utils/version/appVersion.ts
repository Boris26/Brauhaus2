const fallbackVersion = 'unknown';

export function getApplicationVersion(): string {
    const version = process.env.REACT_APP_VERSION;
    if (version === undefined || version.trim().length === 0) {
        return fallbackVersion;
    }

    return version;
}
