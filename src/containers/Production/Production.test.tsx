import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {Production} from './Production';
import {Beer} from '../../model/Beer';
import {ToggleState} from '../../enums/eToggleState';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';

const createBeer = (aMashVolume: number | undefined = 18, aSpargeVolume: number | undefined = 12, aId: string = '1'): Beer => ({
    id: aId,
    name: aId,
    type: 'Pils',
    color: 'Gold',
    alcohol: 5,
    originalwort: 12,
    bitterness: 20,
    description: '',
    rating: 3,
    mashVolume: aMashVolume as number,
    spargeVolume: aSpargeVolume as number,
    cookingTime: 60,
    cookingTemperatur: 99,
    fermentation: [
        {type: 'Einmaischen', temperature: 60},
        {type: 'Abmaischen', temperature: 78}
    ],
    malts: [],
    wortBoiling: {totalTime: 60, hops: []},
    fermentationMaturation: {fermentationTemperature: 20, carbonation: 5, yeast: []}
});

const createBrewingStatus = (aProcessState: ProcessState = ProcessState.IDLE): BrewingStatus => ({
    elapsedTime: 0,
    currentTime: 0,
    process: {state: aProcessState},
    currentStep: {
        index: 0,
        count: 0,
        phase: ProcessPhase.NONE,
        mode: ProcessMode.NONE,
        name: '',
        duration: 0,
        elapsedTime: 0,
        remainingTime: 0
    },
    temperature: {},
    hardware: {},
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {}
});

const renderProduction = (aOverrides: Partial<React.ComponentProps<typeof Production>> = {}) => {
    const props: React.ComponentProps<typeof Production> = {
        selectedBeer: createBeer(),
        temperature: 20,
        currentAgitatorState: ToggleState.OFF,
        currentAgitatorSpeed: 5,
        agitatorSpeed: 5,
        agitatorIsRunning: ToggleState.OFF,
        getTemperatures: jest.fn(),
        toggleAgitator: jest.fn(),
        setAgitatorSpeed: jest.fn(),
        startWaterFilling: jest.fn(),
        isWaterFillingSuccessful: true,
        isToggleAgitatorSuccess: true,
        sendBrewingData: jest.fn(),
        brewingStatus: createBrewingStatus(),
        isPollingRunning: false,
        startPolling: jest.fn(),
        stopPolling: jest.fn(),
        isBackenAvailable: {isBackenAvailable: true, statusText: 'OK'},
        waterStatus: {liters: 0, openClose: false},
        addFinishedBrew: jest.fn(),
        nextProcedureStep: jest.fn(),
        ...aOverrides
    };
    return {props, ...render(<Production {...props} />)};
};

describe('Production start button', () => {

    it('keeps the start button enabled when no brew is running', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
    });

    it('disables the start button while a brew is active', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: false});
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
    });

    it('disables the start button while a start request is running', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: true});
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
    });

    it('sends the brewing data only once for fast repeated start clicks', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        const startButton = screen.getByRole('button', {name: 'Start'});
        fireEvent.click(startButton);
        fireEvent.click(startButton);
        expect(props.sendBrewingData).toHaveBeenCalledTimes(1);
    });

    it('does not send another start request when a brew is already active', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: false});
        fireEvent.click(screen.getByRole('button', {name: 'Start'}));
        expect(props.sendBrewingData).not.toHaveBeenCalled();
    });

    it('enables the start button again after finished, aborted, reset, or failed idle states', () => {
        const {rerender, props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: true});
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.FINISHED)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.ABORTED)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
    });


    it('enables the start button again after a failed start request without active control status', () => {
        const {rerender, props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        fireEvent.click(screen.getByRole('button', {name: 'Start'}));
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={true} />);
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Start'})).not.toBeDisabled();
    });

    it('keeps the existing recipe transfer and start flow unchanged', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        fireEvent.click(screen.getByRole('button', {name: 'Start'}));
        expect(props.sendBrewingData).toHaveBeenCalledTimes(1);
    });

    it('uses the polling refresh flow for the repeat polling button instead of starting a brew', () => {
        const {props, container} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: false});
        const startPollingButton = container.querySelector('.startPollingBtn') as HTMLButtonElement;

        fireEvent.click(startPollingButton);

        expect(props.startPolling).toHaveBeenCalledTimes(1);
        expect(props.sendBrewingData).not.toHaveBeenCalled();
    });

    it('disables the repeat polling button while polling is already running', () => {
        const {container} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: true});
        const startPollingButton = container.querySelector('.startPollingBtn') as HTMLButtonElement;

        expect(startPollingButton).toBeDisabled();
    });

});


