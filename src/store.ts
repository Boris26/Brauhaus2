import { configureStore, Middleware, Dispatch } from '@reduxjs/toolkit';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { rootReducer } from './reducers/reducer';

// Middleware-Funktion, die die Aktion erneut ausführt
const repeatActionMiddleware: Middleware<any, any, Dispatch> = store => next => action => {
    const prevState = store.getState(); // Vorheriger Zustand
    next(action); // Aktion an den nächsten Middleware oder Reducer weiterleiten
    const nextState = store.getState(); // Aktueller Zustand nach der Aktion

    // Überprüfen, ob der Zustand identisch ist und die Aktion erneut ausführen
    if (prevState === nextState) {
        store.dispatch(action);
    }
};

// Erstellen Sie den Store mit der Middleware
const store = configureStore({
    reducer: rootReducer,
    middleware: [thunk as ThunkMiddleware<any, any>, repeatActionMiddleware]
});

export default store;
