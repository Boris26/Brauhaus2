import { MashingType } from '../enums/eMashingType';
export interface FermentationSteps {
    type: string;
    temperature: number;
    time: number;
}

export interface Malt {
    name: string;
    description: string;
    EBC: number;
    quantity: number;
}

export interface Hop {
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
    name: string;
    description: string;
    EVG: string;
    temperature: string;
    type: string;
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
    fermentationSteps: FermentationSteps[];
    malts: Malt[];
    wortBoiling: WortBoiling;
    fermentationMaturation: FermentationMaturation;
}