describe('Production next button', () => {
    const getNextButton = () => screen.getByRole('button', {name: 'Nächster Schritt'});

    it('disables the next button while the status has not been loaded yet', () => {
        renderProduction({brewingStatus: undefined});
        expect(getNextButton()).toBeDisabled();
    });

    it('disables the next button without an active brewing process and does not dispatch next', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE)});
        const nextButton = getNextButton();

        expect(nextButton).toBeDisabled();
        fireEvent.click(nextButton);
        expect(props.nextProcedureStep).not.toHaveBeenCalled();
    });

    it('guards the next click handler without an active brewing process', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE)});
        const production = new Production(props);

        production.handleNextProcedureStep();

        expect(props.nextProcedureStep).not.toHaveBeenCalled();
    });

    it('enables the next button during an active brewing process and dispatches next exactly once', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE)});
        const nextButton = getNextButton();

        expect(nextButton).not.toBeDisabled();
        fireEvent.click(nextButton);
        expect(props.nextProcedureStep).toHaveBeenCalledTimes(1);
    });

    it('disables the next button again when the process is finished, aborted, or reset to idle', () => {
        const {rerender, props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE)});
        expect(getNextButton()).not.toBeDisabled();

        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.FINISHED)} />);
        expect(getNextButton()).toBeDisabled();

        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.ABORTED)} />);
        expect(getNextButton()).toBeDisabled();

        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} />);
        expect(getNextButton()).toBeDisabled();
    });

    it('keeps the next button disabled after a failed status request leaves no status available', () => {
        renderProduction({brewingStatus: undefined});
        expect(getNextButton()).toBeDisabled();
    });
});

describe('Production recipe water filling', () => {
    it('sends the recipe mash water volume when Hauptguss is clicked', () => {
        const {props} = renderProduction({selectedBeer: createBeer(21, 9)});
        fireEvent.click(screen.getByRole('button', {name: 'Hauptguss'}));
        expect(props.startWaterFilling).toHaveBeenCalledWith(21);
    });

    it('sends the recipe sparge water volume when Nachguss is clicked', () => {
        const {props} = renderProduction({selectedBeer: createBeer(21, 9)});
        fireEvent.click(screen.getByRole('button', {name: 'Nachguss'}));
        expect(props.startWaterFilling).toHaveBeenCalledWith(9);
    });

    it('disables both recipe water buttons while water filling is active', () => {
        renderProduction({waterStatus: {liters: 3, openClose: true}});
        expect(screen.getByRole('button', {name: 'Hauptguss'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Nachguss'})).toBeDisabled();
    });

    it('keeps Hauptguss disabled after completed mash water filling and leaves Nachguss available', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {liters: 0, openClose: false}});
        fireEvent.click(screen.getByRole('button', {name: 'Hauptguss'}));
        rerender(<Production {...props} waterStatus={{liters: 2, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{liters: 21, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Hauptguss'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Nachguss'})).not.toBeDisabled();
    });

    it('keeps Nachguss disabled after completed sparge water filling and leaves Hauptguss available', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {liters: 0, openClose: false}});
        fireEvent.click(screen.getByRole('button', {name: 'Nachguss'}));
        rerender(<Production {...props} waterStatus={{liters: 2, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{liters: 9, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Nachguss'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Hauptguss'})).not.toBeDisabled();
    });

    it('disables recipe water buttons with missing or invalid volumes', () => {
        renderProduction({selectedBeer: createBeer(0, -1)});
        expect(screen.getByRole('button', {name: 'Hauptguss'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Nachguss'})).toBeDisabled();
    });

    it('does not mark recipe water filling complete when the request fails before water starts', async () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {liters: 0, openClose: false}});
        fireEvent.click(screen.getByRole('button', {name: 'Hauptguss'}));
        rerender(<Production {...props} isWaterFillingSuccessful={false} waterStatus={{liters: 0, openClose: false}} />);
        await waitFor(() => expect(screen.getByRole('button', {name: 'Hauptguss'})).not.toBeDisabled());
    });

    it('resets completed recipe water filling when the recipe changes', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9, '1'), waterStatus: {liters: 0, openClose: false}});
        fireEvent.click(screen.getByRole('button', {name: 'Hauptguss'}));
        rerender(<Production {...props} waterStatus={{liters: 2, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{liters: 21, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Hauptguss'})).toBeDisabled();
        rerender(<Production {...props} selectedBeer={createBeer(22, 10, '2')} waterStatus={{liters: 0, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Hauptguss'})).not.toBeDisabled();
    });


    it('resets completed recipe water filling when a new brew starts', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {liters: 0, openClose: false}});
        fireEvent.click(screen.getByRole('button', {name: 'Hauptguss'}));
        rerender(<Production {...props} waterStatus={{liters: 2, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{liters: 21, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Hauptguss'})).toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: 'Start'}));
        expect(screen.getByRole('button', {name: 'Hauptguss'})).not.toBeDisabled();
    });

    it('keeps the existing manual water filling control unchanged', () => {
        const {props, container} = renderProduction({selectedBeer: createBeer(21, 9)});
        const manualWaterSwitch = container.querySelector('.settingsRowWater input') as HTMLInputElement;
        fireEvent.click(manualWaterSwitch);
        expect(props.startWaterFilling).toHaveBeenCalledWith(0);
    });
});
