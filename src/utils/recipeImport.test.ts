import {getRecipeImportErrorMessage} from './recipeImport';

describe('getRecipeImportErrorMessage', () => {
    it.each([
        ['UNSUPPORTED_FORMAT_VERSION', 'Diese Version des Rezeptformats wird noch nicht unterstützt.'],
        ['INGREDIENT_MATCH_AMBIGUOUS', 'Eine Zutat konnte nicht eindeutig zugeordnet werden.'],
        ['IDEMPOTENCY_KEY_CONFLICT', 'weil sich der Inhalt des Importvorgangs geändert hat'],
        ['PERSISTENCE_FAILED', 'Das Rezept konnte nicht gespeichert werden.'],
    ])('maps %s to a friendly message', (code, expected) => {
        expect(getRecipeImportErrorMessage({response: {data: {error: {code, message: 'technical'}}}})).toContain(expected);
    });

    it('includes a structured field path', () => {
        expect(getRecipeImportErrorMessage({response: {data: {error: {code: 'SOURCE_VALIDATION_FAILED', message: 'technical', path: 'recipe.malts[0]'}}}}))
            .toContain('Betroffenes Feld: recipe.malts[0]');
    });

    it('maps an HTTP 415 without exposing technical details', () => {
        expect(getRecipeImportErrorMessage({response: {status: 415, data: {}}})).toBe('Die Importanfrage ist ungültig.');
    });
});
