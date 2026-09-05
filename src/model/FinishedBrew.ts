import { eBrewState } from '../enums/eBrewState';

export interface FinishedBrew {
    id: string;
    name: string;
    startDate: Date | string; // Date can be a Date object or a string in ISO format
    /** Canonical, timezone-bearing backend basis for fermentation recipe actions. */
    fermentationStartedAt?: string | null;
    endDate?: Date | string; // Optional end date, can also be a Date object or a string in ISO format
    liters: number;
    originalwort: number;
    residual_extract: number | null; // Residual extract can be null if not applicable
    note: string;
    active: boolean;
    beer_id?: string; // Optional beer ID, kann jetzt eine UUID (string) sein
    state: eBrewState;
    brewValues?: string;
}

/**
 * Create payload for a finished-brew record.
 *
 * `id` is optional for backwards compatibility, but Brauhaus2 assigns one before
 * dispatching the create action so retries can reuse the same create-operation ID.
 */
export type FinishedBrewCreatePayload = Omit<FinishedBrew, 'id'> & { id?: string };
