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

const renderMobileView = () => {
    const store = configureStore({reducer: rootReducer});
    return render(
        <Provider store={store}>
            <MobileProductionView
                temperature={24}
                brewingStatus={makeStatus()}
                startPolling={jest.fn()}
                isPollingRunning={false}
            />
        </Provider>
    );
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

        expect(screen.getByRole('heading', {name: 'Brauhaus Mobile'})).toBeInTheDocument();
    });
});
