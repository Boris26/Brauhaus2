export enum eBrewState {
    FERMENTATION = 'FERMENTATION',
    MATURATION = 'MATURATION',
    FINISHED = 'FINISHED',
}

export const BrewStateGerman: Record<eBrewState, string> = {
    [eBrewState.FERMENTATION]: 'Hauptgärung',
    [eBrewState.MATURATION]: 'Reifung',
    [eBrewState.FINISHED]: 'Fertig',
};

