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
    isSavingBeer?: boolean
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
        isSavingBeer: false,
    }

const beerDataReducer = (
  aState: BeerDataReducerState = initialBeerState,
  aAction: AllBeerActions
) => {
  switch (aAction.type) {
    case BeerActions.ActionTypes.SUBMIT_BEER: {
      return { ...aState, isSavingBeer: true, isSubmitSuccessful: undefined, message: undefined, type: undefined };
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
      const submittedBeer = aAction.payload.beer;
      const beerForList = {
        ...submittedBeer,
        fermentation: submittedBeer.fermentationSteps,
      } as unknown as Beer;
      const beers = aState.beers ?? [];
      const existingIndex = beers.findIndex((aBeer) => aBeer.id === submittedBeer.id);
      const updatedBeers = existingIndex >= 0
        ? beers.map((aBeer) => aBeer.id === submittedBeer.id ? { ...aBeer, ...beerForList } : aBeer)
        : [...beers, beerForList];

      return {
        ...aState,
        isSuccessful: true,
        isSubmitSuccessful: true,
        isSavingBeer: false,
        message: 'Beer saved successfully',
        type: 'success',
        beer: submittedBeer,
        beers: updatedBeers,
        selectedBeer: beerForList,
        beerFormState: aState.beerFormState ? { ...aState.beerFormState, id: submittedBeer.id } : aState.beerFormState,
      };
    }



    case BeerActions.ActionTypes.SET_IS_SUBMIT_SUCCESSFUL: {
      return { ...aState, isSubmitSuccessful: aAction.payload.isSubmitSuccessful, isSavingBeer: false, message: aAction.payload.message, type: aAction.payload.type };
    }
    case BeerActions.ActionTypes.SET_BEER_TO_BREW: {
      return { ...aState, beerToBrew: aAction.payload.beer };
    }
    case BeerActions.ActionTypes.DELETE_BEER_SUCCESS: {
      const beers = (aState.beers ?? []).filter(aBeer => aBeer.id !== aAction.payload.deletedBeerId);
      const isSelectedBeerDeleted = aState.selectedBeer?.id === aAction.payload.deletedBeerId;
      const isBeerToBrewDeleted = aState.beerToBrew?.id === aAction.payload.deletedBeerId;

      // Falls das ausgewählte Rezept gelöscht wurde, wird eine sichere Auswahl gesetzt.
      const selectedBeer = isSelectedBeerDeleted ? beers.at(-1) : aState.selectedBeer;

      // Sicherheitsverhalten: Ein gelöschtes Rezept darf nicht weiter als "zu brauen" markiert bleiben.
      const beerToBrew = isBeerToBrewDeleted ? undefined : aState.beerToBrew;

      return { ...aState, beers, selectedBeer, beerToBrew };
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
