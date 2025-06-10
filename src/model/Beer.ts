import { MashingType } from '../enums/eMashingType';
export interface FermentationSteps {
    type: string;
    temperature: number;
    time: number;
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
    id: number;
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
