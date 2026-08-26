import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {Header} from './Header';
import {Views} from '../../../enums/eViews';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';

const brewingStatus = (activeAlarm: boolean): BrewingStatus => ({
    elapsedTime: 0, currentTime: 0, process: {state: ProcessState.ACTIVE},
    currentStep: {phase: ProcessPhase.RAST, mode: ProcessMode.HEATING}, temperature: {}, hardware: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}, error: {},
    alarms: activeAlarm ? [{type: AlarmType.EQUIPMENT_ALARM, active: true}] : []
});

describe('Header navigation', () => {
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
        const {rerender} = render(<Header {...props} brewingStatus={brewingStatus(false)} />);
        expect(screen.getByText('Aufheizen')).toBeInTheDocument();
        rerender(<Header {...props} brewingStatus={brewingStatus(true)} />);
        expect(screen.getByRole('alert')).toHaveTextContent('ANLAGENALARM – Anlage prüfen');
        expect(screen.queryByText('Aufheizen')).not.toBeInTheDocument();
        rerender(<Header {...props} brewingStatus={brewingStatus(false)} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Aufheizen')).toBeInTheDocument();
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

        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
        expect(screen.queryByText('Brauhaus herunterfahren?')).not.toBeInTheDocument();
    });

    it('warns explicitly when a brewing process is active', (): void => {
        render(
            <Header
                setViewState={jest.fn()}
                currentView={Views.PRODUCTION}
                removeAllMessages={jest.fn()}
                backendStatus={true}
                messages={[]}
                brewingStatus={brewingStatus(false)}
            />
        );

        fireEvent.click(screen.getByLabelText('Brauhaus herunterfahren'));
        expect(screen.getByText(/Ein Brauvorgang läuft gerade/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Herunterfahren'}));
        expect(screen.queryByText('Brauhaus herunterfahren?')).not.toBeInTheDocument();
    });
});
