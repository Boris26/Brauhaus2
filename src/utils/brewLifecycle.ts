import {eBrewState, BrewStateTransitions} from '../enums/eBrewState';
import {FinishedBrew} from '../model/FinishedBrew';

export const canTransitionBrew = (from: unknown, to: eBrewState): boolean =>
    Object.values(eBrewState).includes(from as eBrewState)
    && BrewStateTransitions[from as eBrewState].includes(to);

export const transitionFinishedBrew = (brew: FinishedBrew, state: eBrewState): FinishedBrew => {
    if (!canTransitionBrew(brew.state, state)) return brew;
    if (state === eBrewState.FINISHED) {
        return {...brew, state, active: false, endDate: brew.endDate || new Date().toISOString()};
    }
    return {...brew, state, active: true};
};

export const lifecycleErrorMessage = (error: any): string => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code ?? error?.response?.data?.error;
    if (status === 409 && code === 'INVALID_FINISHED_BEER_TRANSITION') {
        return 'Dieser Statuswechsel ist nicht mehr zulässig. Bitte lade den Sud neu und prüfe seinen aktuellen Status.';
    }
    return error?.message || 'Der Status konnte nicht gespeichert werden.';
};
