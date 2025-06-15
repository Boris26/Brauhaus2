export enum eBrewState {
    Fermentation = 'Fermentation',
    Maturation = 'Maturation',
    Finished = 'Finished',
}

export const BrewStateGerman: Record<eBrewState, string> = {
    [eBrewState.Fermentation]: 'Hauptgärung',
    [eBrewState.Maturation]: 'Reifung',
    [eBrewState.Finished]: 'Fertig',
};

