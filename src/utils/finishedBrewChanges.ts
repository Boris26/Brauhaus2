import {eBrewState} from '../enums/eBrewState';
import {FinishedBrew} from '../model/FinishedBrew';

export const mergeFinishedBrewChanges = (brew: FinishedBrew, changes?: Partial<FinishedBrew>): FinishedBrew => ({
    ...brew,
    ...changes,
    id: brew.id,
});

export const completeFinishedBrew = (brew: FinishedBrew, now: Date = new Date()): FinishedBrew => ({
    ...brew,
    state: eBrewState.FINISHED,
    active: false,
    endDate: brew.endDate || now.toISOString(),
});
