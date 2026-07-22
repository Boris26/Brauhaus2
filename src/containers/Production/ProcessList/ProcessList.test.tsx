import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {Beer} from '../../../model/Beer';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../../model/brewingStatus.types';
import {createProcessSteps, getActiveProcessStepIndex, ProcessList} from './ProcessList';

const selectedBeer = {
    id: 'beer-1',
    name: 'Testbier',
    type: 'Ale',
    color: 'gold',
    alcohol: 5,
    originalwort: 12,
    bitterness: 20,
    description: '',
    rating: 0,
    mashVolume: 20,
    spargeVolume: 10,
    cookingTime: 60,
    cookingTemperatur: 100,
    fermentation: [
        {type: 'Einmaischen', temperature: 57},
        {type: 'Rast 1', temperature: 63, time: 900},
        {type: 'Rast 2', temperature: 68, time: 900},
        {type: 'Rast 3', temperature: 72, time: 900},
        {type: 'Abmaischen', temperature: 78},
    ],
    malts: [],
    wortBoiling: {totalTime: 60, hops: []},
    fermentationMaturation: {fermentationTemperature: 20, carbonation: 5, yeast: []},
} as Beer;

const getActiveStepText = (controlStepIndex: number) => {
    const {container} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={controlStepIndex} />);
    return container.querySelector('li.active')?.textContent;
};

describe('ProcessList current-step mapping', () => {
    it('builds visible process rows with shared control indices for heating and process entries', () => {
        expect(createProcessSteps(selectedBeer).map(step => `${step.controlStepIndex ?? '-'}:${step.name}`)).toEqual([
            '1:Aufheizen für Einmaischen',
            '1:Einmaischen',
            '2:Aufheizen für Rast 1',
            '2:Rast 1',
            '3:Aufheizen für Rast 2',
            '3:Rast 2',
            '4:Aufheizen für Rast 3',
            '4:Rast 3',
            '-:Jod Probe',
            '5:Aufheizen für Abmaischen',
            '5:Abmaischen',
            '6:Aufheizen auf Kochen',
            '6:Kochen',
        ]);
    });

    it.each([
        [1, 'Einmaischen'],
        [2, 'Rast 1'],
        [3, 'Rast 2'],
        [4, 'Rast 3'],
    ])('marks control step %i as %s', (controlStepIndex, expectedStep) => {
        expect(getActiveStepText(controlStepIndex)).toContain(expectedStep);
    });

    it('uses currentStep.mode to choose between heating and execution rows for the same control index', () => {
        const steps = createProcessSteps(selectedBeer);

        expect(steps[getActiveProcessStepIndex(steps, 1, {index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.HEATING})].name).toBe('Aufheizen für Einmaischen');
        expect(steps[getActiveProcessStepIndex(steps, 1, {index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.TIMER_RUNNING})].name).toBe('Einmaischen');
        expect(steps[getActiveProcessStepIndex(steps, 2, {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING})].name).toBe('Aufheizen für Rast 1');
        expect(steps[getActiveProcessStepIndex(steps, 2, {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING})].name).toBe('Rast 1');
    });

    it('does not treat the 1-based control index as the 0-based React array index', () => {
        const steps = createProcessSteps(selectedBeer);

        expect(getActiveProcessStepIndex(steps, 4)).toBe(7);
        expect(steps[4].name).not.toBe('Rast 3');
    });

    it('updates the active marker when the reported control step changes', () => {
        const {container, rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={2} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 1');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={2} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 1');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 2');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 2');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={4} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 3');
        expect(container.querySelector('li.active')).not.toHaveTextContent('Rast 2');
    });



    it('keeps the first MASHING_IN heating status on the heat-up row', () => {
        const {container} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={1} currentStep={{index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.HEATING, name: 'Einmaischen'}} />);

        expect(container.querySelectorAll('li.active')).toHaveLength(1);
        expect(container.querySelector('li.active')).toHaveTextContent('Aufheizen für Einmaischen');
        expect(container.querySelector('li.active')).not.toHaveTextContent(/^2\. Einmaischen$/);
    });

    it('moves from a rest heat-up row to the rest row when only mode changes', () => {
        const {container, rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={4} currentStep={{index: 4, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING, name: 'Rast 3'}} />);
        expect(container.querySelectorAll('li.active')).toHaveLength(1);
        expect(container.querySelector('li.active')).toHaveTextContent('Aufheizen für Rast 3');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={4} currentStep={{index: 4, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 3'}} />);
        expect(container.querySelectorAll('li.active')).toHaveLength(1);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 3');
        expect(container.querySelector('li.active')).not.toHaveTextContent('Aufheizen');
    });

    it('follows rest execution, next rest heating, and next rest timer-running statuses', () => {
        const {container, rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 2'}} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 2');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={4} currentStep={{index: 4, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING, name: 'Rast 3'}} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Aufheizen für Rast 3');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={4} currentStep={{index: 4, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Rast 3'}} />);
        expect(container.querySelectorAll('li.active')).toHaveLength(1);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 3');
    });

    it('renders all expected rows', () => {
        render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={1} />);

        expect(screen.getAllByText(/Einmaischen/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 1/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 2/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 3/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Abmaischen/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kochen/).length).toBeGreaterThan(0);
    });
});

