import { MashingType } from '../enums/eMashingType';
import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { HopTimeUnit } from '../enums/eHopTimeUnit';
import { HopUsage } from '../enums/eHopUsage';
export interface FermentationSteps {
    type: string;
    temperature: number;
    time?: number;
    executionMode?: RestExecutionMode;
}

export interface Malt {
    id: string;
    name: string;
    description: string;
    EBC: number;
    quantity: number;
}

export interface Hop {
    id: string;
    name: string;
    description: string;
    alpha: number;
    quantity: number;
    time: number;
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
    cookingTime: number;
    cookingTemperatur: number;
    fermentation: FermentationSteps[];
    malts: Malt[];
    wortBoiling: WortBoiling;
    fermentationMaturation: FermentationMaturation;
}
