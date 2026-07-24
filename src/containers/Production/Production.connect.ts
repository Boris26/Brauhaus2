import {connect} from "react-redux";
import {Dispatch} from "redux";
import {BeerActions, ProductionActions} from "../../actions/actions";
import {MashAgitatorStates} from "../../model/MashAgitator";
import {BrewingData} from "../../model/BrewingData";
import {FinishedBrew} from "../../model/FinishedBrew";
import {RootState} from "../../reducers/rootReducer";
import {Production} from './Production';

const mapDispatchToProps = (dispatch: Dispatch) => ({
    getTemperatures: () => {
        dispatch(ProductionActions.getTemperatures())
    },
    toggleAgitator: (agitatorState: MashAgitatorStates) => {
        dispatch(ProductionActions.toggleAgitator(agitatorState))
    },
    startWaterFilling: (liters: number) => {
        dispatch(ProductionActions.startWaterFilling(liters))
    },
    setAgitatorSpeed: (agitatorSpeed: number) => {
        dispatch(ProductionActions.setAgitatorSpeed(agitatorSpeed))
    },
    sendBrewingData: (brewingData: BrewingData) => {
        dispatch(ProductionActions.sendBrewingData(brewingData))
    },
    startPolling: () => {
        dispatch(ProductionActions.startPolling())
    },
    stopPolling: () => {
        dispatch(ProductionActions.stopPolling())
    },

    addFinishedBrew: (finishedBrew: FinishedBrew) => {
        dispatch(BeerActions.addFinishedBrew(finishedBrew))
    },
    nextProcedureStep: () => {
        dispatch(ProductionActions.nextProcedureStep())
    }
});
const mapStateToProps = (state: RootState) => (
    {
        selectedBeer: state.beerDataReducer.beerToBrew,
        temperature: state.productionReducer.temperature,
        currentAgitatorState: state.productionReducer.currentAgitatorState,
        currentAgitatorSpeed: state.productionReducer.currentAgitatorSpeed,
        agitatorIsRunning: state.productionReducer.agitatorIsRunning,
        agitatorSpeed: state.productionReducer.agitatorSpeed,
        isWaterFillingSuccessful: state.productionReducer.isWaterFillingSuccessful,
        isToggleAgitatorSuccess: state.productionReducer.isToggleAgitatorSuccess,
        brewingStatus: state.productionReducer.brewingStatus,
        isBackenAvailable: state.productionReducer.isBackenAvailable,
        waterStatus: state.productionReducer.waterStatus,
        isPollingRunning: state.productionReducer.isPollingRunning

    });
export default connect(mapStateToProps, mapDispatchToProps)(Production);
