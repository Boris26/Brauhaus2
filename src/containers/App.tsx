import React, { Suspense } from 'react';
import {useSelector} from 'react-redux';
import Header from './MainView/Header/Header.connect';
import './App.css';
import Index from "./index.connect";
import type {RootState} from '../reducers/rootReducer';
import {isHeaterStuckOnAlarmActive} from '../utils/brewingStatus/alarmDisplay';
import GlobalHeaterSafetyDialog, {GlobalHeaterSafetyDialogOwnedContext} from '../components/GlobalHeaterSafetyDialog/GlobalHeaterSafetyDialog';
import BrewRecoveryDialog from '../components/BrewRecoveryDialog/BrewRecoveryDialog';

const MobileProductionView = React.lazy(() => import('./Mobile/MobileStatusView/MobileProductionView.connect'));

const App: React.FC = () => {
    const isMobile = window.innerWidth < 768;
    const isDashboardRoute = window.location.pathname === '/dashboard';
    const production = useSelector((state: RootState) => state.productionReducer);
    const socketConnected = production.socketConnection.connected;
    const realtime = production.realtimeState;
    // HEATER_STUCK_ON is latched controller state. Once received as active,
    // keep the global warning visible across a temporary socket disconnect
    // until a later controller snapshot explicitly clears it.
    const alarms = realtime.alarmsReceived ? realtime.alarms : undefined;
    const heaterSafetyAlarmActive = isHeaterStuckOnAlarmActive(alarms);
    const currentTemperature = socketConnected ? realtime.temperatureSensor?.current : undefined;
    const heatingRunning = socketConnected ? realtime.heatingRunning : undefined;

    const globalSafetyDialog = (
        <GlobalHeaterSafetyDialog
            open={heaterSafetyAlarmActive}
            temperature={currentTemperature}
            heatingRunning={heatingRunning}
        />
    );
    const brewRecoveryDialog = <BrewRecoveryDialog/>;

    const appContent = isMobile && !isDashboardRoute ? (
        <div className="AppContainer">
            {globalSafetyDialog}
            {brewRecoveryDialog}
            <Suspense fallback={<div className="view-loading" role="status">Lade Ansicht…</div>}>
                <MobileProductionView/>
            </Suspense>
        </div>
    ) : (
        <div className="AppContainer">
            {globalSafetyDialog}
            {brewRecoveryDialog}
            <div className="AppHeader">
                <Header></Header>
            </div>
            <div className="Index">
                <Index></Index>
            </div>
        </div>
    );

    return (
        <GlobalHeaterSafetyDialogOwnedContext.Provider value={true}>
            {appContent}
        </GlobalHeaterSafetyDialogOwnedContext.Provider>
    );
};

export default App;
