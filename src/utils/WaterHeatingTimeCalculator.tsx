import {MashingType} from "../enums/eMashingType";

const DEFAULT_W = 10_000;
const SPECIFIC_HEAT_CAPACITY_WATER = 4.186
const SPECIFIC_HEAT_CAPACITY_MALT = 1.7

export interface cookingTimeOptions {
    currentTemperature: number;
    targetTemperature: number;
    liters: number
    malzIn_g: number
    type: MashingType
}

export class WaterHeatingTimeCalculator {
    private options: cookingTimeOptions | undefined;

    setOptions(aOptions: cookingTimeOptions) {
        this.options = aOptions;

    }

    getTime() {
        switch (this.options?.type) {
            case MashingType.RAST: {
                const kJMalt = this.calculateWithMalt()
                const kJWater = this.calculateOnlyWithWater()
                const time = (((kJWater +kJMalt) * (this.options.targetTemperature - this.options.currentTemperature)) / DEFAULT_W)*60;
                break;
            }
            case MashingType.IN: {
                const kJWater = this.calculateOnlyWithWater()
                const time = ((kJWater * (this.options.targetTemperature - this.options.currentTemperature)) / DEFAULT_W)*60;
                break;
            }
            case MashingType.DOWN: {
                const kJMalt = this.calculateWithMalt()
                const kJWater = this.calculateOnlyWithWater()
                const time = (((kJWater +kJMalt) * (this.options.targetTemperature - this.options.currentTemperature)) / DEFAULT_W)*60;
                break;
            }
            default: {
            }

        }
    }


    private calculateWithMalt(): number {
        if (this.options !== undefined) {
            return this.options?.liters * SPECIFIC_HEAT_CAPACITY_WATER
        }
        return 0;
    }

    private calculateOnlyWithWater() {
        if (this.options !== undefined) {
            return (this.options?.malzIn_g/1000) * SPECIFIC_HEAT_CAPACITY_MALT
        }
        return 0
    }


}
