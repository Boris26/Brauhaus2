import { BeerActions } from '../actions/actions';
import AllBeerActions = BeerActions.AllBeerActions;
import {Beer, Yeast} from "../model/Beer";
import {BeerDTO} from "../model/BeerDTO";
import {FinishedBrew} from "../model/FinishedBrew";
import {BeerRecipeScaler} from "../utils/BeerScaler/ScalingBeerRecipe";


export interface BeerDataReducerState {
    beers: Beer[] | undefined
    beer: BeerDTO | undefined
    isSuccessful: boolean,
    isFetching: boolean,
    isSubmitSuccessful: boolean | undefined,
    message: string | undefined,
    type: string | undefined,
    selectedBeer?: Beer,
    scaledBeer?: Beer,
    beerToBrew?: Beer | undefined,
    finishedBrews?: FinishedBrew[] | undefined,
    beerFormState?: any
    importedBeer?: Beer | undefined
}

export const initialBeerState: BeerDataReducerState =
    {
        beers: undefined,
        beer: undefined,
        isSuccessful: false,
        isFetching: false,
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
          const selectedBeer = aAction.payload.beers.at(-1);
          console.log(selectedBeer);
          if(selectedBeer)
          {
              return {
                  ...aState,
                  beers: aAction.payload.beers,
                  selectedBeer: selectedBeer,
                  isFetching: false
              };
          }
          return { ...aState };

      }

      case BeerActions.ActionTypes.GET_BEERS: {
      return { ...aState, isFetching: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.SET_SELECTED_BEER: {
      return { ...aState, selectedBeer: aAction.payload.beer };
    }
    case BeerActions.ActionTypes.SUBMIT_BEER_SUCCESS: {
      return { ...aState, isSuccessful: true };
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
    case BeerActions.ActionTypes.ADD_IMPORTED_BEER: {
        const importedBeer =  aAction.payload.importedBeer;
        const aNewList = aState.beers
            ? [...aState.beers, importedBeer]
            : [importedBeer];
      return {
          ...aState,
          beers: aNewList,
          importedBeer: importedBeer

      };
    }

      case BeerActions.ActionTypes.UPDATE_RECIPE_SCALING: {
          const { scalingValues: aValues } = aAction.payload;
          const aOriginalBeer = aState.beers?.find(aBeer => aBeer.id === aValues.beer.id);

          if (!aOriginalBeer) return aState;

          return {
              ...aState,
              selectedBeer: BeerRecipeScaler.scale({
                  beer: aOriginalBeer,
                  volume: aValues.volume,
                  brewhouseEfficiency: aValues.brewhouseEfficiency
              })
          };
      }

      default:
      return aState;
  }
};

export { beerDataReducer };
