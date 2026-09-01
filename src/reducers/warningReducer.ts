import {ProductionActions} from '../actions/actions';
import {WarningActions} from '../actions/warningActions';
import {Warning} from '../model/Warning';

export interface WarningReducerState {
    warnings: Warning[];
    warningsReceived: boolean;
}

export const initialWarningState: WarningReducerState = {
    warnings: [],
    warningsReceived: false,
};

const detailsEqual = (left?: Warning['details'], right?: Warning['details']): boolean => {
    if (left === right) return true;
    if (!left || !right) return !left && !right;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && left[key] === right[key]);
};

const warningSnapshotsEqual = (left: Warning[], right: Warning[]): boolean =>
    left === right || (left.length === right.length && left.every((warning, index) => {
        const candidate = right[index];
        return warning.type === candidate.type
            && warning.active === candidate.active
            && detailsEqual(warning.details, candidate.details);
    }));

const copyWarnings = (warnings: Warning[]): Warning[] =>
    warnings.map((warning) => ({
        ...warning,
        details: warning.details ? {...warning.details} : undefined,
    }));

type WarningReducerAction =
    WarningActions.AllWarningActions
    | ProductionActions.SocketConnectionChanged
    | ProductionActions.WebSocketDisconnect;

export const warningReducer = (
    state: WarningReducerState = initialWarningState,
    action: WarningReducerAction,
): WarningReducerState => {
    switch (action.type) {
        case WarningActions.ActionTypes.WARNING_STATE_CHANGED:
            if (state.warningsReceived && warningSnapshotsEqual(state.warnings, action.payload.warnings)) {
                return state;
            }
            return {
                warnings: copyWarnings(action.payload.warnings),
                warningsReceived: true,
            };
        case ProductionActions.ActionTypes.SOCKET_CONNECTION_CHANGED:
            return action.payload.connected ? state : initialWarningState;
        case ProductionActions.ActionTypes.WEBSOCKET_DISCONNECT:
            return initialWarningState;
        default:
            return state;
    }
};
