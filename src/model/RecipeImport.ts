export enum RecipeImportSource {
    MAISCHE_MALZ_UND_MEHR = 'MAISCHE_MALZ_UND_MEHR',
    BRAUREKA = 'BRAUREKA',
    BRAUHAUS = 'BRAUHAUS',
}

export interface RecipeImportRequest {
    source: RecipeImportSource;
    recipe: unknown;
}
