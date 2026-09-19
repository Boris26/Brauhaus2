import { connect } from 'react-redux';
import { ApplicationActions } from '../../../actions/actions';
import {SettingsPage} from './SettingsPage';

const mapStateToProps = (state: any) => ({
    debug: state.applicationReducer.debug as boolean,
    agitatorDefaultsSnapshot: state.productionReducer.agitatorDefaults,
    temperatureSensor: state.productionReducer.realtimeState.temperatureSensor,
    socketConnected: state.productionReducer.socketConnection.connected,
});

const mapDispatchToProps = (dispatch: any) => ({
    setDebug: (debug: boolean) => dispatch(ApplicationActions.setDebug(debug)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPage);