describe('ProcessList compact production overview', () => {
    const activeStatus = (index: number, mode: ProcessMode = ProcessMode.TIMER_RUNNING, remainingTime = 1176): BrewingStatus => ({
        elapsedTime: 0,
        currentTime: 0,
        process: {state: ProcessState.ACTIVE},
        currentStep: {
            index,
            count: 6,
            phase: index === 6 ? ProcessPhase.COOKING : ProcessPhase.RAST,
            mode,
            name: 'Rast 2',
            duration: 1800,
            elapsedTime: 624,
            remainingTime
        },
        temperature: {target: 68},
        hardware: {},
        waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
        error: {}
    });

    it('shows current visible step position and total visible steps', () => {
        render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={activeStatus(3)} remainingSeconds={1176} />);

        expect(screen.getByText('6 / 13')).toBeInTheDocument();
    });

    it('shows all remaining process steps in order with details', () => {
        const {container} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={activeStatus(3)} remainingSeconds={1176} />);
        const names = Array.from(container.querySelectorAll('.upcoming-step-name')).map(node => node.textContent);

        expect(names).toEqual([
            'Aufheizen für Rast 3',
            'Rast 3',
            'Jod Probe',
            'Aufheizen für Abmaischen',
            'Abmaischen',
            'Aufheizen auf Kochen',
            'Kochen'
        ]);
        expect(screen.getAllByText(/72 °C/).length).toBeGreaterThan(0);
        expect(screen.getByText('Bestätigung erforderlich')).toBeInTheDocument();
        expect(screen.getByText('100 °C · 60 min')).toBeInTheDocument();
    });

    it('renders the remaining time as a single countdown value', () => {
        render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={activeStatus(3)} remainingSeconds={1176} />);

        expect(screen.getByText('Restzeit 00:19:36')).toBeInTheDocument();
        expect(screen.queryByText('Laufzeit')).not.toBeInTheDocument();
        expect(screen.queryByText('Zielzeit')).not.toBeInTheDocument();
    });

    it('does not invent countdowns for waiting or durationless steps', () => {
        const waitingStatus = activeStatus(3, ProcessMode.WAITING);
        waitingStatus.waiting = {waitingFor: WaitingFor.IODINE_TEST, canConfirm: true};
        const {rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.WAITING}} brewingStatus={waitingStatus} remainingSeconds={1176} />);
        expect(screen.getByText('Wartet auf Bestätigung')).toBeInTheDocument();

        const durationlessStatus = activeStatus(3, ProcessMode.HEATING);
        durationlessStatus.currentStep.duration = 0;
        durationlessStatus.waiting = {waitingFor: WaitingFor.NONE, canConfirm: false};
        rerender(<ProcessList selectedBeer={selectedBeer} currentStepIndex={3} currentStep={{index: 3, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING}} brewingStatus={durationlessStatus} />);
        expect(screen.getByText('Keine feste Dauer')).toBeInTheDocument();
    });

    it('handles missing optional temperature and duration values without placeholders', () => {
        const beerWithoutOptionalValues = {...selectedBeer, cookingTemperatur: 0, cookingTime: 0, fermentation: [{type: 'Einmaischen', temperature: 0}, {type: 'Rast 1', temperature: 0}, {type: 'Abmaischen', temperature: 0}]} as Beer;
        render(<ProcessList selectedBeer={beerWithoutOptionalValues} currentStepIndex={2} currentStep={{index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={activeStatus(2)} />);

        expect(screen.queryByText(/0 °C/)).not.toBeInTheDocument();
        expect(screen.queryByText(/0 min/)).not.toBeInTheDocument();
    });

    it('shows the finished state without additional steps', () => {
        const finishedStatus = activeStatus(6);
        finishedStatus.process.state = ProcessState.FINISHED;
        render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={6} currentStep={{index: 6, phase: ProcessPhase.COOKING, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={finishedStatus} remainingSeconds={0} />);

        expect(screen.getByText('Restzeit 00:00:00')).toBeInTheDocument();
        expect(screen.getByText('Keine weiteren Schritte.')).toBeInTheDocument();
    });

    it('shows the selected beer process before an active brewing process starts', () => {
        render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={0} />);

        expect(screen.getByText('Noch kein Brauvorgang gestartet')).toBeInTheDocument();
        expect(screen.getByText('Geplanter Ablauf')).toBeInTheDocument();
        expect(screen.getByText('Bereit zum Start')).toBeInTheDocument();
        expect(screen.getAllByText('Aufheizen für Einmaischen').length).toBeGreaterThan(0);
        expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });

    it('shows a clear empty state if no recipe process is available', () => {
        render(<ProcessList selectedBeer={{...selectedBeer, fermentation: []} as Beer} currentStepIndex={0} />);

        expect(screen.getByText('Kein Bier für den Brauvorgang ausgewählt.')).toBeInTheDocument();
        expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });

    it('keeps only the following steps in the scrollable area', () => {
        const {container} = render(<ProcessList selectedBeer={selectedBeer} currentStepIndex={1} currentStep={{index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.TIMER_RUNNING}} brewingStatus={activeStatus(1)} />);

        expect(container.querySelector('.upcoming-process-scroll')).toBeInTheDocument();
        expect(container.querySelector('.current-process-step .upcoming-step-name')).not.toBeInTheDocument();
    });
});
