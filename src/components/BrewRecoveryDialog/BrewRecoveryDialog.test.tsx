import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {rootReducer, initialBeerState, initialProductionState} from '../../reducers/rootReducer';
import BrewRecoveryDialog from './BrewRecoveryDialog';
import {ProductionActions} from '../../actions/actions';

const renderDialog = () => {
    const baseState = rootReducer(undefined, {type: '@@INIT'} as any);
    const store = configureStore({reducer: rootReducer, preloadedState: {
        ...baseState,
        beerDataReducer: {...initialBeerState, beers: [{id: 'beer-1', name: 'Testbier'} as any]},
        productionReducer: {...initialProductionState, brewRecovery: {
            available: true, resumePending: false, discardPending: false,
            recovery: {
                version: 1,
                brewSession: {beerId: 'beer-1', plannedVolume: 25, plannedBrewhouseEfficiency: 70},
                status: {currentStep: {name: 'Maltoserast', duration: 1200, elapsedTime: 720, remainingTime: 480}},
                updatedAt: '2026-01-01T12:00:00Z',
            },
        }},
    } as any});
    const dispatch = jest.spyOn(store, 'dispatch');
    render(<Provider store={store}><BrewRecoveryDialog/></Provider>);
    return dispatch;
};

it('shows the saved snapshot and exposes explicit resume/discard commands', () => {
    const dispatch = renderDialog();
    expect(screen.getByRole('dialog', {name: 'Unterbrochener Brauvorgang gefunden'})).toHaveTextContent('Testbier');
    expect(screen.getByText(/12 von 20 Minuten abgeschlossen/)).toBeInTheDocument();
    expect(screen.getByText(/8 Minuten verbleibend/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Fortsetzen'}));
    expect(dispatch).toHaveBeenCalledWith(ProductionActions.resumeBrewRecovery());
});

it('dispatches discard without silently dismissing the dialog', () => {
    const dispatch = renderDialog();
    fireEvent.click(screen.getByRole('button', {name: 'Verwerfen'}));
    expect(dispatch).toHaveBeenCalledWith(ProductionActions.discardBrewRecovery());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});
