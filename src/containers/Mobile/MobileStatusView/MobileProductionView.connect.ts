import { connect } from 'react-redux';
import { ProductionActions } from '../../../actions/actions';
import {MobileProductionView} from './MobileProductionView';
import {ConfirmStates} from '../../../enums/eConfirmStates';

const mapStateToProps = (state: any) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isPollingRunning: state.productionReducer.isPollingRunning
});

const mapDispatchToProps = (dispatch: any) => ({
    startPolling: () => dispatch(ProductionActions.startPolling()),
    stopPolling: () => dispatch(ProductionActions.stopPolling()),
    confirm: (confirmState: ConfirmStates) => dispatch(ProductionActions.confirm(confirmState))
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
