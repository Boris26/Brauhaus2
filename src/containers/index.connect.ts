import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import {ProductionActions} from "../actions/actions";
import {Index} from './index';

const mapStateToProps = (state: any) => ({
    viewState: state.applicationReducer.view as Views,
    brewingStatus: state.productionReducer.brewingStatus,
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
    }



})


export default connect(mapStateToProps, mapDispatchToProps)(Index);
