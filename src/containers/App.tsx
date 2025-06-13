import React from 'react';
import Header from './MainView/Header/Header';
import './App.css';
import Index from "./index";
import MobileProductionView from './Mobile/MobileProductionView';
import { useSelector } from 'react-redux';

const App: React.FC = () => {
    // Mobile-Erkennung (z.B. unter 768px Breite)
    const isMobile = window.innerWidth < 768;
    // brewingStatus und temperature aus productionReducer holen

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
