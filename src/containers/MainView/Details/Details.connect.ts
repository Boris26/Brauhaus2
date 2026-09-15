import { connect } from 'react-redux';
import { BeerActions } from "../../../actions/actions";
import {MaltsActions} from "../../../actions/malt.actions";
import {HopsActions} from "../../../actions/hops.actions";
import {YeastActions} from "../../../actions/yeast.actions";
import {scalingValues} from "../../../utils/BeerScaler/ScalingBeerRecipe";
import {Details} from './Details';

const mapStateToProps = (state: any) => ({
    selectedBeer: state.beerDataReducer.selectedBeer,
    malts: state.maltsReducer.malts,
    hops: state.hopsReducer.hops,
    yeasts: state.yeastReducer.yeasts,
});

const mapDispatchToProps = (dispatch: any) => ({
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    updateRecipeScaling: (aScalingValues: scalingValues) =>
        dispatch(BeerActions.updateRecipeScaling(aScalingValues)),
});


export default connect(mapStateToProps, mapDispatchToProps)(Details);
