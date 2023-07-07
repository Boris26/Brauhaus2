import { combineReducers } from 'redux';
import { Views } from "../enums/eViews";
import {Beer, Yeast} from "../model/Beer";
import { BeerRepository } from "../repositorys/BeerRepository";
import {ApplicationActions, BeerActions} from "../actions/actions";
import AllBeerActions = BeerActions.AllBeerActions;
import {BeerDTO} from "../model/BeerDTO";
import {json} from "stream/consumers";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import AllApplicationActions = ApplicationActions.AllApplicationActions;

export interface ApplicationReducerState {
    view: Views;
    errorDialogHeader:string,
    errorDialogMessage:string,
    errorDialogOpen:boolean
}

export interface BeerDataReducerState {
    beers: Beer[] | undefined
    beer: BeerDTO | undefined
    malts: Malts[] | undefined
    hops: Hops[] | undefined
    yeasts: Yeast[] | undefined
    isSuccessful: boolean,
    isFetching: boolean,
    isSubmitMaltSuccessful: boolean|undefined,
    isSubmitHopSuccessful: boolean|undefined,
    isSubmitYeastSuccessful: boolean|undefined,
    isSubmitSuccessful: boolean|undefined,
    message: string|undefined
    type: string|undefined
}

export interface ProductionReducerState {

}


export const initialApplicationState: ApplicationReducerState =
{
    view: Views.MAIN,
    errorDialogHeader:"",
    errorDialogMessage:"",
    errorDialogOpen:false
}

export const initialBeerState: BeerDataReducerState =
    {
        beers: undefined,
        beer: undefined,
        malts: undefined,
        hops: undefined,
        yeasts: undefined,
        isSuccessful: false,
        isFetching: false,
        isSubmitMaltSuccessful: true,
        isSubmitHopSuccessful: true,
        isSubmitYeastSuccessful: true,
        isSubmitSuccessful: true,
        message: undefined,
        type: undefined
    }





const applicationReducer = (aState: ApplicationReducerState = initialApplicationState, aAction: AllApplicationActions) => {
    switch (aAction.type) {
        case ApplicationActions.ActionTypes.SET_VIEW: {
            console.log(aAction.payload.view);
            return {...aState, view: aAction.payload.view};
        }

        case ApplicationActions.ActionTypes.OPEN_ERROR_DIALOG: {
            return {...aState, errorDialogHeader: aAction.payload.header, errorDialogMessage: aAction.payload.content, errorDialogOpen: aAction.payload.open};
        }
            default:
                return aState;
    }

    return aState;
};

const beerDataReducer = (aState: BeerDataReducerState = initialBeerState, aAction: AllBeerActions) => {
    switch (aAction.type) {
        case BeerActions.ActionTypes.SUBMIT_BEER: {
            BeerRepository.submitBeer(aAction.payload.beer);
            return {...aState};
        }


        case BeerActions.ActionTypes.GET_BEERS_SUCCESS: {
            return {...aState, beers: aAction.payload.beers};
        }


        case BeerActions.ActionTypes.GET_BEERS: {
            BeerRepository.getBeers();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.SET_SELECTED_BEER: {
            return {...aState, selectedBeer: aAction.payload.beer};
        }

        case BeerActions.ActionTypes.SUBMIT_BEER_SUCCESS: {
            return {...aState, isSuccessful: aAction.payload.isSubmitBeerSuccessful};
        }

        case BeerActions.ActionTypes.GET_MALTS: {
            BeerRepository.getMalts();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_HOPS: {
            BeerRepository.getHops();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_YEASTS: {
            BeerRepository.getYeasts();
            return {...aState, isFetching: aAction.payload.isFetching};
        }

        case BeerActions.ActionTypes.GET_MALTS_SUCCESS: {
            return {...aState, malts: aAction.payload.malts, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.GET_HOPS_SUCCESS: {
            return {...aState, hops: aAction.payload.hops, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.GET_YEASTS_SUCCESS: {
            return {...aState, yeasts: aAction.payload.yeasts, isSuccessful: aAction.payload.isSuccessful};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_MALT: {
            BeerRepository.submitMalt(aAction.payload.malt);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_HOP: {
            BeerRepository.submitHop(aAction.payload.hop);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_YEAST: {
           BeerRepository.submitYeast(aAction.payload.yeast);
            return {...aState};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_MALT_SUCCESS: {
            return {...aState, isSubmitMaltSuccessful: aAction.payload.isSubmitMaltSuccessful};
        }

        case BeerActions.ActionTypes.SUBMIT_NEW_HOP_SUCCESS: {
            return {...aState, isSubmitHopSuccessful: aAction.payload.isSubmitHopSuccessful};
        }
        case BeerActions.ActionTypes.SUBMIT_NEW_YEAST_SUCCESS: {
            return {...aState, isSubmitYeastSuccessful: aAction.payload.isSubmitYeastSuccessful};
        }

        case BeerActions.ActionTypes.SET_IS_SUBMIT_SUCCESSFUL: {
            return {...aState, isSubmitHopSuccessful: aAction.payload.isSubmitSuccessful, isSubmitMaltSuccessful: aAction.payload.isSubmitSuccessful};
        }





        default:
            return aState;
    }
};

//const productionReducer = (aState: BeerDataReducerState = initialBeerState, aAction: AllBeerActions) => {};

export const rootReducer = combineReducers({
    applicationReducer: applicationReducer,
    beerDataReducer: beerDataReducer,
   // productionReducer: productionReducer
});
