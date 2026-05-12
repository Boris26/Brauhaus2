import { MashingType } from '../enums/eMashingType';
import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { HopTimeUnit } from '../enums/eHopTimeUnit';
import { HopUsage } from '../enums/eHopUsage';
import {AdditionalIngredientPhase, AdditionalIngredientTimeUnit} from "./Beer";
export interface FermentationStepsDTO {
    type: string;
    temperature: number;
    time?: number;
    executionMode?: RestExecutionMode;
}

export interface MaltDTO {
    name: string;
    id: string;
    quantity: number;
}

export interface HopDTO {
    name: string;
    id: string;
    quantity: number;
    time: number;
    usage?: HopUsage;
    timeUnit?: HopTimeUnit;
}

export interface WortBoilingDTO {
    totalTime: number;
    hops: HopDTO[];
}

export interface YeastDTO {
    name: string;
    id: string;
    quantity: number;
}

export interface FermentationMaturationDTO {
    fermentationTemperature: number;
    carbonation: number;
    yeast: YeastDTO[];
}

export interface AdditionalIngredientDTO {
    id?: string | number;
    name?: string;
    quantity: number;
    unit: string;
    phase: AdditionalIngredientPhase;
    time?: number;
    timeUnit?: AdditionalIngredientTimeUnit;
    description?: string;
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
    cookingTime: number;
    cookingTemperatur: number;
    fermentationSteps: FermentationStepsDTO[];
    malts: MaltDTO[];
    wortBoiling: WortBoilingDTO | null
    fermentationMaturation: FermentationMaturationDTO | null;
    additionalIngredients?: AdditionalIngredientDTO[];
}
