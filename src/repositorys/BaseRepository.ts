import axios, {AxiosRequestConfig} from "axios";
import {DatabaseURL} from "../global";

export const api = axios.create({
    baseURL: DatabaseURL,
});

export class BaseRepository {

    private static normalizePath(aUrl: string) {
        // ensure we never send a leading slash so axios combines baseURL + path correctly
        if (!aUrl) return aUrl;
        return aUrl.startsWith('/') ? aUrl.slice(1) : aUrl;
    }

    protected static async get<T>(aUrl: string): Promise<T> {
        const url = this.normalizePath(aUrl);
        try {
            const aResponse = await api.get<T>(url);
            return aResponse.data;
        } catch (aError) {
            console.error(`GET ${url} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async post<T>(aUrl: string, aBody: any, config?: AxiosRequestConfig): Promise<T> {
        const url = this.normalizePath(aUrl);
        try {
            const aResponse = await api.post<T>(url, aBody, config);
            return aResponse.data;
        } catch (aError) {
            console.error(`POST ${url} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async put<T>(aUrl: string, aBody: any): Promise<T> {
        const url = this.normalizePath(aUrl);
        try {
            const aResponse = await api.put<T>(url, aBody);
            return aResponse.data;
        } catch (aError) {
            console.error(`PUT ${url} fehlgeschlagen`, aError);
            throw aError;
        }
    }

    protected static async delete(aUrl: string): Promise<void> {
        const url = this.normalizePath(aUrl);
        try {
            await api.delete(url);
        } catch (aError) {
            console.error(`DELETE ${url} fehlgeschlagen`, aError);
            throw aError;
        }
    }

}
