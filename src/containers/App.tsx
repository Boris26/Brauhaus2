import React from 'react';
import Header from './MainView/Header/Header';
import './App.css';
import Index from "./index";


const App: React.FC = () => {
    return (
        <div className="container">
            <div className="Header">
                <Header></Header>
            </div>
            <div className="Index">
                <Index></Index>
            </div>
        </div>


    );
};

export default App;
