import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import {ProductionActions} from "../actions/actions";
import {Index} from './index';
import {FermentationActions} from '../actions/fermentation.actions';

const mapStateToProps = (state: any) => ({
    viewState: state.applicationReducer.view as Views,
    brewingStatus: state.productionReducer.brewingStatus,
    socketConnected: state.productionReducer.socketConnection.connected,
    socketId: state.productionReducer.socketConnection.socketId,
});

const mapDispatchToProps = (dispatch: any) => ({
    checkIsBackenAvailable: () => {
        dispatch(ProductionActions.checkIsBackenAvailable())
    },

    webSocketConnect: () => {
        dispatch(ProductionActions.webSocketConnect());
    },
    webSocketDisconnect: () => {
        dispatch(ProductionActions.webSocketDisconnect());
    },
    fermentationGatewayConnect: () => dispatch(FermentationActions.gatewayConnect()),
    fermentationGatewayDisconnect: () => dispatch(FermentationActions.gatewayDisconnect()),



})


export default connect(mapStateToProps, mapDispatchToProps)(Index);
