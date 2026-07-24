import { connect } from 'react-redux';
import {Views} from "../../../enums/eViews";
import {ApplicationActions} from "../../../actions/actions";
import setViewState = ApplicationActions.setViewState;
import {Header} from './Header';

const mapStateToProps = (state: any) => ({
    currentView: state.applicationReducer.view,
    messages: state.applicationReducer.message,
    backendStatus: state.productionReducer.isBackenAvailable,
});

const mapDispatchToProps = (dispatch: any) => ({
    setViewState: (viewState: Views) => dispatch(setViewState(viewState)),
    removeAllMessages: () => dispatch(ApplicationActions.removeMessage()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
