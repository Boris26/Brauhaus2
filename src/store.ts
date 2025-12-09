import { configureStore, Middleware, Dispatch } from '@reduxjs/toolkit';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import { rootReducer } from './reducers/rootReducer';
import { beerEpics } from './epics/beerEpics';
import { productionEpics } from './epics/productionEpics';
import { hopsEpic} from "./epics/hopsEpic";
import { maltsEpic} from "./epics/maltsEpic";
import {yeastEpic} from "./epics/yeastEpic";

const epicMiddleware = createEpicMiddleware();

const rootEpic = combineEpics(...beerEpics, ...productionEpics, ...hopsEpic, ...maltsEpic, ...yeastEpic);

// Erstellen Sie den Store mit der Middleware
const store = configureStore({
    reducer: rootReducer,
    middleware: [thunk as ThunkMiddleware<any, any>, epicMiddleware]
});

epicMiddleware.run(rootEpic);

export default store;
