import { connect } from 'react-redux';
import { ProductionActions } from '../../../actions/actions';
import {MobileProductionView} from './MobileProductionView';
import {ConfirmStates} from '../../../enums/eConfirmStates';
import type {RootState} from '../../../reducers/rootReducer';

const mapStateToProps = (state: RootState) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isConfirmPending: state.productionReducer.isConfirmPending,
    confirmError: state.productionReducer.confirmError,
    isBrewingStatusStale: state.productionReducer.isBrewingStatusStale,
    realtimeState: state.productionReducer.realtimeState,
    socketConnected: state.productionReducer.socketConnection.connected,
    warnings: state.warningReducer.warnings,
    warningsReceived: state.warningReducer.warningsReceived,
});

const mapDispatchToProps = (dispatch: any) => ({
    confirm: (confirmState: ConfirmStates) => dispatch(ProductionActions.confirm(confirmState))
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
