import {RecipeImportErrorResponse} from '../model/RecipeImport';

export const createImportIdempotencyKey = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
};

const importErrorMessages: Record<string, string> = {
    INVALID_IMPORT_REQUEST: 'Die Importanfrage ist ungültig.',
    UNSUPPORTED_IMPORT_FORMAT: 'Dieses Importformat wird noch nicht unterstützt.',
    UNSUPPORTED_FORMAT_VERSION: 'Diese Version des Rezeptformats wird noch nicht unterstützt.',
    SOURCE_VALIDATION_FAILED: 'Die ausgewählte Rezeptdatei entspricht nicht dem gewählten Importformat.',
    CANONICAL_VALIDATION_FAILED: 'Die Rezeptdaten konnten nicht vollständig verarbeitet werden.',
    INGREDIENT_NOT_FOUND: 'Eine Zutat konnte nicht zugeordnet werden.',
    INGREDIENT_MATCH_AMBIGUOUS: 'Eine Zutat konnte nicht eindeutig zugeordnet werden.',
    INGREDIENT_CREATION_FAILED: 'Eine fehlende Zutat konnte nicht angelegt werden.',
    IDEMPOTENCY_KEY_CONFLICT: 'Der Import konnte nicht wiederholt werden, weil sich der Inhalt des Importvorgangs geändert hat.',
    PERSISTENCE_FAILED: 'Das Rezept konnte nicht gespeichert werden.',
};

interface ImportHttpError {
    response?: {status?: number; data?: Partial<RecipeImportErrorResponse> & {message?: string}};
    message?: string;
}

export const getRecipeImportErrorMessage = (error: ImportHttpError): string => {
    const structuredError = error.response?.data?.error;
    if (structuredError && typeof structuredError === 'object') {
        const friendlyMessage = importErrorMessages[structuredError.code] || structuredError.message || 'Der Rezeptimport ist fehlgeschlagen.';
        return `${friendlyMessage}${structuredError.path ? ` Betroffenes Feld: ${structuredError.path}` : ''}`;
    }
    if (error.response?.status === 415) return importErrorMessages.INVALID_IMPORT_REQUEST;
    if (error.response?.status && error.response.status >= 500) return importErrorMessages.PERSISTENCE_FAILED;
    return error.response?.data?.message || 'Der Rezeptimport ist fehlgeschlagen. Bitte prüfen Sie die Verbindung und versuchen Sie es erneut.';
};
