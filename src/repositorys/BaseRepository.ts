import axios, {AxiosRequestConfig} from "axios";
import {DatabaseURL} from "../global";

export const api = axios.create({
    baseURL: DatabaseURL,
});

export class BaseRepository {

    protected static async get<T>(aUrl: string): Promise<T> {
        try {
            const aResponse = await api.get<T>(aUrl);
            return aResponse.data;
        } catch (aError) {
            console.error(`GET ${aUrl} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async post<T>(aUrl: string, aBody: any, config?: AxiosRequestConfig): Promise<T> {
        try {
            const aResponse = await api.post<T>(aUrl, aBody, config);
            return aResponse.data;
        } catch (aError) {
            console.error(`POST ${aUrl} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async put<T>(aUrl: string, aBody: any): Promise<T> {
        try {
            const aResponse = await api.put<T>(aUrl, aBody);
            return aResponse.data;
        } catch (aError) {
            console.error(`PUT ${aUrl} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async delete(aUrl: string): Promise<void> {
        try {
            await api.delete(aUrl);
        } catch (aError) {
            console.error(`DELETE ${aUrl} fehlgeschlagen`, aError);
            throw aError;
        }
    }

}
