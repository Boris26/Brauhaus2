import axios from 'axios';
import {SystemURL} from '../global';

export class SystemRepository {
    static async shutdown(): Promise<void> {
        await axios.post(`${SystemURL}/shutdown`);
    }
}
