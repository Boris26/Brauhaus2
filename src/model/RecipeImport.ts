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
    ingredientMappings?: IngredientMappingRequest[];
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

export interface IngredientMappingRequest {
    ingredientType: IngredientType;
    sourceName: string;
    ingredientId: string | number;
}

export type IngredientType = 'MALT' | 'HOP' | 'YEAST' | 'ADDITIONAL_INGREDIENT';

export interface IngredientResolutionCandidate {
    ingredientId: string | number;
    name: string;
    matchType: IngredientMatchType;
    score?: number;
}

export interface IngredientResolution {
    ingredientType: IngredientType;
    sourceName: string;
    candidates: IngredientResolutionCandidate[];
}

export interface CreatedMasterData {
    ingredientId: string;
    ingredientType: string;
    name: string;
}

export type IngredientMatchType = 'EXACT' | 'ALIAS' | 'FUZZY' | 'UNKNOWN' | 'CREATED';

export interface RecipeImportResult {
    resolutionRequired: boolean;
    ingredients?: IngredientResolution[];
    recipe?: Beer;
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
