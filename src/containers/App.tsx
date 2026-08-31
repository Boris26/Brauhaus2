import React, { Suspense, useEffect } from 'react';
import {useDispatch} from 'react-redux';
import Header from './MainView/Header/Header.connect';
import './App.css';
import Index from "./index.connect";
import {ProductionActions} from '../actions/actions';

const MobileProductionView = React.lazy(() => import('./Mobile/MobileStatusView/MobileProductionView.connect'));

const App: React.FC = () => {
    const isMobile = window.innerWidth < 768;
    const isDashboardRoute = window.location.pathname === '/dashboard';
    const dispatch = useDispatch();

    useEffect(() => {
        // Desktop owns the same central connection through Index. The mobile
        // shell bypasses Index, so keep that PWA shell subscribed as well.
        if (!isMobile || isDashboardRoute) return undefined;
        dispatch(ProductionActions.webSocketConnect());
        return () => { dispatch(ProductionActions.webSocketDisconnect()); };
    }, [dispatch, isDashboardRoute, isMobile]);

    if (isMobile && !isDashboardRoute) {
        return (
            <div className="AppContainer">
                <Suspense fallback={<div className="view-loading" role="status">Lade Ansicht…</div>}>
                    <MobileProductionView/>
                </Suspense>
            </div>
        );
    }

    return (
        <div className="AppContainer">
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
