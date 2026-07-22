import React from 'react';
import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import Main from "./MainView/Main";
import Production from "./Production/Production";
import DatabaseOverview from "./DatabaseOverview/BeerForm";
import SimpleBar from "simplebar-react";
import ModalDialog, {DialogType} from "../components/ModalDialog/ModalDialog";
import {BrewingStatus} from "../model/brewingStatus.types";
import {ProductionActions} from "../actions/actions";
import {ConfirmStates} from "../enums/eConfirmStates";
import FinishedBrewsTable from "./MainView/FinishBrewsBeers/FinishedBrewsTable";
import BrewingCalculations from "./BrewingCalculations/BrewingCalculations";
import IngredientsFormPage from "./DatabaseOverview/IngredientsFormPage";
import SettingsPage from "./Settings/SettingsPage";
import VersionPage from "./Version/VersionPage";
import DashboardPage from "./Dashboard/DashboardPage";
import {getBrewingStatusLabel, getConfirmationType, shouldShowConfirmButton, shouldShowWaitingDialog} from "../utils/brewingStatus/selectors";

interface indexMainProps {
    viewState: Views;
    brewingStatus: BrewingStatus;
    confirm: (confirmState: ConfirmStates) => void;
    checkIsBackenAvailable : () => void;
    webSocketConnect: () => void;
}

export class Index extends React.Component<indexMainProps> {
    constructor(props: indexMainProps) {
        super(props);
    }

    componentDidMount() {
        const {checkIsBackenAvailable} = this.props;
        checkIsBackenAvailable();
    }

    componentDidUpdate(prevProps: Readonly<indexMainProps>, prevState: Readonly<{}>, snapshot?: any) {
        const {brewingStatus} = this.props;

        if (brewingStatus?.currentStep?.mode !== prevProps?.brewingStatus?.currentStep?.mode) {
            console.log("Step mode has changed");
        }
    }

    getConfirmStateForWaiting = (): ConfirmStates | undefined => getConfirmationType(this.props.brewingStatus);

    confirmDialog = () => {
        const {confirm} = this.props;
        const confirmState = this.getConfirmStateForWaiting();
        if (confirmState === undefined) {
            console.warn('Waiting state has no concrete confirmation command; no Confirm endpoint will be called.');
            return;
        }
        confirm(confirmState);
    }

    getDialogMessage() {
        return getBrewingStatusLabel(this.props.brewingStatus);
    }

    showDialog() {
        const {brewingStatus} = this.props;
        const message = this.getDialogMessage();
        return (
            <div>
                <ModalDialog
                    type={DialogType.CONFIRM}
                    open={shouldShowWaitingDialog(brewingStatus)}
                    content={message}
                    header={"Confirm"}
                    onConfirm={shouldShowConfirmButton(brewingStatus) ? this.confirmDialog : () => {}}
                />
            </div>
        );
    }


    render() {
        const {viewState} = this.props;

        return (

            <div className="IndexContent">
                {this.showDialog()}
                <SimpleBar style={{maxHeight: '100%', overflowY: 'auto'}}>
                    {viewState === Views.DASHBOARD && <DashboardPage />}
                    {viewState === Views.MAIN && <Main/>}
                </SimpleBar>
                {viewState === Views.PRODUCTION && <Production/>}
                {viewState === Views.DATABASE && <DatabaseOverview></DatabaseOverview>}
                <div className="ingredients-wrapper">
                    {viewState === Views.INGREDIENTS && <IngredientsFormPage />}
                </div>
                {viewState === Views.SETTINGS && <SettingsPage />}
                <SimpleBar style={{maxHeight: '100%', overflowY: 'auto'}}>
                    {viewState === Views.FINISHED_BREWS && <FinishedBrewsTable></FinishedBrewsTable>}
                </SimpleBar>
                {viewState === Views.BREWING_CALCULATIONS && <BrewingCalculations />}
                {viewState === Views.VERSION && <VersionPage />}
            </div>

        );
    }
}

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
