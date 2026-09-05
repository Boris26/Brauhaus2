import {FinishedBrewCreatePayload} from '../model/FinishedBrew';

export type IdentifiedFinishedBrewCreatePayload = FinishedBrewCreatePayload & {id: string};

export const createFinishedBrewId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
};

/**
 * Adds an idempotency ID exactly once. Existing IDs are preserved so retries of
 * the same create payload hit the BeerDataStore with the same operation key.
 */
export const withFinishedBrewCreateId = (
    payload: FinishedBrewCreatePayload,
): IdentifiedFinishedBrewCreatePayload => ({
    ...payload,
    id: payload.id || createFinishedBrewId(),
});
