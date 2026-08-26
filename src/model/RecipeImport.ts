import {Beer} from './Beer';

export enum RecipeImportFormat {
    BRAUHAUS = 'BRAUHAUS',
    MMUM = 'MMUM',
    BRAUREKA = 'BRAUREKA',
}

export type JsonObject = Record<string, unknown>;

export interface RecipeImportRequest {
    format: RecipeImportFormat;
    recipe: JsonObject;
    idempotencyKey?: string;
}

export interface RecipeImportWarning {
    code: string;
    message: string;
    path?: string;
}

export interface IngredientMapping {
    sourceName: string;
    resolvedName: string;
    ingredientId: string;
    ingredientType: string;
    matchType: IngredientMatchType;
    score?: number;
}

export interface CreatedMasterData {
    ingredientId: string;
    ingredientType: string;
    name: string;
}

export type IngredientMatchType = 'EXACT' | 'ALIAS' | 'FUZZY' | 'CREATED';

export interface RecipeImportResult {
    recipe: Beer;
    warnings: RecipeImportWarning[];
    ingredientMappings: IngredientMapping[];
    createdMasterData: CreatedMasterData[];
    replayed: boolean;
}

export interface RecipeImportErrorResponse {
    error: {
        code: string;
        message: string;
        path?: string;
    };
}
