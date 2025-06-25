import { configureStore, Middleware, Dispatch } from '@reduxjs/toolkit';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import { rootReducer } from './reducers/reducer';
import { beerEpics } from './epics/beerEpics';

const epicMiddleware = createEpicMiddleware();

const rootEpic = combineEpics(...beerEpics);

// Erstellen Sie den Store mit der Middleware
const store = configureStore({
    reducer: rootReducer,
    middleware: [thunk as ThunkMiddleware<any, any>, epicMiddleware]
});

epicMiddleware.run(rootEpic);

export default store;
