import {BaseURL, CommandsURL, ConfirmURL, DatabaseURL} from "../global";
import axios, {AxiosResponse} from "axios";
import {ToggleState} from "../enums/eToggleState";
import {ProductionActions} from "../actions/actions";
import store from "../store";
import {MashAgitatorStates} from "../model/MashAgitator";
import {BrewingData} from "../model/BrewingData";
import {BrewingStatus} from "../model/BrewingStatus";
import {ConfirmStates} from "../enums/eConfirmStates";
import {WaterStatus} from "../components/Controlls/WaterControll/WaterControl";
import {BackendAvailable} from "../reducers/productionReducer";

export class ProductionRepository {

    static async getTemperature(): Promise<number> {
        return await this._doGetTemperature();
    }

    static async setAgitatorSpeed(speed: number) {
        return await this._doSetAgitatorSpeed(speed);
    }

    static async toggleAgitator(aMashAgitatorStates: MashAgitatorStates): Promise<boolean> {
        return await this._doToggleAgitator(aMashAgitatorStates);
    }

    static async fillWaterAutomatic(aLiters: number) {
        return await  this._doFillWaterAutomatic(aLiters);
    }

    static async getWaterStatus() {
         return await this._doGetWaterFillStatus();
    }

    static async confirm(aConfirmState: ConfirmStates) {
        return await ProductionRepository._doConfirm(aConfirmState);
    }

    static async sendBrewingData(aBrewingData: BrewingData) {
        return await ProductionRepository._doSendBrewingData(aBrewingData);
    }

    static async getBrewingStatus(): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
       return await this._doGetBrewingStatus();
    }

    static async toggleHeater(aIsTurnOn: ToggleState) {
        return await ProductionRepository._doToggleHeater(aIsTurnOn);
    }

    static async startBrewing() {
        return await ProductionRepository._doStartBrewing();
    }

    static async nextProcedureStep() {
        return await ProductionRepository._doNextProcedureStep();
    }


    private static async _doConfirm(aConfirmState: ConfirmStates) {
        try {
            const response = await axios.get(ConfirmURL + aConfirmState);
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }

    private static async _doGetTemperature(): Promise<number> {
        try {
            const tempURL = 'Temperatur:\"\"';
            const response = await axios.get(CommandsURL + tempURL);
            if (response.status == 200) {
                return response.data;
            } else {
                return 0;
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return 0;
        }

    }

    private static async _doGetWaterFillStatus() {
        try {
            const response = await axios.get(BaseURL + 'WaterStatus');
            if (response.status == 200) {
                const parsedWaterStatus: WaterStatus = JSON.parse((JSON.stringify(response.data)))
                return parsedWaterStatus;

            } else {
                return { liters: 0, openClose: false };
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doConfirmMashup() {
        try {
            const response = await axios.get(ConfirmURL + 'Mashup');
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doConfirmIodineTest() {
        try {
            const response = await axios.get(ConfirmURL + 'Iodine');
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doBoilingPointReached() {
        try {
            const response = await axios.get(CommandsURL + 'BoilingPointReached:' + '');
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doStartCooking() {
        try {
            const response = await axios.get(CommandsURL + 'StartCooking:' + '');
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doStartBrewing() {
        try {
            const response = await axios.get(CommandsURL + 'StartBrewing:\"\"');
            return response.status == 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doGetBrewingStatus(): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
        try {
            const response = await axios.get(BaseURL + 'Status/');
            if (response.status == 200) {
                const available: BackendAvailable = {
                    isBackenAvailable: true, statusText: response.statusText
                };
                const parsedBrewingStatus: BrewingStatus = JSON.parse(JSON.stringify(response.data));
                return { available, brewingStatus: parsedBrewingStatus };
            } else {
                const available: BackendAvailable = {
                    isBackenAvailable: false, statusText: response.statusText
                };
                return { available, brewingStatus: undefined };
            }
        } catch (error) {
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            } else {
                message = "Ein unbekannter Fehler ist aufgetreten.";
            }
            const available: BackendAvailable = {
                isBackenAvailable: false, statusText: message
            };
            // Rückgabe statt dispatch
            return { available, brewingStatus: undefined };
        }
    }

    private static async _doSendBrewingData(aBrewingData: BrewingData) {
        try {
            const response = await axios.post(BaseURL + 'Recipe/', aBrewingData);

            return response.status == 201;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }

    }

    private static async _doFillWaterAutomatic(aLiters: number): Promise<boolean> {
        try {
            const response = await axios.get(CommandsURL + 'FillWaterAutomatic:' + aLiters.toString());
            return response.status == 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

    private static async _doToggleHeater(aIsTurnOn: ToggleState) {
        try {
            let response: AxiosResponse<any, any>;
            if (aIsTurnOn === ToggleState.ON) {
                response = await axios.get(CommandsURL + 'TurnOn');
            } else {
                response = await axios.get(CommandsURL + 'TurnOff');
            }
            if (response.status == 200) {
                store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            } else {
                store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            }
        } catch (error) {
            store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doSetAgitatorSpeed(speed: number): Promise<boolean> {
        try {
            const response = await axios.get(CommandsURL + 'Speed:' + speed.toString());
            return response.status == 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

    private static async _doToggleAgitator(aMashAgitatorStates: MashAgitatorStates): Promise<boolean> {
        try {
            let response: AxiosResponse<any, any>;

            response = await axios.post(CommandsURL + 'AgitatorInterval:\"\"', aMashAgitatorStates);
            return response.status === 200;

        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

    static async checkIsBackendAvailable(): Promise<boolean> {
        return await ProductionRepository._doCheckIsBackendAvailable();
    }

    private static async _doCheckIsBackendAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(BaseURL+"Available/");
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    private static async _doNextProcedureStep() {
        try {
            const response = await axios.get(CommandsURL + 'next:\"\"');
            return response.status === 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

}
