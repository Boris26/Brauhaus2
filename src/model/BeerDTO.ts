import { MashingType } from '../enums/eMashingType';
export interface FermentationStepsDTO {
    type: string;
    temperature: number;
    time: number;
}

export interface MaltDTO {
    id: string;
    quantity: number;
}

export interface HopDTO {
    id: string;
    quantity: number;
    time: number;
}

export interface WortBoilingDTO {
    totalTime: number;
    hops: HopDTO[];
}

export interface YeastDTO {
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
    spargeVolume: number;
    fermentationSteps: FermentationStepsDTO[];
    malts: MaltDTO[];
    wortBoiling: WortBoilingDTO;
    fermentationMaturation: FermentationMaturationDTO;
}
