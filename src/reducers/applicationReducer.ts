import { ApplicationActions } from '../actions/actions';
import AllApplicationActions = ApplicationActions.AllApplicationActions;
import { Views } from '../enums/eViews';

export interface ApplicationReducerState {
    view: Views;
    errorDialogHeader: string;
    errorDialogMessage: string;
    errorDialogOpen: boolean;
}

export const initialApplicationState: ApplicationReducerState = {
    view: Views.MAIN,
    errorDialogHeader: '',
    errorDialogMessage: '',
    errorDialogOpen: false,
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
        default:
            return aState;
    }
};

export default applicationReducer;
export { applicationReducer };
