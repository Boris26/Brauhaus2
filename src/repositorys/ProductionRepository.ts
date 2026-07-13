import {BaseURL, CommandsURL, ConfirmURL} from "../global";
import axios, {AxiosResponse} from "axios";
import {ToggleState} from "../enums/eToggleState";
import {ProductionActions} from "../actions/actions";
import store from "../store";
import {MashAgitatorStates} from "../model/MashAgitator";
import {BrewingData} from "../model/BrewingData";
import {BrewingStatus} from "../model/brewingStatus.types";
import {normalizeBrewingStatus} from "../utils/brewingStatus/normalizeBrewingStatus";
import {ConfirmStates} from "../enums/eConfirmStates";
import {WaterStatus} from "../components/Controlls/WaterControll/WaterControl";
import {BackendAvailable} from "../reducers/productionReducer";
import {IDiagnosticResponse, normalizeDiagnosticVersion} from "../model/DiagnosticResponse";

const DEFAULT_WATER_STATUS: WaterStatus = { liters: 0, openClose: false };
const DEFAULT_CONTROL_REQUEST_TIMEOUT = 8000;

interface ControlRequestConfig {
    config: {
        signal: AbortSignal;
        timeout: number;
    };
    timeoutHandle: ReturnType<typeof setTimeout>;
}

const createRequestConfig = (aTimeoutMs: number = DEFAULT_CONTROL_REQUEST_TIMEOUT): ControlRequestConfig => {
    const aController = new AbortController();
    const aTimeoutHandle = setTimeout((): void => {
        aController.abort();
    }, aTimeoutMs);

    return {
        config: {
            signal: aController.signal,
            timeout: aTimeoutMs,
        },
        timeoutHandle: aTimeoutHandle,
    };
};

const clearRequestTimeout = (aRequestConfig: ControlRequestConfig): void => {
    clearTimeout(aRequestConfig.timeoutHandle);
};

const normalizeWaterStatus = (aValue: unknown): WaterStatus => {
    if (typeof aValue === 'object' && aValue !== null) {
        const raw = aValue as Partial<WaterStatus>;
        const liters = Number(raw.liters);
        return {
            liters: Number.isFinite(liters) ? liters : DEFAULT_WATER_STATUS.liters,
            openClose: typeof raw.openClose === 'boolean' ? raw.openClose : DEFAULT_WATER_STATUS.openClose,
        };
    }
    return DEFAULT_WATER_STATUS;
};

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

    static async getWaterStatus(aTimeoutMs?: number, aFailOnError: boolean = false): Promise<WaterStatus> {
         return await this._doGetWaterFillStatus(aTimeoutMs, aFailOnError);
    }

    static async confirm(aConfirmState: ConfirmStates) {
        return await ProductionRepository._doConfirm(aConfirmState);
    }

    static async sendBrewingData(aBrewingData: BrewingData) {
        return await ProductionRepository._doSendBrewingData(aBrewingData);
    }

    static async getBrewingStatus(aTimeoutMs?: number): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
       return await this._doGetBrewingStatus(aTimeoutMs);
    }

    static async getDiagnosticVersion(): Promise<string> {
        return await this._doGetDiagnosticVersion();
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
            const response = await axios.post(ConfirmURL + aConfirmState);
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
            const response = await axios.get(BaseURL + 'temperatur/0');
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

    private static async _doGetWaterFillStatus(aTimeoutMs?: number, aFailOnError: boolean = false): Promise<WaterStatus> {
        const aConfig = createRequestConfig(aTimeoutMs);
        try {
            const response = await axios.get(BaseURL + 'WaterStatus', aConfig.config);
            if (response.status == 200) {
                return normalizeWaterStatus(response.data);

            } else {
                return DEFAULT_WATER_STATUS;
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            if (aFailOnError) {
                throw error;
            }
            return DEFAULT_WATER_STATUS;
        } finally {
            clearRequestTimeout(aConfig);
        }
    }

    private static async _doStartBrewing() {
        try {
            const response = await axios.post(CommandsURL + 'StartBrewing:\"\"');
            return response.status == 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doGetBrewingStatus(aTimeoutMs?: number): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
        const aConfig = createRequestConfig(aTimeoutMs);
        try {
            const response = await axios.get(BaseURL + 'Status/', aConfig.config);
            if (response.status == 200) {
                const available: BackendAvailable = {
                    isBackenAvailable: true, statusText: response.statusText
                };
                const parsedBrewingStatus: BrewingStatus = normalizeBrewingStatus(response.data);
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
            // Return instead of dispatching.
            return { available, brewingStatus: undefined };
        } finally {
            clearRequestTimeout(aConfig);
        }
    }

    private static async _doGetDiagnosticVersion(): Promise<string> {
        const response = await axios.get<IDiagnosticResponse>(BaseURL + 'diag');
        return normalizeDiagnosticVersion(response.data);
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
            const response = await axios.post(CommandsURL + 'FillWaterAutomatic:' + aLiters.toString());
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
                response = await axios.post(CommandsURL + 'TurnOn');
            } else {
                response = await axios.post(CommandsURL + 'TurnOff');
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
            const response = await axios.post(CommandsURL + 'Speed:' + speed.toString());
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
            const response = await axios.post(BaseURL + 'next');
            return response.status === 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

}
