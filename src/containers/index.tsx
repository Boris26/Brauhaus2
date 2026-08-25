import React from 'react';
import {Views} from '../enums/eViews';
import Main from "./MainView/Main.connect";
import Production from "./Production/Production.connect";
import DatabaseOverview from "./DatabaseOverview/BeerForm.connect";
import SimpleBar from "simplebar-react";
import {BrewingStatus} from "../model/brewingStatus.types";
import FinishedBrewsTable from "./MainView/FinishBrewsBeers/FinishedBrewsTable.connect";
import BrewingCalculations from "./BrewingCalculations/BrewingCalculations";
import IngredientsFormPage from "./DatabaseOverview/IngredientsFormPage.connect";
import SettingsPage from "./Settings/SettingsPage.connect";
import VersionPage from "./Version/VersionPage";
import DashboardPage from "./Dashboard/DashboardPage.connect";

interface indexMainProps {
    viewState: Views;
    brewingStatus: BrewingStatus;
    checkIsBackenAvailable : () => void;
    webSocketConnect: () => void;
}

export class Index extends React.Component<indexMainProps> {
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

    render() {
        const {viewState} = this.props;

        return (

            <div className="IndexContent">
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
