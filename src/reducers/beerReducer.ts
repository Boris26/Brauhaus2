import { BeerActions } from '../actions/actions';
import AllBeerActions = BeerActions.AllBeerActions;
import {Beer} from "../model/Beer";
import {BeerDTO} from "../model/BeerDTO";
import {FinishedBrew, FinishedBrewCreatePayload} from "../model/FinishedBrew";
import {BeerRecipeScaler} from "../utils/BeerScaler/ScalingBeerRecipe";
import {RecipeImportResult} from '../model/RecipeImport';
import {enforceFinishedBrewStateInvariant} from '../utils/finishedBrewChanges';


export interface BeerDataReducerState {
    beers: Beer[] | undefined
    beer: BeerDTO | undefined
    isSuccessful: boolean,
    isFetching: boolean,
    isFetchingBeers: boolean,
    isFetchingFinishedBrews: boolean,
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
    isImportingBeer?: boolean
    importResult?: RecipeImportResult
    importError?: string
    savingFinishedBrewIds?: string[]
    finishedBrewUpdateErrors?: Record<string, string>
    isAddingFinishedBrew?: boolean
    addFinishedBrewError?: string
    pendingFinishedBrewPayload?: FinishedBrewCreatePayload
    deletingFinishedBrewIds?: string[]
    finishedBrewDeleteErrors?: Record<string, string>
}

export const initialBeerState: BeerDataReducerState =
    {
        beers: undefined,
        beer: undefined,
        isSuccessful: false,
        isFetching: false,
        isFetchingBeers: false,
        isFetchingFinishedBrews: false,
        isSubmitSuccessful: true,
        message: undefined,
        type: undefined,
        importedBeer: undefined,
        isSavingBeer: false,
        isImportingBeer: false,
        savingFinishedBrewIds: [],
        finishedBrewUpdateErrors: {},
        isAddingFinishedBrew: false,
        pendingFinishedBrewPayload: undefined,
        deletingFinishedBrewIds: [],
        finishedBrewDeleteErrors: {},
    }

