import {WarningRealtimeState} from '../model/Warning';

export namespace WarningActions {
    export enum ActionTypes {
        WARNING_STATE_CHANGED = 'WarningActions.WARNING_STATE_CHANGED',
    }

    export interface WarningStateChanged {
        readonly type: ActionTypes.WARNING_STATE_CHANGED;
        payload: WarningRealtimeState;
    }

    export type AllWarningActions = WarningStateChanged;

    export const warningStateChanged = (payload: WarningRealtimeState): WarningStateChanged => ({
        type: ActionTypes.WARNING_STATE_CHANGED,
        payload,
    });
}
