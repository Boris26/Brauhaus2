import {ApplicationActions} from '../actions/actions';
import {Views} from '../enums/eViews';
import AllApplicationActions = ApplicationActions.AllApplicationActions;
import ActionTypes = ApplicationActions.ActionTypes;

export interface ApplicationReducerState {
    view: Views;
    errorDialogHeader: string;
    errorDialogMessage: string;
    errorDialogOpen: boolean;
    message?: string[];
}

export const initialApplicationState: ApplicationReducerState = {
    view: Views.MAIN,
    errorDialogHeader: '',
    errorDialogMessage: '',
    errorDialogOpen: false,
    message: [], // Default ist jetzt ein leeres Array
};

const applicationReducer = (
    aState: ApplicationReducerState = initialApplicationState,
    aAction: AllApplicationActions
) => {
    switch (aAction.type) {
        case ApplicationActions.ActionTypes.SET_VIEW: {
            return { ...aState, view: aAction.payload.view };
        }
        case ApplicationActions.ActionTypes.OPEN_ERROR_DIALOG: {
            return {
                ...aState,
                errorDialogHeader: aAction.payload.header,
                errorDialogMessage: aAction.payload.content,
                errorDialogOpen: aAction.payload.open,
            };
        }
        case ActionTypes.SET_MESSAGE: {
            return {
                ...aState,
                message: [...(aState.message || []), aAction.payload.message],
            };
        }

        case ApplicationActions.ActionTypes.REMOVE_MESSAGE: {
            return {
                ...aState,
                message: [],
            };
        }
        default:
            return aState;
    }
};

export default applicationReducer;
export { applicationReducer };
