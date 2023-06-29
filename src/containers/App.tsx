import React from 'react';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import Header from './MainView/Header/Header';


import './App.css';
import Production from "./Production/Production";
import Index from "./index";





const App: React.FC = () => {




    return (
        <div className="container">

            <div className="Header">
                  <Header></Header>
            </div>
           <div>
               <Index></Index>
          </div>
        </div>



    );
};

export default App;
