import { BeerActions } from '../actions/actions';
import AllBeerActions = BeerActions.AllBeerActions;
import {Beer, Yeast} from "../model/Beer";
import {BeerDTO} from "../model/BeerDTO";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {FinishedBrew} from "../model/FinishedBrew";


export interface BeerDataReducerState {
    beers: Beer[] | undefined
    beer: BeerDTO | undefined
    malts: Malts[] | undefined
    hops: Hops[] | undefined
    yeasts: Yeast[] | undefined
    isSuccessful: boolean,
    isFetching: boolean,
    isSubmitMaltSuccessful: boolean | undefined,
    isSubmitHopSuccessful: boolean | undefined,
    isSubmitYeastSuccessful: boolean | undefined,
    isSubmitSuccessful: boolean | undefined,
    message: string | undefined,
    type: string | undefined,
    selectedBeer?: Beer,
    beerToBrew?: Beer | undefined,
    finishedBrews?: FinishedBrew[] | undefined,
    beerFormState?: any
    importedBeer?: Beer | undefined
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
        type: undefined,
        importedBeer: undefined,
    }

const beerDataReducer = (
  aState: BeerDataReducerState = initialBeerState,
  aAction: AllBeerActions
) => {
  switch (aAction.type) {
    case BeerActions.ActionTypes.SUBMIT_BEER: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.GET_BEERS_SUCCESS: {
      return { ...aState, beers: aAction.payload.beers, isFetching: false };
    }
    case BeerActions.ActionTypes.GET_BEERS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.SET_SELECTED_BEER: {
      return { ...aState, selectedBeer: aAction.payload.beer };
    }
    case BeerActions.ActionTypes.SUBMIT_BEER_SUCCESS: {
      return { ...aState, isSuccessful: aAction.payload.isSubmitBeerSuccessful };
    }
    case BeerActions.ActionTypes.GET_MALTS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_HOPS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_YEASTS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_MALTS_SUCCESS: {
      return { ...aState, malts: aAction.payload.malts, isSuccessful: aAction.payload.isSuccessful };
    }
    case BeerActions.ActionTypes.GET_HOPS_SUCCESS: {
      return { ...aState, hops: aAction.payload.hops, isSuccessful: aAction.payload.isSuccessful };
    }
    case BeerActions.ActionTypes.GET_YEASTS_SUCCESS: {
      return { ...aState, yeasts: aAction.payload.yeasts, isSuccessful: aAction.payload.isSuccessful };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_MALT: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_HOP: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_YEAST: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_MALT_SUCCESS: {
      return { ...aState, isSubmitMaltSuccessful: aAction.payload.isSubmitMaltSuccessful };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_HOP_SUCCESS: {
      return { ...aState, isSubmitHopSuccessful: aAction.payload.isSubmitHopSuccessful };
    }
    case BeerActions.ActionTypes.SUBMIT_NEW_YEAST_SUCCESS: {
      return { ...aState, isSubmitYeastSuccessful: aAction.payload.isSubmitYeastSuccessful };
    }
    case BeerActions.ActionTypes.SET_IS_SUBMIT_SUCCESSFUL: {
      return { ...aState, isSubmitSuccessful: aAction.payload.isSubmitSuccessful };
    }
    case BeerActions.ActionTypes.SET_BEER_TO_BREW: {
      return { ...aState, beerToBrew: aAction.payload.beer };
    }

    case BeerActions.ActionTypes.GET_FINISHED_BEERS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_FINISHED_BEERS_SUCCESS: {
      return { ...aState, finishedBrews: aAction.payload.finishedBeers };
    }
    case BeerActions.ActionTypes.UPDATE_ACTIVE_BEER: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.DELETE_FINISHED_BEER: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.DELETE_FINISHED_BEER_SUCCESS: {
      let finishedBrews = aState.finishedBrews ? [...aState.finishedBrews] : [];
      finishedBrews = finishedBrews.filter(b => b.id !== aAction.payload.deletedFinishedBrewId);
      return { ...aState, finishedBrews };
    }
    case BeerActions.ActionTypes.ADD_FINISHED_BREW: {
      return { ...aState };
    }
    case BeerActions.ActionTypes.UPDATE_FINISHED_BREW_SUCCESS: {
        const updatedBrew = aAction.payload.beer;
          const finishedBrews = aState.finishedBrews ?? [];
          const found = finishedBrews.some(b => b.id === updatedBrew.id);

          return {
              ...aState,
              finishedBrews: found
                  ? finishedBrews.map(b => b.id === updatedBrew.id ? updatedBrew : b)
                  : [...finishedBrews, updatedBrew],
          };
      }

      case BeerActions.ActionTypes.SAVE_BEER_FORM_STATE: {
      return { ...aState, beerFormState: aAction.payload.formState };
    }
    case BeerActions.ActionTypes.LOAD_BEER_FORM_STATE: {
      return { ...aState, beerFormState: aAction.payload.formState };
    }
    case BeerActions.ActionTypes.SET_IMPORTED_BEER: {
      return { ...aState, importedBeer: aAction.payload.importedBeer };
    }
    default:
      return aState;
  }
};

export { beerDataReducer };
