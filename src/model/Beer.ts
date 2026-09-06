import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { HopTimeUnit } from '../enums/eHopTimeUnit';
import { HopUsage } from '../enums/eHopUsage';
import { ProcedureType } from '../enums/eProcedureType';
import {RecipeActionFields} from './FermentationRecipeAction';
export interface FermentationSteps {
    stepId?: string;
    relatedRastId?: string;
    type: string;
    temperature?: number;
    time?: number;
    executionMode?: RestExecutionMode;
    procedureType?: ProcedureType;
}

export interface Malt {
    id: string | number;
    quantity: number;
}

export interface Hop extends Partial<RecipeActionFields> {
    id: string | number;
    quantity: number;
    additionTime?: number;
    usage: HopUsage;
    timeUnit?: HopTimeUnit;
}

export interface WortBoiling {
    totalTime: number;
    hops: Hop[];
}

export interface Yeast {
    id: string | number;
    quantity: number;
}

export interface FermentationMaturation {
    fermentationTemperature: number;
    carbonation: number;
    yeast: Yeast[];
}

export enum AdditionalIngredientPhase {
    MASH = "MASH",
    BOIL = "BOIL",
    WHIRLPOOL = "WHIRLPOOL",
    FERMENTATION = "FERMENTATION",
    MATURATION = "MATURATION",
    PACKAGING = "PACKAGING"
}

export enum AdditionalIngredientTimeUnit {
    MINUTES = "MINUTES",
    HOURS = "HOURS",
    DAYS = "DAYS"
}

export interface BeerAdditionalIngredient extends Partial<RecipeActionFields> {
    id: string | number;
    quantity: number;
    unit: string;
    phase: AdditionalIngredientPhase;
    additionTime?: number;
    timeUnit?: AdditionalIngredientTimeUnit;
    note?: string;
}

export interface Beer {
    id: string;
    name: string;
    type: string;
    color: string;
    alcohol: number;
    originalwort: number;
    bitterness: number;
    description: string;
    rating: number;
    mashVolume: number;
    spargeVolume: number;
    /** Persisted recipe basis; absent on legacy database records. */
    referenceVolume?: number;
    /** Persisted brewhouse efficiency of the recipe basis; absent on legacy records. */
    referenceBrewhouseEfficiency?: number;
    /** Client-only values on a temporary scaled brew plan. */
    plannedVolume?: number;
    plannedBrewhouseEfficiency?: number;
    cookingTime: number;
    cookingTemperatur: number;
    fermentation: FermentationSteps[];
    malts: Malt[];
    wortBoiling: WortBoiling;
    fermentationMaturation: FermentationMaturation;
    additionalIngredients?: BeerAdditionalIngredient[];
}
