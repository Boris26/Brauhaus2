import React from 'react';
import Header from './MainView/Header/Header.connect';
import './App.css';
import Index from "./index.connect";
import MobileProductionView from './Mobile/MobileStatusView/MobileProductionView.connect';

const App: React.FC = () => {
    const isMobile = window.innerWidth < 768;
    const isDashboardRoute = window.location.pathname === '/dashboard';

    if (isMobile && !isDashboardRoute) {
        return (
            <div className="AppContainer">
                <MobileProductionView/>
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
