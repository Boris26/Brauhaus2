import React from 'react';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {Beer} from '../../../model/Beer';
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
    it('builds visible process rows with 1-based control indices only on recipe steps', () => {
        expect(createProcessSteps(selectedBeer).map(step => `${step.controlStepIndex ?? '-'}:${step.name}`)).toEqual([
            '-:Aufheizen für Einmaischen -> 57°C',
            '1:Einmaischen',
            '-:Aufheizen für Rast 1 -> 63°C',
            '2:Rast 1',
            '-:Aufheizen für Rast 2 -> 68°C',
            '3:Rast 2',
            '-:Aufheizen für Rast 3 -> 72°C',
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
        expect(getActiveStepText(controlStepIndex)).toContain(expectedStep);
    });

    it('keeps heating and timer-running modes on the same list entry because mode is not part of the mapping', () => {
        const steps = createProcessSteps(selectedBeer);
        const rast1HeatingIndex = getActiveProcessStepIndex(steps, 2);
        const rast1TimerRunningIndex = getActiveProcessStepIndex(steps, 2);
        const rast2HeatingIndex = getActiveProcessStepIndex(steps, 3);
        const rast2TimerRunningIndex = getActiveProcessStepIndex(steps, 3);
        const rast3HeatingIndex = getActiveProcessStepIndex(steps, 4);

        expect(steps[rast1HeatingIndex].name).toBe('Rast 1');
        expect(rast1TimerRunningIndex).toBe(rast1HeatingIndex);
        expect(steps[rast2HeatingIndex].name).toBe('Rast 2');
        expect(rast2TimerRunningIndex).toBe(rast2HeatingIndex);
        expect(steps[rast3HeatingIndex].name).toBe('Rast 3');
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
