import React from 'react';
import {render, screen} from '@testing-library/react';
import {Index} from './index';
import {Views} from '../enums/eViews';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';

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
    alarms: [],
    ...overrides,
});

const renderIndex = (brewingStatus: BrewingStatus, viewState = Views.VERSION) => {
    const result = render(
        <Index
            viewState={viewState}
            brewingStatus={brewingStatus}
            checkIsBackenAvailable={jest.fn()}
            webSocketConnect={jest.fn()}
        />
    );
    return result;
};

describe('Index view routing', () => {
    it('points the dashboard view to the dashboard page', (): void => {
        renderIndex(makeStatus({process: {state: ProcessState.IDLE}, currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}}), Views.DASHBOARD);

        expect(screen.getByRole('heading', {name: 'Dashboard'})).toBeInTheDocument();
    });

    it('points the version view to the version page', (): void => {
        renderIndex(makeStatus({process: {state: ProcessState.IDLE}, currentStep: {phase: ProcessPhase.NONE, mode: ProcessMode.NONE}, waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}}));

        expect(screen.getByRole('heading', {name: 'Version'})).toBeInTheDocument();
    });
});

describe('Index waiting confirmation dialog', () => {
    it('does not render the removed global waiting modal', () => {
        renderIndex(makeStatus());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
