import React from 'react';
import Header from './MainView/Header/Header';
import './App.css';
import Index from "./index";
import MobileProductionView from './Mobile/MobileStatusView/MobileProductionView';

const App: React.FC = () => {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
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
