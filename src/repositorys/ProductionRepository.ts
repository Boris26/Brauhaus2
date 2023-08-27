import {BaseURL, CommandsURL, ConfirmURL, DatabaseURL} from "../global";
import axios, {AxiosResponse} from "axios";
import {ToggleState} from "../enums/eToggleState";
import {ProductionActions} from "../actions/actions";
import store from "../store";
import {MashAgitatorStates} from "../model/MashAgitator";
import {BrewingData} from "../model/BrewingData";
import {BrewingStatus} from "../model/BrewingStatus";
import {ConfirmStates} from "../enums/eConfirmStates";
import {BackendAvailable} from "../reducers/reducer";

export class ProductionRepository {
    private static pollingIntervalId: NodeJS.Timeout | null = null;

    static async confirm(aConfirmState: ConfirmStates) {
        return await ProductionRepository._doConfirm(aConfirmState);
    }


    static async setAgitatorSpeed(speed: number) {
        return await ProductionRepository._doSetAgitatorSpeed(speed);
    }

    static async toggleAgitator(aMashAgitatorStates: MashAgitatorStates) {
        return await ProductionRepository._doToggleAgitator(aMashAgitatorStates);
    }

    static async sendBrewingData(aBrewingData: BrewingData) {
        return await ProductionRepository._doSendBrewingData(aBrewingData);
    }

    static async startBrewingStatusPolling() {
        if (this.pollingIntervalId === null) {
            this.pollingIntervalId = setInterval(async () => {
                try {
                    await this._doGetBrewingStatus();
                } catch (error) {
                    console.error('Fehler beim Abfragen des Braustatus:', error);
                }
            }, 1000); // Alle 10 Sekunden abfragen (10000 Millisekunden)
        }
    }


    static async toggleHeater(aIsTurnOn: ToggleState) {
        return await ProductionRepository._doToggleHeater(aIsTurnOn);
    }

    static async startBrewing() {
        return await ProductionRepository._doStartBrewing();
    }

    static async fillWaterAutomatic(aLiters: number) {
        return await ProductionRepository._doFillWaterAutomatic(aLiters);
    }


    static async getWaterFillStatus() {
        return await ProductionRepository._doGetWaterFillStatus();
    }

    static async getTemperature() {
        return await ProductionRepository._doGetTemperature();
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

    private static async _doGetTemperature() {
        try {
            const tempURL = 'temperatur:\"\"';
            const response = await axios.get(CommandsURL + tempURL);
            if (response.status == 200) {
                store.dispatch(ProductionActions.setTemperature(response.data));
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }

    private static async _doGetWaterFillStatus() {
        try {
            const response = await axios.get(DatabaseURL + 'WaterStatus');
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
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
            if (response.status == 200) {
                console.log(response.data);
                this.startBrewingStatusPolling();
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doGetBrewingStatus() {
        try {
            const response = await axios.get(BaseURL + 'Status/');
            if (response.status == 200) {
                const available: BackendAvailable =
                    {
                        isBackenAvailable: true, statusText: response.statusText
                    }

                const parsedBrewingStatus: BrewingStatus = JSON.parse(JSON.stringify(response.data));
                console.log(parsedBrewingStatus);
                store.dispatch(ProductionActions.isBackenAvailable(available));
                store.dispatch(ProductionActions.setBrewingStatus(parsedBrewingStatus));
            } else {
                const available: BackendAvailable =
                    {
                        isBackenAvailable: false, statusText: response.statusText
                    }
                store.dispatch(ProductionActions.isBackenAvailable(available));
            }
        } catch (error) {
            let message = '';
            if (error instanceof Error) {
                message = error.message
            } else {
                message = "Ein unbekannter Fehler ist aufgetreten.";
            }
            const available: BackendAvailable =
                {
                    isBackenAvailable: false, statusText: message
                }
            store.dispatch(ProductionActions.isBackenAvailable(available));
        }
    }

    private static async _doSendBrewingData(aBrewingData: BrewingData) {
        try {
            const response = await axios.post(BaseURL + 'Recipe/', aBrewingData);

            if (response.status == 201) {
                await this.startBrewing()
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }

    private static async _doFillWaterAutomatic(aLiters: number) {
        try {
            const response = await axios.get(CommandsURL + 'FillWaterAutomatic:' + aLiters.toString());
            if (response.status == 200) {
                store.dispatch(ProductionActions.startWaterFillingSuccess(true));
            } else {
                store.dispatch(ProductionActions.startWaterFillingSuccess(false));
            }
        } catch (error) {
            store.dispatch(ProductionActions.startWaterFillingSuccess(false));

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

    private static async _doSetAgitatorSpeed(speed: number) {
        try {
            const response = await axios.get(CommandsURL + 'Speed:' + speed.toString());
            if (response.status == 200) {
                console.log(response.data);
            } else {
                console.log(response.data);
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doToggleAgitator(aMashAgitatorStates: MashAgitatorStates) {
        try {
            let response: AxiosResponse<any, any>;

            response = await axios.post(CommandsURL + 'AgitatorInterval:\"\"', aMashAgitatorStates);
            if (response.status === 200) {
                store.dispatch(ProductionActions.toggleAgitatorSuccess(true));
            } else {
                store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            }

        } catch (error) {
            store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    static async checkIsBackendAvailable() {
        return await ProductionRepository._doCheckIsBackendAvailable();
    }

    private static async _doCheckIsBackendAvailable() {
        try {
            const response = await axios.get(BaseURL);
            if (response.status === 200) {
                const available: BackendAvailable =
                    {
                        isBackenAvailable: true, statusText: ""
                    }
                store.dispatch(ProductionActions.isBackenAvailable(available));
            } else {
                const available: BackendAvailable =
                    {
                        isBackenAvailable: false, statusText: response.statusText
                    }
                store.dispatch(ProductionActions.isBackenAvailable(available));
                setTimeout(() => {
                    this._doCheckIsBackendAvailable(); // Erneute Überprüfung nach 10 Sekunden
                }, 10000); // 10000 Millisekunden sind 10 Sekunden
            }
        } catch (error) {
            let message = '';
            if (error instanceof Error) {
                message = error.message
            } else {
                message = "Ein unbekannter Fehler ist aufgetreten.";
            }
            const available: BackendAvailable =
                {
                    isBackenAvailable: false, statusText: message
                }
            store.dispatch(ProductionActions.isBackenAvailable(available));
            setTimeout(() => {
                this._doCheckIsBackendAvailable(); // Erneute Überprüfung nach 10 Sekunden
            }, 10000); // 10000 Millisekunden sind 10 Sekunden
        }
    }

}
