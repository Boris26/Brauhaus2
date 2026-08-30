import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {MobileProductionView} from './MobileProductionView';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {rootReducer} from '../../../reducers/rootReducer';
import * as pushService from '../../../utils/pushService';
import {ConfirmStates} from '../../../enums/eConfirmStates';

jest.mock('../MobileBrewingCalculationsView/MobileBrewingCalculationsView', () => () => <div>Berechnungen Mock</div>);

const makeStatus = (): BrewingStatus => ({
    elapsedTime: 23,
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
        isConfirmPending: false,
        isBrewingStatusStale: false,
        isPollingRunning: false,
        confirm: jest.fn(),
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

describe('MobileProductionView confirmations', () => {
    it('confirms a valid waiting state through the shared mapping and prevents repeated clicks', () => {
        const status = makeStatus();
        status.currentStep.mode = ProcessMode.WAITING;
        status.waiting = {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true};
        const confirm = jest.fn();
        const {props, rerender} = renderMobileView({brewingStatus: status, confirm});

        fireEvent.click(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'}));
        expect(confirm).toHaveBeenCalledWith(ConfirmStates.IODINE);
        rerender(
            <Provider store={configureStore({reducer: rootReducer})}>
                <MobileProductionView {...props} brewingStatus={status} confirm={confirm} isConfirmPending={true} />
            </Provider>
        );
        expect(screen.getByRole('button', {name: 'Wird verarbeitet …'})).toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: 'Wird verarbeitet …'}));
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(screen.getByText('24 °C')).toBeInTheDocument();
        expect(screen.getByText('65 °C')).toBeInTheDocument();
    });

    it('allows retry with the same waiting state after pending is cleared', () => {
        const status = makeStatus();
        status.currentStep.mode = ProcessMode.WAITING;
        status.waiting = {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true};
        const confirm = jest.fn();
        const {props, rerender} = renderMobileView({brewingStatus: status, confirm, isConfirmPending: true});

        expect(screen.getByRole('button', {name: 'Wird verarbeitet …'})).toBeDisabled();
        rerender(
            <Provider store={configureStore({reducer: rootReducer})}>
                <MobileProductionView {...props} brewingStatus={status} confirm={confirm} isConfirmPending={false} />
            </Provider>
        );
        fireEvent.click(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'}));
        expect(confirm).toHaveBeenCalledWith(ConfirmStates.IODINE);
    });

    it('shows a confirm failure while keeping retry available', () => {
        const status = makeStatus();
        status.currentStep.mode = ProcessMode.WAITING;
        status.waiting = {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true};
        renderMobileView({brewingStatus: status, isConfirmPending: false, confirmError: 'Netzwerkfehler'});

        expect(screen.getByRole('alert')).toHaveTextContent('Bestätigung fehlgeschlagen: Netzwerkfehler');
        expect(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'})).toBeEnabled();
    });

    it('confirms the decoction return through DecoctionReturned', () => {
        const status = makeStatus();
        status.currentStep = {phase: ProcessPhase.DECOCTION, mode: ProcessMode.WAITING};
        status.waiting = {waitingFor: WaitingFor.DECOCTION_RETURN_CONFIRMATION, canConfirm: true};
        const confirm = jest.fn();
        renderMobileView({brewingStatus: status, confirm});

        fireEvent.click(screen.getByRole('button', {name: 'Abgeschlossen'}));
        expect(confirm).toHaveBeenCalledWith(ConfirmStates.DECOCTION_RETURNED);
    });
});

describe('MobileProductionView stale status', () => {
    it('does not present stale hardware and temperature values as current', () => {
        renderMobileView({isBrewingStatusStale: true});
        expect(screen.getByText('Status veraltet – Controller nicht erreichbar')).toBeInTheDocument();
        expect(screen.getByText('Unbekannt')).toBeInTheDocument();
        expect(screen.queryByText('24 °C')).not.toBeInTheDocument();
    });
});

describe('MobileProductionView heater status', () => {
    it('shows heater permission separately from the physical heater state', () => {
        const status = makeStatus();
        status.heating = {followsDecoction: true, heaterEnabled: true};

        renderMobileView({brewingStatus: status, socketConnected: true, realtimeState: {heatingRunning: false, alarms: [], alarmsReceived: true}});

        expect(screen.getByText('Heizung bereit')).toBeInTheDocument();
        expect(screen.queryByText('Heizung aktiv')).not.toBeInTheDocument();
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
