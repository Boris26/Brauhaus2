import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {rootReducer, initialBeerState, initialProductionState} from '../../reducers/rootReducer';
import BrewRecoveryDialog from './BrewRecoveryDialog';
import {ProductionActions} from '../../actions/actions';

const renderDialog = (recoveryOverrides: Record<string, unknown> = {}) => {
    const baseState = rootReducer(undefined, {type: '@@INIT'} as any);
    const store = configureStore({reducer: rootReducer, preloadedState: {
        ...baseState,
        beerDataReducer: {...initialBeerState, beers: [{id: 'beer-1', name: 'Testbier'} as any]},
        productionReducer: {...initialProductionState, brewRecovery: {
            available: true, resumePending: false, discardPending: false, requestGeneration: 0,
            recovery: {
                version: 1,
                brewSession: {beerId: 'beer-1', plannedVolume: 25, plannedBrewhouseEfficiency: 70},
                status: {currentStep: {name: 'Maltoserast', duration: 1200, elapsedTime: 720, remainingTime: 480}},
                updatedAt: '2026-01-01T12:00:00Z',
            },
            ...recoveryOverrides,
        }},
    } as any});
    const dispatch = jest.spyOn(store, 'dispatch');
    render(<Provider store={store}><BrewRecoveryDialog/></Provider>);
    return dispatch;
};

it('stays hidden without an available recovery snapshot', () => {
    renderDialog({available: false, recovery: null});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shows the saved snapshot and exposes explicit resume/discard commands', () => {
    const dispatch = renderDialog();
    expect(screen.getByRole('dialog', {name: 'Unterbrochener Brauvorgang gefunden'})).toHaveTextContent('Testbier');
    expect(screen.getByText('Maltoserast')).toBeInTheDocument();
    expect(screen.getByText(/12 \/ 20 Minuten/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', {name: '60 Prozent abgeschlossen'})).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByText(/Noch etwa 8 Minuten/)).toBeInTheDocument();
    expect(screen.getByText(/01\.01\.2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang fortsetzen'}));
    expect(dispatch).toHaveBeenCalledWith(ProductionActions.resumeBrewRecovery());
});

it('disables both actions and shows the resume pending text', () => {
    renderDialog({resumePending: true});
    expect(screen.getByRole('button', {name: 'Brauvorgang wird wiederhergestellt …'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Brauvorgang verwerfen'})).toBeDisabled();
});

it('disables confirmation actions and shows the discard pending text', () => {
    const dispatch = renderDialog();
    fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang verwerfen'}));
    fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang verwerfen'}));
    expect(dispatch).toHaveBeenCalledWith(ProductionActions.discardBrewRecovery());
    expect(screen.getByRole('button', {name: 'Brauvorgang wird verworfen …'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Abbrechen'})).toBeDisabled();
});

it('confirms discard before dispatching without silently dismissing the dialog', () => {
    const dispatch = renderDialog();
    fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang verwerfen'}));
    expect(screen.getByRole('dialog', {name: 'Brauvorgang wirklich verwerfen?'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang verwerfen'}));
    expect(dispatch).toHaveBeenCalledWith(ProductionActions.discardBrewRecovery());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});
