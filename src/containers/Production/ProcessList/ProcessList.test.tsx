import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {Beer} from '../../../model/Beer';
import {ProcessMode, ProcessPhase} from '../../../model/brewingStatus.types';
import {createProcessSteps, CurrentProcessStep, getActiveProcessStepIndex, ProcessList} from './ProcessList';

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

const makeCurrentStep = (index: number, mode: ProcessMode, name: string): CurrentProcessStep => ({
    index,
    phase: ProcessPhase.RAST,
    mode,
    name,
});

const getActiveItems = (container: HTMLElement) => Array.from(container.querySelectorAll('li.active'));

const getActiveStepText = (currentStep: CurrentProcessStep) => {
    const {container} = render(<ProcessList selectedBeer={selectedBeer} currentStep={currentStep} />);
    return container.querySelector('li.active')?.textContent;
};

describe('ProcessList current-step mapping', () => {
    it('builds visible process rows with shared 1-based control indices for rest heat-up and rest process rows', () => {
        expect(createProcessSteps(selectedBeer).map(step => `${step.controlStepIndex ?? '-'}:${step.name}`)).toEqual([
            '-:Aufheizen für Einmaischen -> 57°C',
            '1:Einmaischen',
            '2:Aufheizen für Rast 1 -> 63°C',
            '2:Rast 1',
            '3:Aufheizen für Rast 2 -> 68°C',
            '3:Rast 2',
            '4:Aufheizen für Rast 3 -> 72°C',
            '4:Rast 3',
            '-:Jod Probe',
            '-:Aufheizen für Abmaischen -> 78°C',
            '5:Abmaischen',
            '-:Aufheizen auf Kochen',
            '6:Kochen',
        ]);
    });

    it.each([
        [1, 'Einmaischen'],
        [2, 'Rast 1'],
        [3, 'Rast 2'],
        [4, 'Rast 3'],
    ])('marks control step %i as %s', (controlStepIndex, expectedStep) => {
        expect(getActiveStepText({index: controlStepIndex, phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: expectedStep})).toContain(expectedStep);
    });

    it('uses the mode to choose between the heat-up row and the running rest row for the same control index', () => {
        const steps = createProcessSteps(selectedBeer);
        const rast2RunningIndex = getActiveProcessStepIndex(steps, makeCurrentStep(3, ProcessMode.TIMER_RUNNING, 'Rast 2'));
        const rast3HeatingIndex = getActiveProcessStepIndex(steps, makeCurrentStep(4, ProcessMode.HEATING, 'Rast 3'));
        const rast3RunningIndex = getActiveProcessStepIndex(steps, makeCurrentStep(4, ProcessMode.TIMER_RUNNING, 'Rast 3'));

        expect(steps[rast2RunningIndex].name).toBe('Rast 2');
        expect(steps[rast3HeatingIndex].name).toContain('Aufheizen für Rast 3');
        expect(steps[rast3RunningIndex].name).toBe('Rast 3');
        expect(rast3RunningIndex).not.toBe(rast3HeatingIndex);
    });

    it('does not treat the 1-based control index as the 0-based React array index', () => {
        const steps = createProcessSteps(selectedBeer);

        expect(getActiveProcessStepIndex(steps, makeCurrentStep(4, ProcessMode.TIMER_RUNNING, 'Rast 3'))).toBe(7);
        expect(steps[4].name).not.toBe('Rast 3');
    });

    it('updates the active marker when the reported control step changes', () => {
        const {container, rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(2, ProcessMode.TIMER_RUNNING, 'Rast 1')} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 1');
        expect(getActiveItems(container)).toHaveLength(1);

        rerender(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(2, ProcessMode.TIMER_RUNNING, 'Rast 1')} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 1');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(3, ProcessMode.TIMER_RUNNING, 'Rast 2')} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Rast 2');

        rerender(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(4, ProcessMode.HEATING, 'Rast 3')} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Aufheizen für Rast 3');
        expect(container.querySelector('li.active')).not.toHaveTextContent(/^8\.\s+Rast 3$/);
        expect(getActiveItems(container)).toHaveLength(1);

        rerender(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(4, ProcessMode.TIMER_RUNNING, 'Rast 3')} />);
        expect(container.querySelector('li.active')).toHaveTextContent(/^8\.\s+Rast 3$/);
        expect(container.querySelector('li.active')).not.toHaveTextContent('Aufheizen für Rast 3');
        expect(container.querySelector('li.active')).not.toHaveTextContent('Rast 2');
        expect(getActiveItems(container)).toHaveLength(1);
    });

    it('moves the active marker when only the mode changes and the control index stays the same', () => {
        const {container, rerender} = render(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(4, ProcessMode.HEATING, 'Rast 3')} />);
        expect(container.querySelector('li.active')).toHaveTextContent('Aufheizen für Rast 3');
        expect(getActiveItems(container)).toHaveLength(1);

        rerender(<ProcessList selectedBeer={selectedBeer} currentStep={makeCurrentStep(4, ProcessMode.TIMER_RUNNING, 'Rast 3')} />);
        expect(container.querySelector('li.active')).toHaveTextContent(/^8\.\s+Rast 3$/);
        expect(container.querySelector('li.active')).not.toHaveTextContent('Aufheizen für Rast 3');
        expect(getActiveItems(container)).toHaveLength(1);
    });

    it('keeps non-rest phases mapped to their existing process rows', () => {
        const steps = createProcessSteps(selectedBeer);

        expect(steps[getActiveProcessStepIndex(steps, {index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.HEATING, name: 'Einmaischen'})].name).toBe('Einmaischen');
        expect(steps[getActiveProcessStepIndex(steps, {index: 5, phase: ProcessPhase.MASHING_OUT, mode: ProcessMode.HEATING, name: 'Abmaischen'})].name).toBe('Abmaischen');
        expect(steps[getActiveProcessStepIndex(steps, {index: 6, phase: ProcessPhase.COOKING, mode: ProcessMode.HEATING, name: 'Kochen'})].name).toBe('Kochen');
        expect(steps[getActiveProcessStepIndex(steps, {index: 4, phase: ProcessPhase.RAST, mode: ProcessMode.WAITING, name: 'Rast 3'})].name).toBe('Rast 3');
    });

    it('renders all expected rows', () => {
        render(<ProcessList selectedBeer={selectedBeer} currentStep={{index: 1, phase: ProcessPhase.MASHING_IN, mode: ProcessMode.HEATING, name: 'Einmaischen'}} />);

        expect(screen.getAllByText(/Einmaischen/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 1/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 2/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Rast 3/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Abmaischen/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kochen/).length).toBeGreaterThan(0);
    });
});
