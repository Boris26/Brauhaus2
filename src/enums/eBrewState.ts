export enum eBrewState {
    WAITING_FOR_FERMENTATION = 'WAITING_FOR_FERMENTATION',
    FERMENTATION = 'FERMENTATION',
    MATURATION = 'MATURATION',
    FINISHED = 'FINISHED',
}

export const BrewStateGerman: Record<eBrewState, string> = {
    [eBrewState.WAITING_FOR_FERMENTATION]: 'Wartet auf Gärstart',
    [eBrewState.FERMENTATION]: 'Gärung',
    [eBrewState.MATURATION]: 'Reifung',
    [eBrewState.FINISHED]: 'Fertig',
};

/** UI affordances only. BeerDataStore remains authoritative for validation. */
export const BrewStateTransitions: Readonly<Record<eBrewState, readonly eBrewState[]>> = {
    [eBrewState.WAITING_FOR_FERMENTATION]: [],
    [eBrewState.FERMENTATION]: [eBrewState.MATURATION, eBrewState.FINISHED],
    [eBrewState.MATURATION]: [eBrewState.FINISHED],
    [eBrewState.FINISHED]: [],
};

export const brewStateLabel = (state: unknown): string =>
    typeof state === 'string' && Object.prototype.hasOwnProperty.call(BrewStateGerman, state)
        ? BrewStateGerman[state as eBrewState]
        : `Unbekannter Status (${String(state || '–')})`;
