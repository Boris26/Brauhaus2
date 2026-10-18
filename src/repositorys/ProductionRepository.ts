import {BaseURL, CommandsURL, ConfirmURL} from "../global";
import axios, {AxiosResponse} from "axios";
import {ToggleState} from "../enums/eToggleState";
import {ProductionActions} from "../actions/actions";
import store from "../store";
import {MashAgitatorStates} from "../model/MashAgitator";
import {BrewingData} from "../model/BrewingData";
import {BrewingStatus} from "../model/brewingStatus.types";
import {SnapshotMetadata, statusFromResponse} from "../utils/brewingStatus/snapshot";
import {ConfirmStates} from "../enums/eConfirmStates";
import {WaterStatus} from "../components/Controlls/WaterControll/WaterControl";
import {BackendAvailable} from "../reducers/productionReducer";
import {IDiagnosticResponse, normalizeDiagnosticVersion} from "../model/DiagnosticResponse";
import {AgitatorConfig, AgitatorDetailStatus} from "../model/Agitator";
import {BrewSession} from "../model/BrewSession";
import {WaterFillMode} from '../model/WaterStatus';
import {parseWaterSnapshot} from '../utils/brewingStatus/waterSnapshot';

const DEFAULT_WATER_STATUS: WaterStatus = { filledLiters: 0, targetLiters: 0, openClose: false };
const DEFAULT_CONTROL_REQUEST_TIMEOUT = 8000;

interface ControlRequestConfig {
    config: {
        signal: AbortSignal;
        timeout: number;
    };
    timeoutHandle: ReturnType<typeof setTimeout>;
    cleanup: () => void;
}

const createRequestConfig = (aTimeoutMs: number = DEFAULT_CONTROL_REQUEST_TIMEOUT, signal?: AbortSignal): ControlRequestConfig => {
    const aController = new AbortController();
    const abort = () => aController.abort();
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) abort();
    const aTimeoutHandle = setTimeout((): void => {
        aController.abort();
    }, aTimeoutMs);

    return {
        config: {
            signal: aController.signal,
            timeout: aTimeoutMs,
        },
        timeoutHandle: aTimeoutHandle,
        cleanup: () => signal?.removeEventListener('abort', abort),
    };
};

const clearRequestTimeout = (aRequestConfig: ControlRequestConfig): void => {
    clearTimeout(aRequestConfig.timeoutHandle);
    aRequestConfig.cleanup();
};

const normalizeWaterStatus = (aValue: unknown): WaterStatus => {
    if (typeof aValue === 'object' && aValue !== null) {
        const raw = aValue as Partial<WaterStatus>;
        const rawFilledLiters = Number(raw.filledLiters);
        const rawTargetLiters = Number(raw.targetLiters);
        const filledLiters = Number.isFinite(rawFilledLiters) ? Math.max(0, rawFilledLiters) : DEFAULT_WATER_STATUS.filledLiters;
        const targetLiters = Number.isFinite(rawTargetLiters) ? Math.max(0, rawTargetLiters) : DEFAULT_WATER_STATUS.targetLiters;
        const lifecycle = ['IDLE', 'STARTING', 'RUNNING', 'COMPLETED', 'STOPPED', 'ERROR'];
        return {
            filledLiters,
            targetLiters,
            openClose: raw.openClose === true,
            ...(raw.state && lifecycle.includes(raw.state) ? {state: raw.state} : {}),
            ...(typeof raw.fillId === 'string' ? {fillId: raw.fillId} : {}),
            ...(raw.mode && ['AUTO', 'MANUAL', 'MASH', 'SPARGE'].includes(raw.mode) ? {mode: raw.mode} : {}),
            ...(raw.reason === null || typeof raw.reason === 'string' ? {reason: raw.reason} : {}),
            ...(raw.error === null || typeof raw.error === 'string' ? {error: raw.error} : {}),
        };
    }
    return DEFAULT_WATER_STATUS;
};

export class ProductionRepository {
    private static pendingWaterStart?: Promise<boolean>;

    static async getBrewSession(): Promise<BrewSession> {
        const request = createRequestConfig();
        try {
            const response = await axios.get<BrewSession>(`${BaseURL}/BrewSession`, request.config);
            return response.data;
        } finally {
            clearRequestTimeout(request);
        }
    }