const beerDataReducer = (
  aState: BeerDataReducerState = initialBeerState,
  aAction: AllBeerActions
): BeerDataReducerState => {
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
                  isFetching: false,
                  isFetchingBeers: false
              };
          }
          return {
              ...aState,
              beers: [],
              selectedBeer: undefined,
              beerToBrew: undefined,
              isFetching: false,
              isFetchingBeers: false,
          };

      }

      case BeerActions.ActionTypes.GET_BEERS: {
      return { ...aState, isFetching: aAction.payload.isFetching, isFetchingBeers: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_BEERS_FAILURE: {
      return {...aState, isFetching: false, isFetchingBeers: false};
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
      return { ...aState, isFetching: aAction.payload.isFetching, isFetchingFinishedBrews: aAction.payload.isFetching };
    }
    case BeerActions.ActionTypes.GET_FINISHED_BEERS_SUCCESS: {
      return { ...aState, isFetching: false, isFetchingFinishedBrews: false, finishedBrews: aAction.payload.finishedBeers ?? undefined };
    }
    case BeerActions.ActionTypes.GET_FINISHED_BEERS_FAILURE: {
      return {...aState, isFetching: false, isFetchingFinishedBrews: false};
    }
    case BeerActions.ActionTypes.UPDATE_ACTIVE_BEER: {
      const requestedId = aAction.payload.beer.id;
      const savingFinishedBrewIds = Array.from(new Set([...(aState.savingFinishedBrewIds ?? []), requestedId]));
      const finishedBrewUpdateErrors = {...(aState.finishedBrewUpdateErrors ?? {})};
      delete finishedBrewUpdateErrors[requestedId];
      return { ...aState, savingFinishedBrewIds, finishedBrewUpdateErrors };
    }
    case BeerActions.ActionTypes.DELETE_FINISHED_BEER: {
      const id = aAction.payload.finishedBrewId;
      const errors = {...(aState.finishedBrewDeleteErrors ?? {})};
      delete errors[id];
      return { ...aState, deletingFinishedBrewIds: Array.from(new Set([...(aState.deletingFinishedBrewIds ?? []), id])), finishedBrewDeleteErrors: errors };
    }
    case BeerActions.ActionTypes.DELETE_FINISHED_BEER_SUCCESS: {
      let finishedBrews = aState.finishedBrews ? [...aState.finishedBrews] : [];
      finishedBrews = finishedBrews.filter(b => b.id !== aAction.payload.deletedFinishedBrewId);
      return { ...aState, finishedBrews, deletingFinishedBrewIds: (aState.deletingFinishedBrewIds ?? []).filter(id => id !== aAction.payload.deletedFinishedBrewId) };
    }
    case BeerActions.ActionTypes.DELETE_FINISHED_BEER_FAILURE: {
      const {deletedFinishedBrewId, message} = aAction.payload;
      return {...aState, deletingFinishedBrewIds: (aState.deletingFinishedBrewIds ?? []).filter(id => id !== deletedFinishedBrewId), finishedBrewDeleteErrors: {...(aState.finishedBrewDeleteErrors ?? {}), [deletedFinishedBrewId]: message}};
    }
    case BeerActions.ActionTypes.ADD_FINISHED_BREW: {
      return {
        ...aState,
        isAddingFinishedBrew: true,
        addFinishedBrewError: undefined,
        pendingFinishedBrewPayload: aAction.payload.finishedBrew,
      };
    }
    case BeerActions.ActionTypes.ADD_FINISHED_BREW_SUCCESS: {
      const createdBrew = enforceFinishedBrewStateInvariant(aAction.payload.beer);
      const finishedBrews = aState.finishedBrews ?? [];
      if (!createdBrew?.id) {
        return {...aState, isAddingFinishedBrew: false, addFinishedBrewError: 'Die Create-Antwort enthält keine FinishedBeer-ID.'};
      }
      return {
        ...aState,
        isAddingFinishedBrew: false,
        addFinishedBrewError: undefined,
        pendingFinishedBrewPayload: undefined,
        finishedBrews: [...finishedBrews, createdBrew],
      };
    }
    case BeerActions.ActionTypes.ADD_FINISHED_BREW_FAILURE: {
      return { ...aState, isAddingFinishedBrew: false, addFinishedBrewError: aAction.payload.message };
    }
    case BeerActions.ActionTypes.UPDATE_FINISHED_BREW_SUCCESS: {
        const updatedBrew = enforceFinishedBrewStateInvariant(aAction.payload.beer);
          const requestedId = aAction.payload.requestedId;
          const finishedBrews = aState.finishedBrews ?? [];
          const savingFinishedBrewIds = (aState.savingFinishedBrewIds ?? []).filter(id => id !== requestedId);

          if (!updatedBrew?.id || updatedBrew.id !== requestedId || !finishedBrews.some(b => b.id === requestedId)) {
              return {
                  ...aState,
                  savingFinishedBrewIds,
                  finishedBrewUpdateErrors: {
                      ...(aState.finishedBrewUpdateErrors ?? {}),
                      [requestedId]: 'Die Update-Antwort enthält keine passende FinishedBeer-ID.',
                  },
              };
          }

          const finishedBrewUpdateErrors = {...(aState.finishedBrewUpdateErrors ?? {})};
          delete finishedBrewUpdateErrors[requestedId];

          return {
              ...aState,
              savingFinishedBrewIds,
              finishedBrewUpdateErrors,
              finishedBrews: finishedBrews.map(b => b.id === requestedId ? updatedBrew : b),
          };
      }
      case BeerActions.ActionTypes.UPDATE_FINISHED_BREW_FAILURE: {
          const {requestedId, message} = aAction.payload;
          return {
              ...aState,
              savingFinishedBrewIds: (aState.savingFinishedBrewIds ?? []).filter(id => id !== requestedId),
              finishedBrewUpdateErrors: {...(aState.finishedBrewUpdateErrors ?? {}), [requestedId]: message},
          };
      }

      case BeerActions.ActionTypes.SAVE_BEER_FORM_STATE: {
      return { ...aState, beerFormState: aAction.payload.formState };
    }
    case BeerActions.ActionTypes.LOAD_BEER_FORM_STATE: {
      return { ...aState, beerFormState: aAction.payload.formState };
    }
    case BeerActions.ActionTypes.ADD_IMPORTED_BEER: {
        const result = aAction.payload.result;
        const importedBeer = result.recipe;
        const beers = aState.beers ?? [];
        const alreadyStored = beers.some(beer => beer.id === importedBeer.id);
        const aNewList = alreadyStored
            ? beers.map(beer => beer.id === importedBeer.id ? importedBeer : beer)
            : [...beers, importedBeer];
      return {
          ...aState,
          beers: aNewList,
          importedBeer,
          importResult: result,
          importError: undefined,
          isImportingBeer: false,

      };
    }
    case BeerActions.ActionTypes.IMPORT_BEER:
      return {...aState, isImportingBeer: true, importError: undefined, importResult: undefined};
    case BeerActions.ActionTypes.IMPORT_BEER_FAILED:
      return {...aState, isImportingBeer: false, importError: aAction.payload.message};

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
