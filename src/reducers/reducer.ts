import {combineReducers} from 'redux';
import { applicationReducer, ApplicationReducerState, initialApplicationState } from './applicationReducer';
import { beerDataReducer, BeerDataReducerState, initialBeerState } from './beerDataReducer';
import { productionReducer, ProductionReducerState, initialProductionState } from './productionReducer';

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
    productionReducer: productionReducer
});

export type { ApplicationReducerState, BeerDataReducerState, ProductionReducerState };
export { initialApplicationState, initialBeerState, initialProductionState };
