export enum eBrewState {
    FERMENTATION = 'FERMENTATION',
    MATURATION = 'MATURATION',
    FINISHED = 'FINISHED',
}

export const BrewStateGerman: Record<eBrewState, string> = {
    [eBrewState.FERMENTATION]: 'Gärung',
    [eBrewState.MATURATION]: 'Reifung',
    [eBrewState.FINISHED]: 'Fertig',
};

/** UI affordances only. BeerDataStore remains authoritative for validation. */
export const BrewStateTransitions: Readonly<Record<eBrewState, readonly eBrewState[]>> = {
    [eBrewState.FERMENTATION]: [eBrewState.MATURATION, eBrewState.FINISHED],
    [eBrewState.MATURATION]: [eBrewState.FINISHED],
    [eBrewState.FINISHED]: [],
};

export const brewStateLabel = (state: unknown): string =>
    Object.prototype.hasOwnProperty.call(BrewStateGerman, state)
        ? BrewStateGerman[state as eBrewState]
        : `Unbekannter Status (${String(state || '–')})`;
