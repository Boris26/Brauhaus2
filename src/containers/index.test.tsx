import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Index} from './index';
import {Views} from '../enums/eViews';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ConfirmStates} from '../enums/eConfirmStates';

jest.mock('./Dashboard/DashboardPage.connect', () => () => <div><h1>Dashboard</h1></div>);

const makeStatus = (overrides: Partial<BrewingStatus> = {}): BrewingStatus => ({
    elapsedTime: 23,
    currentTime: 1783885211,
    process: {state: ProcessState.ACTIVE},
    currentStep: {
        index: 6,
        count: 7,
        phase: ProcessPhase.MASHING_OUT,
        mode: ProcessMode.WAITING,
        name: 'Abmaischen',
        duration: 0,
        elapsedTime: 23,
        remainingTime: 0
    },
    temperature: {current: 24, target: 78},
    hardware: {heater: 'ON', agitator: 'OFF'},
    waiting: {waitingFor: WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm: true},
    error: {code: null, details: null},
    ...overrides,
});

const renderIndex = (brewingStatus: BrewingStatus, confirm = jest.fn(), viewState = Views.VERSION) => {
    const result = render(
        <Index
            viewState={viewState}
            brewingStatus={brewingStatus}
            confirm={confirm}
            checkIsBackenAvailable={jest.fn()}
            webSocketConnect={jest.fn()}
        />
    );
    return {confirm, ...result};
};

describe('Index view routing', () => {
    it('points the dashboard view to the dashboard page', (): void => {
        renderIndex(makeStatus({process: {state: ProcessState.IDLE}, currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}}), jest.fn(), Views.DASHBOARD);

        expect(screen.getByRole('heading', {name: 'Dashboard'})).toBeInTheDocument();
    });

    it('points the version view to the version page', (): void => {
        renderIndex(makeStatus({process: {state: ProcessState.IDLE}, currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}}));

        expect(screen.getByRole('heading', {name: 'Version'})).toBeInTheDocument();
    });
});

describe('Index waiting confirmation dialog', () => {
    it('shows the Abmaischen dialog for MASHING_OUT_CONFIRMATION when the active step is waiting and confirmable', () => {
        renderIndex(makeStatus());

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Abmaischen und Nachguss abgeschlossen?')).toBeInTheDocument();
    });

    it('sends exactly one Mashup confirmation when the Abmaischen dialog is confirmed', () => {
        const {confirm} = renderIndex(makeStatus());

        fireEvent.click(screen.getByRole('button', {name: 'Ok'}));

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(confirm).toHaveBeenCalledWith(ConfirmStates.MASHUP);
    });

    it('does not show a dialog when canConfirm is false', () => {
        renderIndex(makeStatus({waiting: {waitingFor: WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm: false}}));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not show a dialog when the current step is not WAITING', () => {
        renderIndex(makeStatus({currentStep: {...makeStatus().currentStep, mode: ProcessMode.HEATING}}));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not show or send a false confirmation for unknown waitingFor values', () => {
        const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const {confirm} = renderIndex(makeStatus({waiting: {waitingFor: 'UNKNOWN_CONFIRMATION', canConfirm: true}}));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(confirm).not.toHaveBeenCalled();
        expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_CONFIRMATION'));
        consoleWarn.mockRestore();
    });

    it('shows the dialog when the initially loaded status is already waiting', () => {
        renderIndex(makeStatus());

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('keeps a single dialog instance when the same waiting status is received repeatedly through polling', () => {
        const status = makeStatus();
        const {rerender} = renderIndex(status);

        rerender(<Index viewState={Views.VERSION} brewingStatus={{...status}} confirm={jest.fn()} checkIsBackenAvailable={jest.fn()} webSocketConnect={jest.fn()} />);

        expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });

    it('closes the dialog after the waiting state disappears after successful confirmation', () => {
        const {rerender} = renderIndex(makeStatus());

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        rerender(<Index viewState={Views.VERSION} brewingStatus={makeStatus({currentStep: {...makeStatus().currentStep, mode: ProcessMode.HEATING}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}})} confirm={jest.fn()} checkIsBackenAvailable={jest.fn()} webSocketConnect={jest.fn()} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
