import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {MobileProductionView} from './MobileProductionView';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {rootReducer} from '../../../reducers/rootReducer';
import * as pushService from '../../../utils/pushService';

jest.mock('../MobileBrewingCalculationsView/MobileBrewingCalculationsView', () => () => <div>Berechnungen Mock</div>);

const makeStatus = (): BrewingStatus => ({
    elapsedTime: 23,
    currentTime: 1783885211,
    process: {state: ProcessState.ACTIVE},
    currentStep: {
        index: 1,
        count: 4,
        phase: ProcessPhase.MASHING_IN,
        mode: ProcessMode.HEATING,
        name: 'Einmaischen',
        duration: 120,
        elapsedTime: 23,
        remainingTime: 97,
    },
    temperature: {current: 24, target: 65},
    hardware: {heater: 'ON', agitator: 'OFF'},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {code: null, details: null},
});

const renderMobileView = (overrides: Partial<React.ComponentProps<typeof MobileProductionView>> = {}) => {
    const store = configureStore({reducer: rootReducer});
    const props = {
        temperature: 24,
        brewingStatus: makeStatus(),
        startPolling: jest.fn(),
        stopPolling: jest.fn(),
        isPollingRunning: false,
        ...overrides,
    };
    return {props, ...render(
        <Provider store={store}>
            <MobileProductionView {...props} />
        </Provider>
    )};
};

describe('MobileProductionView navigation', () => {
    beforeEach(() => {
        jest.spyOn(pushService, 'isPushSupported').mockReturnValue(false);
        jest.spyOn(pushService, 'getPermissionState').mockReturnValue('default');
        jest.spyOn(pushService.PushService, 'getSubscription').mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows settings as a mobile tab and opens the existing SettingsPage without requesting push permission', async () => {
        renderMobileView();

        expect(screen.getByRole('button', {name: 'Einstellungen'})).toBeInTheDocument();
        expect(screen.getByTestId('mobile-scroll-content')).toHaveClass('mobile-content');

        fireEvent.click(screen.getByRole('button', {name: 'Einstellungen'}));

        expect(await screen.findByRole('heading', {name: 'Einstellungen'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Push-Benachrichtigungen'})).toBeInTheDocument();
        expect(screen.getByText(/Browser unterstützt Push:/)).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Push-Benachrichtigungen aktivieren'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Testnachricht senden'})).toBeDisabled();
    });

    it('returns from settings to the mobile status page', () => {
        renderMobileView();

        fireEvent.click(screen.getByRole('button', {name: 'Einstellungen'}));
        fireEvent.click(screen.getByRole('button', {name: 'Status'}));

        expect(screen.queryByRole('heading', {name: 'Brauhaus Mobile'})).not.toBeInTheDocument();
    });
});


describe('MobileProductionView polling lifecycle', () => {
    it('starts polling when the mobile status page opens', () => {
        const startPolling = jest.fn();

        renderMobileView({startPolling});

        expect(startPolling).toHaveBeenCalledTimes(1);
    });

    it('does not start a second polling instance when polling is already running', () => {
        const startPolling = jest.fn();

        renderMobileView({startPolling, isPollingRunning: true});

        expect(startPolling).not.toHaveBeenCalled();
    });

    it('stops polling when the mobile status page unmounts', () => {
        const stopPolling = jest.fn();
        const {unmount} = renderMobileView({stopPolling});

        unmount();

        expect(stopPolling).toHaveBeenCalledTimes(1);
    });

    it('manual refresh dispatches exactly one START_POLLING request', () => {
        const startPolling = jest.fn();
        renderMobileView({startPolling});
        startPolling.mockClear();

        fireEvent.click(screen.getByRole('button', {name: 'Aktualisieren'}));

        expect(startPolling).toHaveBeenCalledTimes(1);
    });
});
