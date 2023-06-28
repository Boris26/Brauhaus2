import {Beer} from "../model/Beer";
import {Views} from "../enums/eViews";

export const updateCurrentTime = () => {
    return {
        type: 'UPDATE_CURRENT_TIME',
        payload: new Date(),
    };
};

export const setSelectedBeer= (beer: Beer) => {
    return {
        type: 'SET_SELECTED_BEER',
        payload: beer,
    };
}

export const setViewState = (viewState: Views) => {
    return {
        type: 'SET_VIEW_STATE',
        payload: viewState,
    };
}
