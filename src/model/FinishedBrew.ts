export interface FinishedBrew {
    id: number;
    name: string;
    startDate: Date | string; // Date can be a Date object or a string in ISO format
    endDate?: Date | string; // Optional end date, can also be a Date object or a string in ISO format
    liters: number;
    originalwort: number;
    residual_extract: number | null; // Residual extract can be null if not applicable
    note: string;
    active: boolean;
    beer_id?: number; // Optional beer ID, can be used to link to a specific beer
}
