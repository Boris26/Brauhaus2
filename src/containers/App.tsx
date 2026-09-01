import React, { Suspense, useEffect } from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Header from './MainView/Header/Header.connect';
import './App.css';
import Index from "./index.connect";
import {ProductionActions} from '../actions/actions';
import type {RootState} from '../reducers/rootReducer';
import {isHeaterStuckOnAlarmActive} from '../utils/brewingStatus/alarmDisplay';
import GlobalHeaterSafetyDialog from '../components/GlobalHeaterSafetyDialog/GlobalHeaterSafetyDialog';

const MobileProductionView = React.lazy(() => import('./Mobile/MobileStatusView/MobileProductionView.connect'));

const App: React.FC = () => {
    const isMobile = window.innerWidth < 768;
    const isDashboardRoute = window.location.pathname === '/dashboard';
    const dispatch = useDispatch();
    const production = useSelector((state: RootState) => state.productionReducer);
    const socketConnected = production.socketConnection.connected;
    const realtime = production.realtimeState;
    const alarms = socketConnected && realtime.alarmsReceived ? realtime.alarms : undefined;
    const heaterSafetyAlarmActive = isHeaterStuckOnAlarmActive(alarms);
    const currentTemperature = socketConnected ? realtime.temperatureSensor?.current : undefined;
    const heatingRunning = socketConnected ? realtime.heatingRunning : undefined;

    useEffect(() => {
        // Desktop owns the same central connection through Index. The mobile
        // shell bypasses Index, so keep that PWA shell subscribed as well.
        if (!isMobile || isDashboardRoute) return undefined;
        dispatch(ProductionActions.webSocketConnect());
        return () => { dispatch(ProductionActions.webSocketDisconnect()); };
    }, [dispatch, isDashboardRoute, isMobile]);

    const globalSafetyDialog = (
        <GlobalHeaterSafetyDialog
            open={heaterSafetyAlarmActive}
            temperature={currentTemperature}
            heatingRunning={heatingRunning}
        />
    );

    if (isMobile && !isDashboardRoute) {
        return (
            <div className="AppContainer">
                {globalSafetyDialog}
                <Suspense fallback={<div className="view-loading" role="status">Lade Ansicht…</div>}>
                    <MobileProductionView/>
                </Suspense>
            </div>
        );
    }

    return (
        <div className="AppContainer">
            {globalSafetyDialog}
            <div className="AppHeader">
                <Header></Header>
            </div>
            <div className="Index">
                <Index></Index>
            </div>
        </div>
    );
};

export default App;
