import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { HopTimeUnit } from '../enums/eHopTimeUnit';
import { HopUsage } from '../enums/eHopUsage';
import { ProcedureType } from '../enums/eProcedureType';
import {FermentationRecipeActionFields} from './FermentationRecipeAction';
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
    id: string;
    name: string;
    description: string;
    EBC: number;
    quantity: number;
}

export interface Hop extends FermentationRecipeActionFields {
    id: string;
    name: string;
    description: string;
    alpha: number;
    quantity: number;
    time?: number;
    usage?: HopUsage;
    timeUnit?: HopTimeUnit;
}

export interface WortBoiling {
    totalTime: number;
    hops: Hop[];
}

export interface Yeast {
    id: string;
    name: string;
    description: string;
    EVG: string;
    temperature: string;
    type: string;
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

export interface BeerAdditionalIngredient extends FermentationRecipeActionFields {
    id?: string | number;
    name?: string;
    quantity: number;
    unit: string;
    phase: AdditionalIngredientPhase;
    time?: number;
    timeUnit?: AdditionalIngredientTimeUnit;
    description?: string;
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
