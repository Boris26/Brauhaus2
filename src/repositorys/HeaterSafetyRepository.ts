import axios from 'axios';
import {BaseURL} from '../global';
import {HeaterSafetyState} from '../model/HeaterSafetyState';

const HEATER_SAFETY_URL = `${BaseURL}/Safety/Heater`;

export class HeaterSafetyRepository {
    static async get(): Promise<HeaterSafetyState> {
        const response = await axios.get<HeaterSafetyState>(HEATER_SAFETY_URL);
        return response.data;
    }

    static async reset(): Promise<HeaterSafetyState> {
        const response = await axios.post<HeaterSafetyState>(`${HEATER_SAFETY_URL}/Reset`);
        return response.data;
    }
}
