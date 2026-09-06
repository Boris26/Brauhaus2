import { MashingType } from '../enums/eMashingType';
import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { HopTimeUnit } from '../enums/eHopTimeUnit';
import { HopUsage } from '../enums/eHopUsage';
import {AdditionalIngredientPhase, AdditionalIngredientTimeUnit} from "./Beer";
import { ProcedureType } from '../enums/eProcedureType';
import {RecipeActionFields} from './FermentationRecipeAction';
export interface FermentationStepsDTO {
    stepId?: string;
    relatedRastId?: string;
    type: string;
    temperature?: number;
    time?: number;
    executionMode?: RestExecutionMode;
    procedureType?: ProcedureType;
}

export interface MaltDTO {
    id: string | number;
    quantity: number;
}

export interface HopDTO extends Partial<RecipeActionFields> {
    id: string | number;
    quantity: number;
    additionTime?: number;
    usage: HopUsage;
    timeUnit?: HopTimeUnit;
}

export interface WortBoilingDTO {
    totalTime: number;
    hops: HopDTO[];
}

export interface YeastDTO {
    id: string | number;
    quantity: number;
}

export interface FermentationMaturationDTO {
    fermentationTemperature: number;
    carbonation: number;
    yeast: YeastDTO[];
}

export interface AdditionalIngredientDTO extends Partial<RecipeActionFields> {
    id: string | number;
    quantity: number;
    unit: string;
    phase: AdditionalIngredientPhase;
    additionTime?: number;
    timeUnit?: AdditionalIngredientTimeUnit;
    note?: string;
}

export interface BeerDTO {
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
    spargeVolume: number
    referenceVolume?: number;
    referenceBrewhouseEfficiency?: number;
    cookingTime: number;
    cookingTemperatur: number;
    fermentationSteps: FermentationStepsDTO[];
    malts: MaltDTO[];
    wortBoiling: WortBoilingDTO | null
    fermentationMaturation: FermentationMaturationDTO | null;
    additionalIngredients?: AdditionalIngredientDTO[];
}
