export interface IDiagnosticResponse {
    version: string;
}

export const UNKNOWN_VERSION = 'unknown';

export function normalizeDiagnosticVersion(aResponse: unknown): string {
    if (typeof aResponse === 'object' && aResponse !== null) {
        const candidate = (aResponse as Partial<IDiagnosticResponse>).version;
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate;
        }
    }

    return UNKNOWN_VERSION;
}