    static async resumeBrewRecovery(aBrewingData: BrewingData): Promise<void> {
        const request = createRequestConfig();
        try {
            await axios.post(`${BaseURL}/BrewRecovery/Resume`, aBrewingData, request.config);
        } finally {
            clearRequestTimeout(request);
        }
    }

    static async discardBrewRecovery(): Promise<void> {
        const request = createRequestConfig();
        try {
            await axios.delete(`${BaseURL}/BrewRecovery`, request.config);
        } finally {
            clearRequestTimeout(request);
        }
    }

    static async getAgitatorStatus(): Promise<AgitatorDetailStatus> {
        const response = await axios.get<AgitatorDetailStatus>(`${BaseURL}/Agitator/Status`);
        return response.data;
    }

    static async setAgitatorConfig(config: AgitatorConfig): Promise<void> {
        await axios.put(`${BaseURL}/Agitator/Config`, config);
    }

    static async pauseAgitator(): Promise<void> {
        await axios.post(`${BaseURL}/Agitator/Pause`);
    }

    static async resumeAgitator(): Promise<void> {
        await axios.post(`${BaseURL}/Agitator/Resume`);
    }

    static async getTemperature(): Promise<number> {
        return await this._doGetTemperature();
    }

    static async setAgitatorSpeed(speed: number) {
        return await this._doSetAgitatorSpeed(speed);
    }

    static async toggleAgitator(aMashAgitatorStates: MashAgitatorStates): Promise<boolean> {
        return await this._doToggleAgitator(aMashAgitatorStates);
    }

    static async fillWaterAutomatic(aLiters: number, mode?: WaterFillMode) {
        const pending = this._doFillWaterAutomatic(aLiters, mode);
        this.pendingWaterStart = pending;
        try {
            return await pending;
        } finally {
            if (this.pendingWaterStart === pending) this.pendingWaterStart = undefined;
        }
    }

    static async stopWaterFilling(): Promise<boolean> {
        // A rapid OFF must reach the controller after its in-flight ON command.
        await this.pendingWaterStart;
        const request = createRequestConfig();
        try {
            const response = await axios.post(CommandsURL + 'FillWaterStop:""', undefined, request.config);
            return response.status === 200;
        } catch (error) {
            console.error('Wasserzufuhr konnte nicht gestoppt werden', error);
            return false;
        } finally {
            clearRequestTimeout(request);
        }
    }

    static async getWaterStatus(aTimeoutMs?: number, aFailOnError: boolean = false, signal?: AbortSignal): Promise<WaterStatus> {
         return await this._doGetWaterFillStatus(aTimeoutMs, aFailOnError, signal);
    }

    static async confirm(aConfirmState: ConfirmStates, expected?: SnapshotMetadata): Promise<BrewingStatus> {
        return await ProductionRepository._doConfirm(aConfirmState, expected);
    }

    static async sendBrewingData(aBrewingData: BrewingData) {
        return await ProductionRepository._doSendBrewingData(aBrewingData);
    }

