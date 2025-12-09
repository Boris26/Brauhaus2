import {combineReducers} from 'redux';
import { applicationReducer, ApplicationReducerState, initialApplicationState } from './applicationReducer';
import { beerDataReducer, BeerDataReducerState, initialBeerState } from './beerReducer';
import { productionReducer, ProductionReducerState, initialProductionState } from './productionReducer';
import { hopsReducer, HopsReducerState, initialHopsState } from './hopsReducer';
import {maltsReducer, MaltsReducerState, initialMaltsState} from './maltsReducer';
import {yeastReducer, YeastReducerState, initialYeastState} from './yeastReducer';

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
    productionReducer: productionReducer,
    hopsReducer: hopsReducer,
    maltsReducer: maltsReducer,
    yeastReducer: yeastReducer

});

export type { ApplicationReducerState, BeerDataReducerState, ProductionReducerState, HopsReducerState, MaltsReducerState, YeastReducerState };
export { initialApplicationState, initialBeerState, initialProductionState ,initialHopsState, initialMaltsState, initialYeastState};
