import {combineReducers} from 'redux';
import { applicationReducer, ApplicationReducerState, initialApplicationState } from './applicationReducer';
import { beerDataReducer, BeerDataReducerState, initialBeerState } from './beerReducer';
import { productionReducer, ProductionReducerState, initialProductionState } from './productionReducer';
import { hopsReducer, HopsReducerState, initialHopsState } from './hopsReducer';
import {maltsReducer, MaltsReducerState, initialMaltsState} from './maltsReducer';
import {yeastReducer, YeastReducerState, initialYeastState} from './yeastReducer';
import {additionalIngredientsReducer, AdditionalIngredientsReducerState, initialAdditionalIngredientsState} from './additionalIngredientsReducer';
import {initialWarningState, warningReducer, WarningReducerState} from './warningReducer';
import {fermentationReducer, FermentationState, initialFermentationState} from './fermentationReducer';

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
    productionReducer: productionReducer,
    warningReducer: warningReducer,
    hopsReducer: hopsReducer,
    maltsReducer: maltsReducer,
    yeastReducer: yeastReducer,
    additionalIngredientsReducer: additionalIngredientsReducer,
    fermentationReducer

});

export interface RootState {
    applicationReducer: ApplicationReducerState;
    beerDataReducer: BeerDataReducerState;
    productionReducer: ProductionReducerState;
    warningReducer: WarningReducerState;
    hopsReducer: HopsReducerState;
    maltsReducer: MaltsReducerState;
    yeastReducer: YeastReducerState;
    additionalIngredientsReducer: AdditionalIngredientsReducerState;
    fermentationReducer: FermentationState;
}
export type { ApplicationReducerState, BeerDataReducerState, ProductionReducerState, WarningReducerState, HopsReducerState, MaltsReducerState, YeastReducerState, AdditionalIngredientsReducerState };
export { initialApplicationState, initialBeerState, initialProductionState, initialWarningState, initialHopsState, initialMaltsState, initialYeastState, initialAdditionalIngredientsState};
export type {FermentationState};
export {initialFermentationState};
