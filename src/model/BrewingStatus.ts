export enum HeatingStates {
    ON = "HeatingStates.ON",
    OFF = "HeatingStates.OFF"
}
export interface BrewingStatus {
    elapsedTime: number;
    currentTime: number,
    Temperature: number,
    TargetTemperature: number,
    StatusText: string,
    HeatingStates: string,
    Name: string,
    Type: string,
    WaitingStatus: boolean,
    HeatUpStatus: boolean
}
