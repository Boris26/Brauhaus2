import { connect } from 'react-redux';
import { ProductionActions } from '../../../actions/actions';
import {MobileProductionView} from './MobileProductionView';

const mapStateToProps = (state: any) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isPollingRunning: state.productionReducer.isPollingRunning
});

const mapDispatchToProps = (dispatch: any) => ({
    startPolling: () => dispatch(ProductionActions.startPolling()),
    stopPolling: () => dispatch(ProductionActions.stopPolling())
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
