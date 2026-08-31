import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {Header} from './Header';
import {Views} from '../../../enums/eViews';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {SystemRepository} from '../../../repositorys/SystemRepository';

jest.mock('../../../repositorys/SystemRepository');

const mockedShutdown = SystemRepository.shutdown as jest.MockedFunction<typeof SystemRepository.shutdown>;

const brewingStatus = (): BrewingStatus => ({
    elapsedTime: 0, process: {state: ProcessState.ACTIVE},
    currentStep: {phase: ProcessPhase.RAST, mode: ProcessMode.HEATING}, temperature: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
});

describe('Header navigation', () => {
    const healthyRealtime = {alarms: [], alarmsReceived: true, temperatureSensor: {current: 55.4, health: 'OK' as const, sensorId: '28-1'}};
    beforeEach(() => {
        jest.clearAllMocks();
        mockedShutdown.mockResolvedValue();
    });
    it('keeps existing settings navigation and adds version navigation', (): void => {
        const setViewState = jest.fn();
        render(
            <Header
                setViewState={setViewState}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={[]}
            />
        );

        fireEvent.click(screen.getByLabelText('Dashboard'));
        fireEvent.click(screen.getByLabelText('Einstellungen'));
        fireEvent.click(screen.getByLabelText('Version'));

        expect(setViewState).toHaveBeenCalledWith(Views.DASHBOARD);
        expect(setViewState).toHaveBeenCalledWith(Views.SETTINGS);
        expect(setViewState).toHaveBeenCalledWith(Views.VERSION);
    });

    it('renders status and navigation as separate compact layout areas without the brand title', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={['Lange Statusmeldung']}
            />
        );

        expect(screen.queryByRole('heading', {name: 'Brauhaus'})).not.toBeInTheDocument();
        expect(screen.getByTitle('Dashboard')).toBeInTheDocument();
        expect(screen.getByTitle('Dashboard').querySelector('svg')).toBeInTheDocument();
        expect(screen.getByTitle('Hauptansicht').parentElement).toHaveClass('icons-container');
        expect(screen.getByText(/Backend:/)).toBeInTheDocument();
    });

    it('prioritizes the equipment alarm and restores existing status messages after it ends', (): void => {
        const props = {setViewState: jest.fn(), currentView: Views.PRODUCTION, removeAllMessages: jest.fn(), backendStatus: true, messages: ['Aufheizen']};
        const inactiveRealtime = {alarms: [], alarmsReceived: true};
        const activeRealtime = {alarms: [{type: AlarmType.EQUIPMENT_ALARM, active: true}], alarmsReceived: true};
        const {rerender} = render(<Header {...props} brewingStatus={brewingStatus()} socketConnected={true} realtimeState={inactiveRealtime} />);
        expect(screen.getByText('Aufheizen')).toBeInTheDocument();
        rerender(<Header {...props} brewingStatus={brewingStatus()} socketConnected={true} realtimeState={activeRealtime} />);
        expect(screen.getByRole('alert')).toHaveTextContent('ANLAGENALARM – Anlage prüfen');
        expect(screen.queryByText('Aufheizen')).not.toBeInTheDocument();
        rerender(<Header {...props} brewingStatus={brewingStatus()} socketConnected={true} realtimeState={inactiveRealtime} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Aufheizen')).toBeInTheDocument();
    });

    it('shows translated sensor failures globally and removes the warning after recovery', () => {
        const props = {setViewState: jest.fn(), currentView: Views.SETTINGS, removeAllMessages: jest.fn(), backendStatus: true, messages: []};
        const {rerender} = render(<Header {...props} socketConnected={true} realtimeState={{...healthyRealtime, temperatureSensor: {current: null, health: 'MULTIPLE_SENSORS_FOUND', sensorId: null}}} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Mehrere Temperatursensoren erkannt');
        rerender(<Header {...props} socketConnected={true} realtimeState={healthyRealtime} />);
        expect(screen.queryByText(/Temperatursensor:/)).not.toBeInTheDocument();
    });

    it('asks for confirmation without performing a shutdown action', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.MAIN}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={[]}
            />
        );

        fireEvent.click(screen.getByLabelText('Brauhaus herunterfahren'));
        expect(screen.getByText('Brauhaus herunterfahren?')).toBeInTheDocument();
        expect(screen.getByText('Die Steuerung und der Raspberry Pi werden beendet.')).toBeInTheDocument();
        expect(mockedShutdown).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
        expect(screen.queryByText('Brauhaus herunterfahren?')).not.toBeInTheDocument();
        expect(mockedShutdown).not.toHaveBeenCalled();
    });

    it('warns explicitly when a brewing process is active', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.PRODUCTION}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={[]}
                brewingStatus={brewingStatus()}
            />
        );

        fireEvent.click(screen.getByLabelText('Brauhaus herunterfahren'));
        expect(screen.getByText(/Ein Brauvorgang läuft gerade/)).toBeInTheDocument();

    });

    it('sends one request, blocks duplicate confirmation, and shows the terminal state', async (): Promise<void> => {
        let resolveShutdown!: () => void;
        mockedShutdown.mockImplementationOnce(() => new Promise<void>(resolve => { resolveShutdown = resolve; }));
        render(
            <Header setViewState={jest.fn()} currentView={Views.MAIN} removeAllMessages={jest.fn()}
                backendStatus={true} messages={[]} />
        );

        fireEvent.click(screen.getByLabelText('Brauhaus herunterfahren'));
        const confirmButton = screen.getByRole('button', {name: 'Herunterfahren'});
        fireEvent.click(confirmButton);
        fireEvent.click(confirmButton);

        expect(mockedShutdown).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Herunterfahren wird gestartet …')).toBeInTheDocument();
        expect(confirmButton).toBeDisabled();

        resolveShutdown();
        await waitFor(() => expect(screen.getByText('Brauhaus wird heruntergefahren …')).toBeInTheDocument());
        expect(screen.queryByRole('button', {name: 'Herunterfahren'})).not.toBeInTheDocument();
        expect(screen.getByLabelText('Brauhaus herunterfahren')).toBeDisabled();
    });

    it('shows a useful error and makes shutdown available again after failure', async (): Promise<void> => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockedShutdown.mockRejectedValueOnce(new Error('offline'));
        render(
            <Header setViewState={jest.fn()} currentView={Views.MAIN} removeAllMessages={jest.fn()}
                backendStatus={true} messages={[]} />
        );

        fireEvent.click(screen.getByLabelText('Brauhaus herunterfahren'));
        fireEvent.click(screen.getByRole('button', {name: 'Herunterfahren'}));

        await waitFor(() => expect(screen.getByText('Das System konnte nicht heruntergefahren werden.')).toBeInTheDocument());
        expect(screen.getByRole('button', {name: 'Schließen'})).toBeEnabled();
        fireEvent.click(screen.getByRole('button', {name: 'Schließen'}));
        expect(screen.getByLabelText('Brauhaus herunterfahren')).toBeEnabled();
        expect(consoleError).toHaveBeenCalledWith('Herunterfahren des Brauhauses fehlgeschlagen', expect.any(Error));
        consoleError.mockRestore();
    });
});
