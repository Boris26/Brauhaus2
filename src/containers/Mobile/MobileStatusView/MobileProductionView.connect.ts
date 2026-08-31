import { connect } from 'react-redux';
import { ProductionActions } from '../../../actions/actions';
import {MobileProductionView} from './MobileProductionView';
import {ConfirmStates} from '../../../enums/eConfirmStates';

const mapStateToProps = (state: any) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isConfirmPending: state.productionReducer.isConfirmPending,
    confirmError: state.productionReducer.confirmError,
    isBrewingStatusStale: state.productionReducer.isBrewingStatusStale
    ,realtimeState: state.productionReducer.realtimeState
    ,socketConnected: state.productionReducer.socketConnection.connected
});

const mapDispatchToProps = (dispatch: any) => ({
    confirm: (confirmState: ConfirmStates) => dispatch(ProductionActions.confirm(confirmState))
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
