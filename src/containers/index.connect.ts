import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import {BrewingStatus} from "../model/brewingStatus.types";
import {ProductionActions} from "../actions/actions";
import {ConfirmStates} from "../enums/eConfirmStates";
import {Index} from './index';

const mapStateToProps = (state: any) => ({
    viewState: state.applicationReducer.view as Views,
    brewingStatus: state.productionReducer.brewingStatus,
});

const mapDispatchToProps = (dispatch: any) => ({
    confirm: (confirmState: ConfirmStates) => {
        dispatch(ProductionActions.confirm(confirmState))
    },

    checkIsBackenAvailable: () => {
        dispatch(ProductionActions.checkIsBackenAvailable())
    },

    webSocketConnect: () => {
        dispatch(ProductionActions.webSocketConnect());
    }



})


export default connect(mapStateToProps, mapDispatchToProps)(Index);
