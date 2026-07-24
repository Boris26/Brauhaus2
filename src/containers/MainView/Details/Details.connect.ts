import { connect } from 'react-redux';
import { BeerActions } from "../../../actions/actions";
import {scalingValues} from "../../../utils/BeerScaler/ScalingBeerRecipe";
import {Details} from './Details';

const mapStateToProps = (state: any) => ({
    selectedBeer: state.beerDataReducer.selectedBeer,
});

const mapDispatchToProps = (dispatch: any) => ({
    updateRecipeScaling: (aScalingValues: scalingValues) =>
        dispatch(BeerActions.updateRecipeScaling(aScalingValues)),
});


export default connect(mapStateToProps, mapDispatchToProps)(Details);
