import {connect} from "react-redux";
import {Dispatch} from "redux";
import {BeerActions, ProductionActions} from "../../actions/actions";
import {MashAgitatorStates} from "../../model/MashAgitator";
import {BrewingData} from "../../model/BrewingData";
import {FinishedBrewCreatePayload} from "../../model/FinishedBrew";
import {RootState} from "../../reducers/rootReducer";
import {Production} from './Production';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {withFinishedBrewCreateId} from '../../utils/finishedBrewCreateId';
import {WaterFillMode} from '../../model/WaterStatus';

const mapDispatchToProps = (dispatch: Dispatch) => ({
    toggleAgitator: (agitatorState: MashAgitatorStates) => {
        dispatch(ProductionActions.toggleAgitator(agitatorState))
    },
    startWaterFilling: (liters: number, mode?: WaterFillMode) => {
        dispatch(ProductionActions.startWaterFilling(liters, mode))
    },
    stopWaterFilling: () => dispatch(ProductionActions.stopWaterFilling()),
    setAgitatorSpeed: (agitatorSpeed: number) => {
        dispatch(ProductionActions.setAgitatorSpeed(agitatorSpeed))
    },
    sendBrewingData: (brewingData: BrewingData) => {
        dispatch(ProductionActions.sendBrewingData(brewingData))
    },
    addFinishedBrew: (finishedBrew: FinishedBrewCreatePayload) => {
        dispatch(BeerActions.addFinishedBrew(withFinishedBrewCreateId(finishedBrew)))
    },
    nextProcedureStep: () => {
        dispatch(ProductionActions.nextProcedureStep())
    },
    confirm: (confirmState: ConfirmStates) => {
        dispatch(ProductionActions.confirm(confirmState))
    }
});
const mapStateToProps = (state: RootState) => (
    {
        selectedBeer: state.beerDataReducer.beerToBrew,
        hops: state.hopsReducer.hops,
        additionalIngredients: state.additionalIngredientsReducer.additionalIngredients,
        temperature: state.productionReducer.temperature,
        currentAgitatorState: state.productionReducer.currentAgitatorState,
        currentAgitatorSpeed: state.productionReducer.currentAgitatorSpeed,
        agitatorIsRunning: state.productionReducer.agitatorIsRunning,
        agitatorSpeed: state.productionReducer.agitatorSpeed,
        isWaterFillingSuccessful: state.productionReducer.isWaterFillingSuccessful,
        isWaterStopping: state.productionReducer.isWaterStopping,
        waterFillingError: state.productionReducer.waterFillingError,
        isToggleAgitatorSuccess: state.productionReducer.isToggleAgitatorSuccess,
        brewingStatus: state.productionReducer.brewingStatus,
        historyVersion: state.productionReducer.historyVersion,
        historyError: state.productionReducer.historyError,
        timeAnchor: state.productionReducer.timeAnchor,
        realtimeState: state.productionReducer.realtimeState,
        socketConnected: state.productionReducer.socketConnection.connected,
        isBackenAvailable: state.productionReducer.isBackenAvailable,
        waterStatus: state.productionReducer.waterStatus,
        waterStatusStale: state.productionReducer.waterCommunication.stale,
        isPollingRunning: state.productionReducer.isPollingRunning,
        isConfirmPending: state.productionReducer.isConfirmPending,
        confirmError: state.productionReducer.confirmError,
    confirmStatusText: state.productionReducer.confirmation.syncWaiting
        ? 'Controllerstatus wird synchronisiert. Bitte nicht erneut bestätigen.'
        : state.productionReducer.confirmation.phase === 'AwaitingStateTransition'
            ? 'Bestätigung angenommen. Warte auf den aktualisierten Controllerstatus …' : undefined,
        isAddingFinishedBrew: Boolean(state.beerDataReducer.isAddingFinishedBrew),
        addFinishedBrewError: state.beerDataReducer.addFinishedBrewError,
        pendingFinishedBrewPayload: state.beerDataReducer.pendingFinishedBrewPayload,
        isNextProcedureStepPending: state.productionReducer.isNextProcedureStepPending,
        nextProcedureStepError: state.productionReducer.nextProcedureStepError,
        isBrewingStatusStale: state.productionReducer.isBrewingStatusStale,
        brewingStartError: state.productionReducer.brewingStartError,
        debug: state.applicationReducer.debug

    });
export default connect(mapStateToProps, mapDispatchToProps)(Production);
