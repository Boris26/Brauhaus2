import { eBrewState } from '../enums/eBrewState';

export interface FinishedBrew {
    id: string;
    name: string;
    startDate: Date | string; // Date can be a Date object or a string in ISO format
    endDate?: Date | string; // Optional end date, can also be a Date object or a string in ISO format
    liters: number;
    originalwort: number;
    residual_extract: number | null; // Residual extract can be null if not applicable
    note: string;
    active: boolean;
    beer_id?: string; // Optional beer ID, kann jetzt eine UUID (string) sein
    state: eBrewState;
    brewValues?: string; // Optional: Messdaten als Blob (z.B. von DataCollector)
}
