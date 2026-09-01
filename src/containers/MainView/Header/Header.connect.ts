import { connect } from 'react-redux';
import {Views} from "../../../enums/eViews";
import {ApplicationActions} from "../../../actions/actions";
import setViewState = ApplicationActions.setViewState;
import {Header} from './Header';
import type {RootState} from '../../../reducers/rootReducer';

const mapStateToProps = (state: RootState) => ({
    currentView: state.applicationReducer.view,
    messages: state.applicationReducer.message,
    backendStatus: state.productionReducer.isBackenAvailable,
    brewingStatus: state.productionReducer.brewingStatus,
    realtimeState: state.productionReducer.realtimeState,
    socketConnected: state.productionReducer.socketConnection.connected,
    warnings: state.warningReducer.warnings,
    warningsReceived: state.warningReducer.warningsReceived,
});

const mapDispatchToProps = (dispatch: any) => ({
    setViewState: (viewState: Views) => dispatch(setViewState(viewState)),
    removeAllMessages: () => dispatch(ApplicationActions.removeMessage()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
