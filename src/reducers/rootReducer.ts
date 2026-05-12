import {combineReducers} from 'redux';
import { applicationReducer, ApplicationReducerState, initialApplicationState } from './applicationReducer';
import { beerDataReducer, BeerDataReducerState, initialBeerState } from './beerReducer';
import { productionReducer, ProductionReducerState, initialProductionState } from './productionReducer';
import { hopsReducer, HopsReducerState, initialHopsState } from './hopsReducer';
import {maltsReducer, MaltsReducerState, initialMaltsState} from './maltsReducer';
import {yeastReducer, YeastReducerState, initialYeastState} from './yeastReducer';
import {additionalIngredientsReducer, AdditionalIngredientsReducerState, initialAdditionalIngredientsState} from './additionalIngredientsReducer';

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
    productionReducer: productionReducer,
    hopsReducer: hopsReducer,
    maltsReducer: maltsReducer,
    yeastReducer: yeastReducer,
    additionalIngredientsReducer: additionalIngredientsReducer

});

export type { ApplicationReducerState, BeerDataReducerState, ProductionReducerState, HopsReducerState, MaltsReducerState, YeastReducerState, AdditionalIngredientsReducerState };
export { initialApplicationState, initialBeerState, initialProductionState ,initialHopsState, initialMaltsState, initialYeastState, initialAdditionalIngredientsState};
