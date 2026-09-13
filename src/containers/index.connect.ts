import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import {Index} from './index';

const mapStateToProps = (state: any) => ({
    viewState: state.applicationReducer.view as Views,
    brewingStatus: state.productionReducer.brewingStatus,
    socketConnected: state.productionReducer.socketConnection.connected,
    socketId: state.productionReducer.socketConnection.socketId,
});

export default connect(mapStateToProps)(Index);
