import { connect } from 'react-redux';
import { BeerActions } from '../../actions/actions';
import { BeerDataReducerState, ProductionReducerState } from '../../reducers/rootReducer';
import {DashboardPage} from './DashboardPage';

interface DashboardRootState {
  beerDataReducer: BeerDataReducerState;
  productionReducer: ProductionReducerState;
}

const mapStateToProps = (state: DashboardRootState) => ({
  beers: state.beerDataReducer.beers,
  finishedBrews: state.beerDataReducer.finishedBrews,
  isFetching: state.beerDataReducer.isFetching,
  beerToBrew: state.beerDataReducer.beerToBrew,
  brewingStatus: state.productionReducer.brewingStatus,
  isBackendAvailable: state.productionReducer.isBackenAvailable,
});

const mapDispatchToProps = (dispatch: (action: BeerActions.AllBeerActions) => void) => ({
  getBeers: (isFetching: boolean) => dispatch(BeerActions.getBeers(isFetching)),
  getFinishedBrews: (isFetching: boolean) => dispatch(BeerActions.getFinishedBeers(isFetching)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
