import {connect} from "react-redux";
import {Beer} from "../../../model/Beer";
import {BeerActions} from "../../../actions/actions";
import setSelectedBeer = BeerActions.setSelectedBeer;
import {BeerTableComponent} from './Table';

const mapStateToProps = (state: any) => ({
    beerToBrew: state.beerDataReducer.beerToBrew,
    isPollingRunning: state.productionReducer.isPollingRunning,
    beers: state.beerDataReducer.beers ?? [],
    selectedBeer: state.beerDataReducer.selectedBeer
});

const mapDispatchToProps = (dispatch: any) => ({
    setSelectedBeer: (beer: Beer) => dispatch(setSelectedBeer(beer)),
    setBeerToBrew: (beer: Beer | undefined ) => dispatch(BeerActions.setBeerToBrew(beer)),
    exportShoppingListPdf: (beer: Beer) => dispatch(BeerActions.generateShoppingListPdf(beer)),
    deleteBeer: (aBeerId: string) => dispatch(BeerActions.deleteBeer(aBeerId)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BeerTableComponent);
