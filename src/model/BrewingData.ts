import {FermentationSteps} from "./Beer";

export interface BrewingData {
    beerId: string;
    plannedVolume: number;
    plannedBrewhouseEfficiency: number;
    MashdownTemperature: number;
    MashupTemperature: number;
    CookingTemperature: number;
    CookingTime: number;
    Rasten: FermentationSteps[];
}
