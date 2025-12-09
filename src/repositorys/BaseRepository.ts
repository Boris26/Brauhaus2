import axios from "axios";
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

    protected static async post<T>(aUrl: string, aBody: any): Promise<T> {
        try {
            const aResponse = await api.post<T>(aUrl, aBody);
            return aResponse.data;
        } catch (aError) {
            console.error(`POST ${aUrl} fehlgeschlagen`, aError);
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

    protected static async postFile<T>(aUrl: string, aFile: File): Promise<T> {
        const formData = new FormData();
        formData.append("file", aFile);

        try {
            const aResponse = await api.post<T>(aUrl, formData);
            return aResponse.data;
        } catch (aError) {
            console.error(`POST-FILE ${aUrl} fehlgeschlagen`, aError);
            throw aError;
        }
    }


}
