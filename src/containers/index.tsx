import React, {Suspense} from 'react';
import {Views} from '../enums/eViews';
import SimpleBar from "simplebar-react";
import {BrewingStatus} from "../model/brewingStatus.types";
import {getUiMode} from '../utils/uiMode';
import {CONTROLLER_HOME_VIEW, isViewAllowed} from '../utils/viewConfig';

const Main = React.lazy(() => import('./MainView/Main.connect'));
const Production = React.lazy(() => import('./Production/Production.connect'));
const DatabaseOverview = React.lazy(() => import('./DatabaseOverview/BeerForm.connect'));
const FinishedBrewsTable = React.lazy(() => import('./MainView/FinishBrewsBeers/FinishedBrewsTable.connect'));
const BrewingCalculations = React.lazy(() => import('./BrewingCalculations/BrewingCalculations'));
const IngredientsFormPage = React.lazy(() => import('./DatabaseOverview/IngredientsFormPage.connect'));
const SettingsPage = React.lazy(() => import('./Settings/SettingsPage.connect'));
const VersionPage = React.lazy(() => import('./Version/VersionPage'));
const DashboardPage = React.lazy(() => import('./Dashboard/DashboardPage.connect'));

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
        const mode = getUiMode();
        const activeView = isViewAllowed(viewState, mode) ? viewState : CONTROLLER_HOME_VIEW;

        return (

            <Suspense fallback={<div className="view-loading" role="status">Lade Ansicht…</div>}>
            <div className="IndexContent">
                <SimpleBar style={{maxHeight: '100%', overflowY: 'auto'}}>
                    {activeView === Views.DASHBOARD && <DashboardPage />}
                    {activeView === Views.MAIN && <Main/>}
                </SimpleBar>
                {activeView === Views.PRODUCTION && <Production/>}
                {activeView === Views.DATABASE && <DatabaseOverview></DatabaseOverview>}
                <div className="ingredients-wrapper">
                    {activeView === Views.INGREDIENTS && <IngredientsFormPage />}
                </div>
                {activeView === Views.SETTINGS && <SettingsPage />}
                {activeView === Views.FINISHED_BREWS && <FinishedBrewsTable />}
                {activeView === Views.BREWING_CALCULATIONS && <BrewingCalculations />}
                {activeView === Views.VERSION && <VersionPage />}
            </div>
            </Suspense>

        );
    }
}
