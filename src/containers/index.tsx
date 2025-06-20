import React from 'react';
import {connect} from "react-redux";
import {Views} from '../enums/eViews';
import Main from "./MainView/Main";
import Production from "./Production/Production";
import DatabaseOverview from "./DatabaseOverview/BeerForm";
import SimpleBar from "simplebar-react";
import ModalDialog, {DialogType} from "../components/ModalDialog/ModalDialog";
import {BrewingStatus} from "../model/BrewingStatus";
import {BeerActions, ProductionActions} from "../actions/actions";
import {ConfirmStates} from "../enums/eConfirmStates";
import {TextMapper} from "../utils/TextMapper";
import {FinishedBrew} from "../model/FinishedBrew";
import FinishedBrewsTable from "./MainView/FinishBrewsBeers/FinishedBrewsTable";
import BrewingCalculations from "./BrewingCalculations/BrewingCalculations";
import IngredientsFormPage from "./DatabaseOverview/IngredientsFormPage";

interface indexMainProps {
    viewState: Views;
    brewingStatus: BrewingStatus;
    confirm: (confirmState: ConfirmStates) => void;
}

class Index extends React.Component<indexMainProps> {
    constructor(props: indexMainProps) {
        super(props);
    }

    componentDidUpdate(prevProps: Readonly<indexMainProps>, prevState: Readonly<{}>, snapshot?: any) {
        const {brewingStatus} = this.props;

        if (brewingStatus?.HeatUpStatus !== prevProps?.brewingStatus?.HeatUpStatus) {
            console.log("HeatUpStatus has changed");
        }
    }

    confirmDialog = (content: string) => {
        const {confirm} = this.props
        switch (content) {
            case 'Einmaischen, bitte abschliessen' : {
                confirm(ConfirmStates.MASHUP);
                break;
            }
            case 'Bitte Jod Test durchführen!' : {
                confirm(ConfirmStates.IODINE);
                break;
            }
            case 'Kann der Koch Prozess gestartet werden?' : {
                confirm(ConfirmStates.COOKING);
                break;
            }
            case 'Bitte Bestätigen wenn Wasser Kocht!' : {
                confirm(ConfirmStates.BOILING);
                break;
            }
        }

    }

    showDialog() {
        const {brewingStatus} = this.props;
        const message = TextMapper.mapToText(brewingStatus?.StatusText);
        return (
            <div>
                <ModalDialog
                    type={DialogType.CONFIRM}
                    open={brewingStatus?.WaitingStatus}
                    content={message}
                    header={"Confirm"}
                    onConfirm={this.confirmDialog}
                />
            </div>
        );
    }


    render() {
        const {viewState} = this.props;

        return (

            <div>
                {this.showDialog()}
                <SimpleBar style={{maxHeight: '100%', overflowY: 'auto'}}>
                    {viewState === Views.MAIN && <Main/>}
                </SimpleBar>
                {viewState === Views.PRODUCTION && <Production/>}
                {viewState === Views.DATABASE && <DatabaseOverview></DatabaseOverview>}
                {viewState === Views.INGREDIENTS && <IngredientsFormPage></IngredientsFormPage>}
                <SimpleBar style={{maxHeight: '100%', overflowY: 'auto'}}>
                    {viewState === Views.FINISHED_BREWS && <FinishedBrewsTable></FinishedBrewsTable>}
                </SimpleBar>
                {viewState === Views.BREWING_CALCULATIONS && <BrewingCalculations />}
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
    }

})


export default connect(mapStateToProps, mapDispatchToProps)(Index);
