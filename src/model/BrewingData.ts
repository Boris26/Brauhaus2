import {FermentationSteps} from "./Beer";

export interface BrewingData {
    MashdownTemperature: number;
    MashupTemperature: number;
    CookingTemperature: number;
    CookingTime: number;
    Rasten: FermentationSteps[];
}
