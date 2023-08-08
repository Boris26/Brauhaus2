import {CommandsURL, ConfirmURL, DatabaseURL} from "../global";
import axios, {AxiosResponse} from "axios";
import {ToggleState} from "../enums/eToggleState";
import {ProductionActions} from "../actions/actions";
import store from "../store";
import {MashAgitatorStates} from "../model/MashAgitator";

export class ProductionRepository {

    static async setAgitatorSpeed(speed: number) {
        return await ProductionRepository._doSetAgitatorSpeed(speed);
    }

    static async toggleAgitator(aMashAgitatorStates: MashAgitatorStates) {
        return await ProductionRepository._doToggleAgitator(aMashAgitatorStates);
    }



    static async toggleHeater(aIsTurnOn: ToggleState) {
        return await ProductionRepository._doToggleHeater(aIsTurnOn);
    }

    static async startBrewing() {
        return await ProductionRepository._doStartBrewing();
    }

    static async startCooking() {
        return await ProductionRepository._doStartCooking();
    }

    static async boilingPointReached() {
        return await ProductionRepository._doBoilingPointReached();
    }

    static async confirmIodineTest() {
        return await ProductionRepository._doConfirmIodineTest();
    }

    static async fillWaterAutomatic(aLiters: number) {
        return await ProductionRepository._doFillWaterAutomatic(aLiters);
    }

    static async confirmMashup(aLiters: number) {
        return await ProductionRepository._doConfirmMashup();
    }

    static async getWaterFillStatus() {
        return await ProductionRepository._doGetWaterFillStatus();
    }
    static async getTemperature() {
        return await ProductionRepository._doGetTemperature();
    }

    private static async _doGetTemperature() {
        try {
            const tempURL= 'temperatur:\"\"';
            const response = await axios.get(CommandsURL + tempURL);
            if (response.status == 200) {
                store.dispatch(ProductionActions.setTemperature(response.data));
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }

    private static async _doGetWaterFillStatus() {
        try {
            const response = await axios.get(DatabaseURL + 'WaterStatus');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doConfirmMashup() {
        try {
            const response = await axios.get(ConfirmURL + 'Mashup');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doConfirmIodineTest() {
        try {
            const response = await axios.get(ConfirmURL + 'Iodine');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doBoilingPointReached() {
        try {
            const response = await axios.get(CommandsURL + 'BoilingPointReached:'+  '');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doStartCooking() {
        try {
            const response = await axios.get(CommandsURL + 'StartCooking:'+  '');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doStartBrewing() {
        try {
            const response = await axios.get(CommandsURL + 'StartBrewing:'+  '');
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doFillWaterAutomatic(aLiters: number) {
        try {
            const response = await axios.get(CommandsURL + 'FillWaterAutomatic:' + aLiters.toString());
            if (response.status == 200) {
                store.dispatch(ProductionActions.startWaterFillingSuccess(true));
            }
            else {
                store.dispatch(ProductionActions.startWaterFillingSuccess(false));
            }
        }
        catch (error) {
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
                }
                else
                {
                    store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
                }
           }
             catch (error) {
                 store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
                console.error('Fehler beim API-Aufruf', error);
             }
    }

    private static async _doSetAgitatorSpeed(speed: number) {
        try {
            const response = await axios.get(CommandsURL+'Speed:'+  speed.toString());
            if (response.status == 200) {
                console.log(response.data);
            }
            else {
                console.log(response.data);
            }
        }
        catch (error)
        {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doToggleAgitator(aMashAgitatorStates: MashAgitatorStates) {
        console.log(aMashAgitatorStates);
        try {
            let response: AxiosResponse<any, any>;


                response = await axios.post(CommandsURL + 'AgitatorInterval:\"\"', aMashAgitatorStates);
                if (response.status === 200) {
                    store.dispatch(ProductionActions.toggleAgitatorSuccess(true));
                    console.log(response.data);
                }
                else
                {
                    store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
                }

            }

        catch (error) {
            store.dispatch(ProductionActions.toggleAgitatorSuccess(false));
            console.error('Fehler beim API-Aufruf', error);
        }




}}
