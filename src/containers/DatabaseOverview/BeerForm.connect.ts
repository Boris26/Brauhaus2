import {connect} from "react-redux";
import {Beer, Hop, Malt, Yeast} from "../../model/Beer";
import {BeerDTO} from "../../model/BeerDTO";
import {BeerActions} from "../../actions/actions";
import {MaltsActions} from "../../actions/malt.actions";
import {HopsActions} from "../../actions/hops.actions";
import {YeastActions} from "../../actions/yeast.actions";
import {AdditionalIngredientsActions} from "../../actions/additionalIngredients.actions";
import {AdditionalIngredient} from "../../model/AdditionalIngredient";
import {BeerForm} from './BeerForm';

const mapStateToProps = (state: any) => ({
    malts: state.maltsReducer.malts,
    hops: state.hopsReducer.hops,
    yeasts: state.yeastReducer.yeasts,
    additionalIngredients: state.additionalIngredientsReducer.additionalIngredients || [],
    isSubmitSuccessful: state.beerDataReducer.isSubmitSuccessful,
    message: state.beerDataReducer.message,
    messageType: state.beerDataReducer.type,
    beerFormState: state.beerDataReducer.beerFormState,
    beers: state.beerDataReducer.beers,
    importedBeer: state.beerDataReducer.importedBeer,
    isSavingBeer: state.beerDataReducer.isSavingBeer,
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitBeer: (beer: BeerDTO) => dispatch(BeerActions.submitBeer(beer)),
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    getAdditionalIngredients: (isFetching: boolean) => dispatch(AdditionalIngredientsActions.getAdditionalIngredients(isFetching)),
    saveBeerFormState: (formState: any) => dispatch(BeerActions.saveBeerFormState(formState)),
    importBeer: (file: File) => dispatch(BeerActions.importBeer(file)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BeerForm);
