import React from 'react';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import Header from './MainView/Header/Header';
import CustomTable from './MainView/Table/Table';
import Details from "./MainView/Details/Details";


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
