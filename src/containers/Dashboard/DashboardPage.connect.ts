import { connect } from 'react-redux';
import { BeerActions } from '../../actions/actions';
import { BeerDataReducerState, FermentationState, ProductionReducerState } from '../../reducers/rootReducer';
import {DashboardPage} from './DashboardPage';
import {FermentationActions} from '../../actions/fermentation.actions';

interface DashboardRootState {
  beerDataReducer: BeerDataReducerState;
  productionReducer: ProductionReducerState;
  fermentationReducer: FermentationState;
}

const mapStateToProps = (state: DashboardRootState) => ({
  beers: state.beerDataReducer.beers,
  finishedBrews: state.beerDataReducer.finishedBrews,
  isFetching: state.beerDataReducer.isFetching,
  beerToBrew: state.beerDataReducer.beerToBrew,
  brewingStatus: state.productionReducer.brewingStatus,
  isBackendAvailable: state.productionReducer.isBackenAvailable,
  realtimeState: state.productionReducer.realtimeState,
  socketConnected: state.productionReducer.socketConnection.connected,
  fermentationByBrewId: state.fermentationReducer.byBrewId,
});

const mapDispatchToProps = (dispatch: (action: any) => void) => ({
  getBeers: (isFetching: boolean) => dispatch(BeerActions.getBeers(isFetching)),
  getFinishedBrews: (isFetching: boolean) => dispatch(BeerActions.getFinishedBeers(isFetching)),
  loadFermentation: (id: string) => dispatch(FermentationActions.load(id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
