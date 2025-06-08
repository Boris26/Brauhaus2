import { MashingType } from '../enums/eMashingType';
export interface FermentationStepsDTO {
    type: string;
    temperature: number;
    time: number;
}

export interface MaltDTO {
    name: string;
    id: string;
    quantity: number;
}

export interface HopDTO {
    Name: string;
    id: string;
    Quantity: number;
    Time: number;
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

export interface BeerDTO {
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
    spargeVolume: number
    cookingTime: number;
    cookingTemperatur: number;
    fermentationSteps: FermentationStepsDTO[];
    malts: MaltDTO[];
    wortBoiling: WortBoilingDTO | null
    fermentationMaturation: FermentationMaturationDTO | null;
}