    static async getBrewingStatus(aTimeoutMs?: number, signal?: AbortSignal): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
       return await this._doGetBrewingStatus(aTimeoutMs, signal);
    }

    static async getDiagnosticVersion(): Promise<string> {
        return await this._doGetDiagnosticVersion();
    }

    static async toggleHeater(aIsTurnOn: ToggleState) {
        return await ProductionRepository._doToggleHeater(aIsTurnOn);
    }

    static async startBrewing(aSocketId?: string): Promise<BrewingStatus | undefined> {
        return await ProductionRepository._doStartBrewing(aSocketId);
    }

    static async nextProcedureStep(): Promise<BrewingStatus | undefined> {
        return await ProductionRepository._doNextProcedureStep();
    }


    private static async _doConfirm(aConfirmState: ConfirmStates, expected?: SnapshotMetadata): Promise<BrewingStatus> {
        const request = createRequestConfig();
        try {
            const config = expected ? {...request.config, headers: {
                'X-Controller-Epoch': expected.controllerEpoch,
                'X-Process-Instance': expected.processInstanceId,
                'X-Expected-State-Revision': String(expected.stateRevision),
            }} : request.config;
            const response = await axios.post(ConfirmURL + aConfirmState, undefined, config);
            return statusFromResponse(response);
        } finally {
            clearRequestTimeout(request);
        }
    }

    private static async _doGetTemperature(): Promise<number> {
        try {
            const response = await axios.get(`${BaseURL}/temperatur/0`);
            if (response.status === 200) {
                return response.data;
            } else {
                return 0;
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return 0;
        }

    }

    private static async _doGetWaterFillStatus(aTimeoutMs?: number, aFailOnError: boolean = false, signal?: AbortSignal): Promise<WaterStatus> {
        const aConfig = createRequestConfig(aTimeoutMs, signal);
        try {
            const response = await axios.get(`${BaseURL}/WaterStatus`, aConfig.config);
            if (response.status === 200) {
                const revision = response.headers?.['x-water-filling-revision'];
                if (revision !== undefined) {
                    const snapshot = parseWaterSnapshot({...response.data, schemaVersion: 1,
                        controllerEpoch: response.headers?.['x-controller-epoch'],
                        waterFillingRevision: /^\d+$/.test(revision) ? Number(revision) : NaN});
                    if (!snapshot) throw new Error('Ungültiger versionierter Wasserstatus');
                    return snapshot;
                }
                if (aFailOnError && (!response.data || typeof response.data !== 'object'
                    || typeof response.data.openClose !== 'boolean'
                    || !['filledLiters', 'targetLiters'].every(key => response.data[key] !== null && response.data[key] !== ''
                        && response.data[key] !== undefined && Number.isFinite(Number(response.data[key])) && Number(response.data[key]) >= 0))) {
                    throw new Error('Ungültiger Wasserstatus');
                }
                return normalizeWaterStatus(response.data);

            } else {
                if (aFailOnError) throw new Error('Wasserstatus konnte nicht gelesen werden');
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

    private static async _doStartBrewing(aSocketId?: string): Promise<BrewingStatus | undefined> {
        const request = createRequestConfig();
        try {
            const config = aSocketId ? {...request.config, headers: {'X-Socket-ID': aSocketId}} : request.config;
            const response = await axios.post(CommandsURL + `StartBrewing:""`, undefined, config);
            return response.status === 200 ? statusFromResponse(response) : undefined;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        } finally {
            clearRequestTimeout(request);
        }
    }

    private static async _doGetBrewingStatus(aTimeoutMs?: number, signal?: AbortSignal): Promise<{ available: BackendAvailable, brewingStatus: BrewingStatus | undefined }> {
        const aConfig = createRequestConfig(aTimeoutMs, signal);
        try {
            const response = await axios.get(`${BaseURL}/Status/`, aConfig.config);
            if (response.status === 200) {
                const available: BackendAvailable = {
                    isBackenAvailable: true, statusText: response.statusText
                };
                const parsedBrewingStatus: BrewingStatus = statusFromResponse(response);
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
        const response = await axios.get<IDiagnosticResponse>(`${BaseURL}/diag`);
        return normalizeDiagnosticVersion(response.data);
    }

    private static async _doSendBrewingData(aBrewingData: BrewingData) {
        const request = createRequestConfig();
        try {
            const response = await axios.post(`${BaseURL}/Recipe/`, aBrewingData, request.config);

            return response.status === 201;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        } finally {
            clearRequestTimeout(request);
        }

    }

    private static async _doFillWaterAutomatic(aLiters: number, mode?: WaterFillMode): Promise<boolean> {
        const request = createRequestConfig();
        try {
            const response = await axios.post(CommandsURL + 'FillWaterAutomatic:' + aLiters.toString(), mode ? {mode} : undefined, request.config);
            return response.status === 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        } finally {
            clearRequestTimeout(request);
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
            if (response.status === 200) {
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
            return response.status === 200;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return false;
        }
    }

    private static async _doToggleAgitator(aMashAgitatorStates: MashAgitatorStates): Promise<boolean> {
        try {
            let response: AxiosResponse<any, any>;

            response = await axios.post(CommandsURL + `AgitatorInterval:""`, aMashAgitatorStates);
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
        const request = createRequestConfig();
        try {
            const response = await axios.get(`${BaseURL}/Available/`, request.config);
            return response.status === 200;
        } catch (error) {
            return false;
        } finally {
            clearRequestTimeout(request);
        }
    }

    private static async _doNextProcedureStep(): Promise<BrewingStatus | undefined> {
        const request = createRequestConfig();
        try {
            const response = await axios.post(`${BaseURL}/next`, undefined, request.config);
            return response.status === 200 ? statusFromResponse(response) : undefined;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return undefined;
        } finally {
            clearRequestTimeout(request);
        }
    }

}
