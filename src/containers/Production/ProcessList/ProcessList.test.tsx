import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {Beer} from '../../../model/Beer';
import {ProcessMode, ProcessPhase} from '../../../model/brewingStatus.types';
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
            '1:Aufheizen für Einmaischen -> 57°C',
            '1:Einmaischen',
            '2:Aufheizen für Rast 1 -> 63°C',
            '2:Rast 1',
            '3:Aufheizen für Rast 2 -> 68°C',
            '3:Rast 2',
            '4:Aufheizen für Rast 3 -> 72°C',
            '4:Rast 3',
            '-:Jod Probe',
            '5:Aufheizen für Abmaischen -> 78°C',
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

        expect(steps[getActiveProcessStepIndex(steps, 1, {index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.HEATING})].name).toBe('Aufheizen für Einmaischen -> 57°C');
        expect(steps[getActiveProcessStepIndex(steps, 1, {index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.TIMER_RUNNING})].name).toBe('Einmaischen');
        expect(steps[getActiveProcessStepIndex(steps, 2, {index: 2, phase: ProcessPhase.RAST, mode: ProcessMode.HEATING})].name).toBe('Aufheizen für Rast 1 -> 63°C');
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
