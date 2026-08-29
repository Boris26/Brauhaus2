import React from 'react';
import {act, render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {AGITATOR_SPEED_DEBOUNCE_MS, Production} from './Production';
import {Beer} from '../../model/Beer';
import {ToggleState} from '../../enums/eToggleState';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {dataCollector} from '../../utils/DataCollector/dataCollector';
import {ProductionRepository} from '../../repositorys/ProductionRepository';

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
    error: {},
    alarms: [],
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
        waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false},
        addFinishedBrew: jest.fn(),
        isAddingFinishedBrew: false,
        addFinishedBrewError: undefined,
        pendingFinishedBrewPayload: undefined,
        nextProcedureStep: jest.fn(),
        isNextProcedureStepPending: false,
        isBrewingStatusStale: false,
        confirm: jest.fn(),
        isConfirmPending: false,
        debug: true,
        ...aOverrides
    };
    return {props, ...render(<Production {...props} />)};
};

describe('Production agitator controller integration', () => {
    const detail = {
        config: {mode: 'AUTOMATIC' as const, speedPercent: 36, runningMinutes: 2, breakMinutes: 7},
        inputs: {heatingActive: false},
        runtime: {paused: false, desiredOperation: 'INTERVAL' as const, actualOutputOn: false, intervalPhase: 'BREAK'}
    };

    beforeEach(() => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue(detail);
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementation(async config => config);
        jest.spyOn(ProductionRepository, 'pauseAgitator').mockResolvedValue();
        jest.spyOn(ProductionRepository, 'resumeAgitator').mockResolvedValue();
    });
    afterEach(() => jest.restoreAllMocks());

    it('maps AUTOMATIC detail state to the switches without a runtime status row', async () => {
        renderProduction();
        expect(await screen.findByText('Geschwindigkeit')).toBeInTheDocument();
        expect(screen.getByText('36 %')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).not.toBeChecked();
        expect(screen.getByRole('switch', {name: 'Automatik'})).toBeChecked();
        expect(screen.getAllByRole('switch', {name: 'Automatik'})).toHaveLength(1);
        expect(screen.queryByText('Automatik · Intervallpause')).not.toBeInTheDocument();
        expect(ProductionRepository.getAgitatorStatus).toHaveBeenCalledTimes(1);
    });

    it('keeps the complete agitator UI visible and disabled when detail status is unavailable', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockRejectedValue(new Error('offline'));
        renderProduction({isBackenAvailable: {isBackenAvailable: false, statusText: 'Offline'}});
        expect(await screen.findByText('Rührwerk-Konfiguration nicht verfügbar')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeDisabled();
        expect(screen.getByRole('switch', {name: 'Automatik'})).toBeDisabled();
        within(screen.getByTestId('running-minutes-stepper')).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
        within(screen.getByTestId('break-minutes-stepper')).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
        expect(screen.getByRole('slider')).toBeDisabled();
        expect(screen.getByText('Geschwindigkeit')).toBeInTheDocument();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it.each([
        ['OFF', false, false],
        ['CONTINUOUS', true, false],
        ['AUTOMATIC', false, true],
    ] as const)('maps %s controller mode to continuous=%s and automatic=%s', async (mode, continuous, automatic) => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue({
            ...detail,
            config: {...detail.config, mode},
        });
        renderProduction();
        expect(await screen.findByRole('switch', {name: 'Durchgehend rühren'})).toHaveProperty('checked', continuous);
        expect(screen.getByRole('switch', {name: 'Automatik'})).toHaveProperty('checked', automatic);
    });

    it('switches directly from AUTOMATIC to CONTINUOUS with the complete confirmed config', async () => {
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Durchgehend rühren'}));
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'CONTINUOUS', speedPercent: 36, runningMinutes: 2, breakMinutes: 7}));
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
    });

    it('switches directly from CONTINUOUS to AUTOMATIC and preserves interval and speed config', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue({...detail, config: {...detail.config, mode: 'CONTINUOUS'}});
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Automatik'}));
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 2, breakMinutes: 7}));
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
    });

    it('turns an active mode off without changing the remaining config', async () => {
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Automatik'}));
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'OFF', speedPercent: 36, runningMinutes: 2, breakMinutes: 7}));
    });

    it('keeps both mode switches disabled while a config request is pending', async () => {
        let resolveConfig!: (config: any) => void;
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementation(config => new Promise(resolve => { resolveConfig = resolve; }));
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Durchgehend rühren'}));
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeDisabled();
        expect(screen.getByRole('switch', {name: 'Automatik'})).toBeDisabled();
        resolveConfig({...detail.config, mode: 'CONTINUOUS'});
        await waitFor(() => expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeEnabled());
    });

    it('debounces speed drafts and sends only the latest complete config', async () => {
        jest.useFakeTimers();
        renderProduction();
        await act(async () => { await Promise.resolve(); });
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, {target: {value: '40'}});
        fireEvent.change(slider, {target: {value: '42'}});
        expect(screen.getByText('42 %')).toBeInTheDocument();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(AGITATOR_SPEED_DEBOUNCE_MS));
        await act(async () => { await Promise.resolve(); });
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 42, runningMinutes: 2, breakMinutes: 7});
        jest.useRealTimers();
    });

    it('keeps confirmed config when a legacy poll updates runtime only', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        rerender(<Production {...props} brewingStatus={{...createBrewingStatus(), agitator: {mode: 'AUTOMATIC', paused: true, operation: 'INTERVAL', intervalPhase: 'BREAK', actualOutputOn: false}}} />);
        expect(await screen.findByText('36 %')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Automatik'})).toBeChecked();
        expect(screen.getByRole('button', {name: 'Rührwerk fortsetzen'})).toBeInTheDocument();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it('renders polled multi-client mode changes without sending config', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        (ProductionRepository.setAgitatorConfig as jest.Mock).mockClear();
        rerender(<Production {...props} brewingStatus={{...createBrewingStatus(), agitator: {mode: 'CONTINUOUS', paused: false, operation: 'CONTINUOUS', intervalPhase: 'IDLE', actualOutputOn: true}}} />);
        expect(await screen.findByRole('switch', {name: 'Durchgehend rühren'})).toBeChecked();
        expect(screen.getByRole('switch', {name: 'Automatik'})).not.toBeChecked();
        rerender(<Production {...props} brewingStatus={{...createBrewingStatus(), agitator: {mode: 'OFF', paused: false, operation: 'OFF', intervalPhase: 'IDLE', actualOutputOn: false}}} />);
        await waitFor(() => expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).not.toBeChecked());
        expect(screen.getByRole('switch', {name: 'Automatik'})).not.toBeChecked();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it('adopts optional #98 config fields from the normal poll', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        rerender(<Production {...props} brewingStatus={{...createBrewingStatus(), agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 42, runningMinutes: 4, breakMinutes: 10}}} />);
        expect(await screen.findByText('42 %')).toBeInTheDocument();
        expect(within(screen.getByTestId('running-minutes-stepper')).getByText('4')).toBeInTheDocument();
        expect(within(screen.getByTestId('break-minutes-stepper')).getByText('10')).toBeInTheDocument();
    });

    it('keeps interval settings visible but only editable in AUTOMATIC mode and places speed afterwards', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue({...detail, config: {...detail.config, mode: 'OFF'}});
        const {container} = renderProduction();
        expect(await screen.findByRole('button', {name: 'Laufzeit erhöhen'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Pausenzeit erhöhen'})).toBeDisabled();
        const automaticCard = container.querySelector('.agitatorAutomaticSettings') as HTMLElement;
        const speed = screen.getByText('Geschwindigkeit').closest('label') as HTMLElement;
        expect(automaticCard.compareDocumentPosition(speed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText('36 %')).toBeInTheDocument();
    });

    it('pauses independently without changing the selected mode', async () => {
        renderProduction();
        fireEvent.click(await screen.findByRole('button', {name: 'Rührwerk pausieren'}));
        await waitFor(() => expect(ProductionRepository.pauseAgitator).toHaveBeenCalledTimes(1));
        expect(screen.getByRole('switch', {name: 'Automatik'})).toBeChecked();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Rührwerk fortsetzen'})).toBeInTheDocument();
    });

    it('uses controller minute values and sends the complete config when incrementing runtime', async () => {
        renderProduction();
        expect(await screen.findByLabelText('Laufzeit')).toHaveTextContent('2');
        expect(screen.getByLabelText('Pausenzeit')).toHaveTextContent('7');
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.mouseDown(increment);
        fireEvent.mouseUp(increment);
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 3, breakMinutes: 7}));
    });

    it('sends the complete config when decrementing break time', async () => {
        renderProduction();
        await screen.findByLabelText('Pausenzeit');
        const decrement = screen.getByRole('button', {name: 'Pausenzeit verringern'});
        fireEvent.mouseDown(decrement);
        fireEvent.mouseUp(decrement);
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 2, breakMinutes: 6}));
    });

    it('discards an interval draft after a failed config request', async () => {
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockRejectedValue(new Error('failed'));
        renderProduction();
        await screen.findByLabelText('Laufzeit');
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.mouseDown(increment);
        fireEvent.mouseUp(increment);
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Rührwerk konnte nicht aktualisiert werden.'));
        expect(screen.getByLabelText('Laufzeit')).toHaveTextContent('2');
        expect(screen.getByLabelText('Pausenzeit')).toHaveTextContent('7');
    });
});

describe('Production finished-brew persistence', () => {
    beforeEach(() => dataCollector.reset());
    afterEach(() => dataCollector.reset());

    const openFinishDialog = (overrides: Partial<React.ComponentProps<typeof Production>> = {}) => {
        const activeStatus = createBrewingStatus(ProcessState.ACTIVE);
        const finishedStatus = createBrewingStatus(ProcessState.FINISHED);
        dataCollector.setBrewingStatus(finishedStatus);
        const rendered = renderProduction({brewingStatus: activeStatus, ...overrides});
        rendered.rerender(<Production {...rendered.props} brewingStatus={finishedStatus} />);
        return {...rendered, finishedStatus};
    };

    it('keeps the dialog open while saving and completes only after create success', async () => {
        const addFinishedBrew = jest.fn();
        const stopPolling = jest.fn();
        const {props, rerender, finishedStatus} = openFinishDialog({addFinishedBrew, stopPolling});

        fireEvent.click(await screen.findByRole('button', {name: 'Sud speichern'}));
        fireEvent.click(screen.getByRole('button', {name: 'Sud speichern'}));
        expect(addFinishedBrew).toHaveBeenCalledTimes(1);
        const actualPayload = addFinishedBrew.mock.calls[0][0];

        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={true} pendingFinishedBrewPayload={actualPayload} />);
        expect(screen.getByRole('button', {name: 'Speichert …'})).toBeDisabled();
        expect(stopPolling).not.toHaveBeenCalled();
        expect(dataCollector.getMeasurementCount()).toBe(1);

        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={false} pendingFinishedBrewPayload={undefined} />);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(stopPolling).toHaveBeenCalledTimes(1);
        expect(dataCollector.getMeasurementCount()).toBe(0);
    });

    it('preserves payload and measurements after failure and retries the exact payload', async () => {
        const addFinishedBrew = jest.fn();
        const {props, rerender, finishedStatus} = openFinishDialog({addFinishedBrew});

        fireEvent.click(screen.getByRole('button', {name: 'Sud speichern'}));
        const payload = addFinishedBrew.mock.calls[0][0];
        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={true} pendingFinishedBrewPayload={payload} />);
        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={false} addFinishedBrewError="HTTP 500" pendingFinishedBrewPayload={payload} />);

        expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
        expect(dataCollector.getMeasurementCount()).toBe(1);
        fireEvent.click(screen.getByRole('button', {name: 'Erneut versuchen'}));

        expect(addFinishedBrew).toHaveBeenCalledTimes(2);
        expect(addFinishedBrew.mock.calls[1][0]).toBe(payload);
        expect(addFinishedBrew.mock.calls[1][0].brewValues).toBe(payload.brewValues);

        rerender(<Production {...props} brewingStatus={finishedStatus} addFinishedBrew={addFinishedBrew} isAddingFinishedBrew={true} pendingFinishedBrewPayload={payload} />);
        rerender(<Production {...props} brewingStatus={finishedStatus} addFinishedBrew={addFinishedBrew} isAddingFinishedBrew={false} pendingFinishedBrewPayload={undefined} />);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(dataCollector.getMeasurementCount()).toBe(0);
    });
});

describe('Production start button', () => {

    it('starts status polling when the desktop production view is restored', () => {
        const startPolling = jest.fn();
        renderProduction({startPolling, isPollingRunning: false});
        expect(startPolling).toHaveBeenCalledTimes(1);
    });

    it('does not start a duplicate poller when polling is already active', () => {
        const startPolling = jest.fn();
        renderProduction({startPolling, isPollingRunning: true});
        expect(startPolling).not.toHaveBeenCalled();
    });

    it('warns about stale controller data and suppresses the stale heater flame', () => {
        const status = createBrewingStatus(ProcessState.ACTIVE);
        status.hardware.heater = 'ON';
        const {container} = renderProduction({brewingStatus: status, isBrewingStatusStale: true});
        expect(screen.getByRole('alert')).toHaveTextContent('Braustatus ist veraltet');
        expect(container.querySelector('.flame-strip')).toBeNull();
    });

    it('places the current step above the sole temperature gauge and keeps the process column focused on the upcoming flow', () => {
        const {container} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE)});
        const meters = container.querySelector('.meters') as HTMLElement;
        const processColumn = container.querySelector('.list') as HTMLElement;

        expect(meters.querySelector('.current-step-panel')).toBeInTheDocument();
        expect(meters.querySelector('.Temp')).toBeInTheDocument();
        expect(meters.querySelectorAll('.GaugeContainer')).toHaveLength(1);
        expect(meters.querySelector('[aria-label="Aktueller Prozessschritt"]')).toHaveTextContent('Noch kein Brauvorgang gestartet');
        expect(processColumn).toHaveTextContent('Ablauf');
        expect(processColumn.querySelector('.current-process-step')).not.toBeInTheDocument();
        expect(container.querySelector('.Water')).toHaveTextContent('0,0 l');
    });

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

        (props.startPolling as jest.Mock).mockClear();
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

describe('Production inline confirmations', () => {
    const waitingStatus = (waitingFor: WaitingFor, phase: ProcessPhase): BrewingStatus => ({
        ...createBrewingStatus(ProcessState.ACTIVE),
        currentStep: {index: 1, phase, mode: ProcessMode.WAITING, name: phase},
        temperature: {current: 64, target: 66},
        waiting: {waitingFor, canConfirm: true},
    });

    it.each([
        [WaitingFor.DECOCTION_CONFIRMATION, ProcessPhase.DECOCTION, 'Dekoktion abgeschlossen', ConfirmStates.DECOCTION],
        [WaitingFor.DECOCTION_RETURN_CONFIRMATION, ProcessPhase.DECOCTION, 'Abgeschlossen', ConfirmStates.DECOCTION_RETURNED],
        [WaitingFor.IODINE_TEST, ProcessPhase.RAST, 'Jodprobe abgeschlossen', ConfirmStates.IODINE],
        [WaitingFor.MASHING_IN_CONFIRMATION, ProcessPhase.MASHING_IN, 'Einmaischen abgeschlossen', ConfirmStates.MASHUP],
        [WaitingFor.MASHING_OUT_CONFIRMATION, ProcessPhase.MASHING_OUT, 'Abmaischen abgeschlossen', ConfirmStates.MASHUP],
        [WaitingFor.BOILING_CONFIRMATION, ProcessPhase.COOKING, 'Siedepunkt erreicht', ConfirmStates.BOILING],
        [WaitingFor.COOKING_CONFIRMATION, ProcessPhase.COOKING, 'Kochen bestätigen', ConfirmStates.COOKING],
    ] as const)('renders %s inline and dispatches the existing confirm state', (waitingFor, phase, buttonLabel, confirmState) => {
        const confirm = jest.fn();
        const status = waitingStatus(waitingFor, phase);
        const {container, props, rerender} = renderProduction({brewingStatus: status, confirm});

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Aktion erforderlich')).toBeInTheDocument();
        expect(container.querySelector('.Temp')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: buttonLabel}));
        expect(confirm).toHaveBeenCalledWith(confirmState);
        rerender(<Production {...props} brewingStatus={status} confirm={confirm} isConfirmPending={true} />);
        expect(screen.getByRole('button', {name: 'Wird verarbeitet …'})).toBeDisabled();
    });

    it('shows an unsupported user confirmation without inventing a button', () => {
        renderProduction({brewingStatus: waitingStatus(WaitingFor.USER_CONFIRMATION, ProcessPhase.RAST)});
        expect(screen.getByText('Wartet auf Benutzeraktion')).toBeInTheDocument();
        expect(screen.getByLabelText('Aktion erforderlich').querySelector('button')).toBeNull();
    });

    it('uses the shared pending state and allows retry when failure clears it', () => {
        const confirm = jest.fn();
        const status = waitingStatus(WaitingFor.IODINE_TEST, ProcessPhase.RAST);
        const {props, rerender} = renderProduction({brewingStatus: status, confirm});

        rerender(<Production {...props} brewingStatus={status} confirm={confirm} isConfirmPending={true} />);
        expect(screen.getByRole('button', {name: 'Wird verarbeitet …'})).toBeDisabled();

        rerender(<Production {...props} brewingStatus={status} confirm={confirm} isConfirmPending={false} />);
        fireEvent.click(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'}));
        expect(confirm).toHaveBeenCalledWith(ConfirmStates.IODINE);
    });

    it('shows a confirm failure without removing the current waiting action', () => {
        renderProduction({
            brewingStatus: waitingStatus(WaitingFor.IODINE_TEST, ProcessPhase.RAST),
            isConfirmPending: false,
            confirmError: 'HTTP 500',
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Bestätigung fehlgeschlagen: HTTP 500');
        expect(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'})).toBeEnabled();
    });

    it('labels the decoction target as the held main-mash rest temperature', () => {
        renderProduction({brewingStatus: waitingStatus(WaitingFor.DECOCTION_CONFIRMATION, ProcessPhase.DECOCTION)});
        expect(screen.getByText('Hauptmaische · gehaltene Rasttemperatur')).toBeInTheDocument();
        expect(screen.getByText('66 °C')).toBeInTheDocument();
        expect(screen.getByText('Hauptmaische wird weiterhin auf 66 °C gehalten.')).toBeInTheDocument();
    });

    it('uses the related rest temperature when the controller has no target for a decoction', () => {
        const beer = {
            ...createBeer(),
            fermentation: [
                {type: 'Einmaischen', temperature: 60},
                {stepId: 'rast-1', type: 'Rast 1', temperature: 67, procedureType: 'RAST'},
                {stepId: 'decoction-1', relatedRastId: 'rast-1', type: 'Dekoktion 1', procedureType: 'DECOCTION'},
                {type: 'Abmaischen', temperature: 78},
            ],
        } as Beer;
        const status = waitingStatus(WaitingFor.DECOCTION_CONFIRMATION, ProcessPhase.DECOCTION);
        status.currentStep.name = 'Dekoktion 1';
        status.temperature = {current: 64};
        renderProduction({selectedBeer: beer, brewingStatus: status});

        expect(screen.getByText('Hauptmaische · gehaltene Rasttemperatur')).toBeInTheDocument();
        expect(screen.getByText('67 °C')).toBeInTheDocument();
    });

    it('renders hop additions as a non-blocking reminder and dismisses only the reminder', () => {
        const beer = {...createBeer(), wortBoiling: {totalTime: 60, hops: [{id: 'h1', name: 'Cascade', description: '', alpha: 5, quantity: 10, time: 60}]}};
        const beforeCooking = createBrewingStatus(ProcessState.ACTIVE);
        const cooking = createBrewingStatus(ProcessState.ACTIVE);
        cooking.currentStep = {index: 3, phase: ProcessPhase.COOKING, mode: ProcessMode.TIMER_RUNNING, elapsedTime: 1, duration: 3600};
        const {rerender, props} = renderProduction({selectedBeer: beer, brewingStatus: beforeCooking});
        rerender(<Production {...props} selectedBeer={beer} brewingStatus={cooking} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Hopfengabe')).toHaveTextContent('Cascade zugeben');
        expect(screen.getByLabelText('Hopfengabe')).toHaveTextContent('Der Kochprozess läuft weiter.');
        fireEvent.click(screen.getByRole('button', {name: 'Erledigt'}));
        expect(screen.queryByLabelText('Hopfengabe')).not.toBeInTheDocument();
        expect(screen.getByText('Schritt wird ausgeführt')).toBeInTheDocument();
    });
});


describe('Production controller availability dialog', () => {
    it('does not show the controller unavailable error dialog when the controller is offline', () => {
        renderProduction({isBackenAvailable: {isBackenAvailable: false, statusText: 'Fehler beim Backend-Check'}});

        expect(screen.queryByText('Die Brau-Steuerung ist nicht erreichbar')).not.toBeInTheDocument();
        expect(screen.queryByText('Fehler beim Backend-Check')).not.toBeInTheDocument();
    });
});

describe('Production equipment alarm dialog', () => {
    const withEquipmentAlarm = (aStatus: BrewingStatus): BrewingStatus => ({
        ...aStatus,
        alarms: [{type: AlarmType.EQUIPMENT_ALARM, active: true}]
    });

    it('is absent without an alarm and visible immediately for an initially active alarm', () => {
        const {unmount} = renderProduction();
        expect(screen.queryByRole('dialog', {name: 'Anlagenalarm'})).not.toBeInTheDocument();
        unmount();
        renderProduction({brewingStatus: withEquipmentAlarm(createBrewingStatus(ProcessState.ACTIVE))});
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
        expect(screen.getByText(/angeschlossene Anlagensteuerung meldet einen Fehler/)).toBeInTheDocument();
    });

    it('stays dismissed across active polls and reopens for a new alarm cycle', () => {
        const inactive = createBrewingStatus(ProcessState.ACTIVE);
        const active = withEquipmentAlarm(inactive);
        const {rerender, props} = renderProduction({brewingStatus: inactive});
        rerender(<Production {...props} brewingStatus={active} />);
        fireEvent.click(screen.getByRole('button', {name: 'Schließen'}));
        rerender(<Production {...props} brewingStatus={{...active}} />);
        rerender(<Production {...props} brewingStatus={{...active}} />);
        expect(screen.queryByRole('dialog', {name: 'Anlagenalarm'})).not.toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={inactive} />);
        rerender(<Production {...props} brewingStatus={active} />);
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
    });

    it('closes automatically without user action when the alarm ends', () => {
        const inactive = createBrewingStatus(ProcessState.ACTIVE);
        const active = withEquipmentAlarm(inactive);
        const {rerender, props} = renderProduction({brewingStatus: active});
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={inactive} />);
        expect(screen.queryByRole('dialog', {name: 'Anlagenalarm'})).not.toBeInTheDocument();
    });
});


describe('Production next button', () => {
    const getNextButton = () => screen.getByRole('button', {name: 'Nächster Schritt'});

    it('does not render the next button outside debug mode', () => {
        renderProduction({debug: false});
        expect(screen.queryByRole('button', {name: 'Nächster Schritt'})).not.toBeInTheDocument();
    });

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

    it('disables the next button while a next-step request is pending', () => {
        const {props} = renderProduction({
            brewingStatus: createBrewingStatus(ProcessState.ACTIVE),
            isNextProcedureStepPending: true,
        });
        const nextButton = getNextButton();
        expect(nextButton).toBeDisabled();
        fireEvent.click(nextButton);
        expect(props.nextProcedureStep).not.toHaveBeenCalled();
    });

    it('disables the next button while the controller is offline and does not dispatch next', () => {
        const {props} = renderProduction({
            brewingStatus: createBrewingStatus(ProcessState.ACTIVE),
            isBackenAvailable: {isBackenAvailable: false, statusText: 'Offline'}
        });
        const nextButton = getNextButton();

        expect(nextButton).toBeDisabled();
        fireEvent.click(nextButton);
        expect(props.nextProcedureStep).not.toHaveBeenCalled();
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
    const getSpargeButton = () => screen.getByRole('button', {name: /Nachguss/});
    const getMashButton = () => screen.getByRole('button', {name: /Hauptguss/});

    it('starts with Nachguss enabled and Hauptguss disabled', () => {
        renderProduction({selectedBeer: createBeer(21, 9)});
        expect(getSpargeButton()).not.toBeDisabled();
        expect(getMashButton()).toBeDisabled();
        expect(screen.getByText('Aktueller Füllvorgang')).toBeInTheDocument();
        expect(screen.getByText('0,0 l')).toBeInTheDocument();
    });

    it('does not allow Hauptguss before Nachguss completed', () => {
        const {props} = renderProduction({selectedBeer: createBeer(21, 9)});
        fireEvent.click(getMashButton());
        expect(props.startWaterFilling).not.toHaveBeenCalled();
    });

    it('starts Nachguss from the recipe sparge water volume and guards fast double clicks', () => {
        const {props} = renderProduction({selectedBeer: createBeer(21, 9)});
        fireEvent.click(getSpargeButton());
        fireEvent.click(getSpargeButton());
        expect(props.startWaterFilling).toHaveBeenCalledTimes(1);
        expect(props.startWaterFilling).toHaveBeenCalledWith(9);
        expect(getSpargeButton()).toBeDisabled();
        expect(getMashButton()).toBeDisabled();
        expect(screen.getAllByText('Nachguss').length).toBeGreaterThan(0);
        expect(screen.getByText('0,0 l')).toBeInTheDocument();
    });

    it('does not complete Nachguss from the initial openClose false status', () => {
        renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        expect(getSpargeButton()).not.toBeDisabled();
        expect(getMashButton()).toBeDisabled();
        expect(screen.queryByRole('button', {name: '✓ Nachguss fertig'})).not.toBeInTheDocument();
    });

    it('marks Nachguss completed only after openClose was true and then false', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 2, targetLiters: 9, openClose: true}} />);
        expect(getSpargeButton()).toBeDisabled();
        expect(getMashButton()).toBeDisabled();
        expect(screen.getByText('2,0 l')).toBeInTheDocument();
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        expect(getMashButton()).not.toBeDisabled();
        expect(screen.getAllByText('Nachguss').length).toBeGreaterThan(0);
        expect(screen.getByText('9,0 l')).toBeInTheDocument();
    });


    it('keeps completed Nachguss visible when polling later reports an idle zero status', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 16.6), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 8.44, targetLiters: 16.6, openClose: true}} />);
        expect(screen.getByText('8,4 l')).toBeInTheDocument();
        rerender(<Production {...props} waterStatus={{filledLiters: 16.6, targetLiters: 16.6, openClose: false}} />);
        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        expect(getMashButton()).not.toBeDisabled();
        expect(screen.getByText('16,6 l')).toBeInTheDocument();

        rerender(<Production {...props} waterStatus={{filledLiters: 0, targetLiters: 0, openClose: false}} />);

        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        expect(getMashButton()).not.toBeDisabled();
        expect(screen.getByText('16,6 l')).toBeInTheDocument();
        expect(screen.queryByText('0,0 l')).not.toBeInTheDocument();
    });

    it('uses the last running filled liters when the terminal polling update already reports zero', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 16.6), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 16.6, targetLiters: 16.6, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 0, targetLiters: 0, openClose: false}} />);

        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        expect(getMashButton()).not.toBeDisabled();
        expect(screen.getByText('16,6 l')).toBeInTheDocument();
    });

    it('starts Hauptguss only after completed Nachguss and visibly resets the fill display to 0', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        fireEvent.click(getMashButton());
        expect(props.startWaterFilling).toHaveBeenLastCalledWith(21);
        expect(screen.getAllByText('Hauptguss').length).toBeGreaterThan(0);
        expect(screen.getByText('0,0 l')).toBeInTheDocument();
        expect(screen.queryByText('9,0 l')).not.toBeInTheDocument();
    });

    it('shows only Hauptguss during and after Hauptguss until Abmaischen is confirmed', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        fireEvent.click(getMashButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 12, targetLiters: 21, openClose: true}} />);
        expect(screen.getByText('12,0 l')).toBeInTheDocument();
        rerender(<Production {...props} waterStatus={{filledLiters: 21, targetLiters: 21, openClose: false}} />);
        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        expect(screen.getByRole('button', {name: '✓ Hauptguss fertig'})).toBeDisabled();
        expect(screen.getAllByText('Hauptguss').length).toBeGreaterThan(0);
        expect(screen.getByText('21,0 l')).toBeInTheDocument();
        expect(screen.queryByText('30,0 l')).not.toBeInTheDocument();
    });

    it('does not add transferred Nachguss back to the current vessel after mashing out', () => {
        const waitingForMashingOut = createBrewingStatus(ProcessState.ACTIVE);
        waitingForMashingOut.currentStep.phase = ProcessPhase.MASHING_OUT;
        waitingForMashingOut.currentStep.mode = ProcessMode.WAITING;
        waitingForMashingOut.waiting = {waitingFor: WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm: true};
        const cooking = createBrewingStatus(ProcessState.ACTIVE);
        cooking.currentStep.phase = ProcessPhase.COOKING;
        cooking.currentStep.mode = ProcessMode.HEATING;
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}, brewingStatus: waitingForMashingOut});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} brewingStatus={waitingForMashingOut} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: true}} />);
        rerender(<Production {...props} brewingStatus={waitingForMashingOut} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        fireEvent.click(getMashButton());
        rerender(<Production {...props} brewingStatus={waitingForMashingOut} waterStatus={{filledLiters: 21, targetLiters: 21, openClose: true}} />);
        rerender(<Production {...props} brewingStatus={waitingForMashingOut} waterStatus={{filledLiters: 21, targetLiters: 21, openClose: false}} />);
        expect(screen.queryByText('30,0 l')).not.toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={cooking} waterStatus={{filledLiters: 21, targetLiters: 21, openClose: false}} />);
        expect(screen.getAllByText('Hauptguss').length).toBeGreaterThan(0);
        expect(screen.getByText('21,0 l')).toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={cooking} waterStatus={{filledLiters: 21, targetLiters: 21, openClose: false}} />);
        expect(screen.getByText('21,0 l')).toBeInTheDocument();
        expect(screen.queryByText('39,0 l')).not.toBeInTheDocument();
    });

    it('disables recipe water buttons with missing or invalid volumes', () => {
        renderProduction({selectedBeer: createBeer(0, -1)});
        expect(getSpargeButton()).toBeDisabled();
        expect(getMashButton()).toBeDisabled();
    });

    it('does not mark recipe water filling complete when the request fails before water starts and allows a retry', async () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} isWaterFillingSuccessful={false} waterStatus={{filledLiters: 0, targetLiters: 0, openClose: false}} />);
        await waitFor(() => expect(getSpargeButton()).not.toBeDisabled());
        expect(getMashButton()).toBeDisabled();
        expect(screen.queryByRole('button', {name: '✓ Nachguss fertig'})).not.toBeInTheDocument();
    });

    it('keeps Nachguss completed and allows Hauptguss retry after a Hauptguss failure', async () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        fireEvent.click(getMashButton());
        rerender(<Production {...props} isWaterFillingSuccessful={false} waterStatus={{filledLiters: 0, targetLiters: 0, openClose: false}} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled());
        expect(getMashButton()).not.toBeDisabled();
    });

    it('resets completed recipe water filling when the recipe changes', () => {
        const {rerender, props} = renderProduction({selectedBeer: createBeer(21, 9, '1'), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 9, targetLiters: 9, openClose: false}} />);
        expect(screen.getByRole('button', {name: '✓ Nachguss fertig'})).toBeDisabled();
        rerender(<Production {...props} selectedBeer={createBeer(22, 10, '2')} waterStatus={{filledLiters: 0, targetLiters: 0, openClose: false}} />);
        expect(screen.getByRole('button', {name: 'Nachguss einfüllen'})).not.toBeDisabled();
        expect(screen.getByRole('button', {name: 'Hauptguss einfüllen'})).toBeDisabled();
    });

    it('keeps filled mash water at brewing start and includes prepared sparge once after mashing-out confirmation', () => {
        const waitingForMashingOut = createBrewingStatus(ProcessState.ACTIVE);
        waitingForMashingOut.currentStep.phase = ProcessPhase.MASHING_OUT;
        waitingForMashingOut.currentStep.mode = ProcessMode.WAITING;
        waitingForMashingOut.waiting = {waitingFor: WaitingFor.MASHING_OUT_CONFIRMATION, canConfirm: true};
        const cooking = createBrewingStatus(ProcessState.ACTIVE);
        cooking.currentStep.phase = ProcessPhase.COOKING;
        cooking.currentStep.mode = ProcessMode.HEATING;
        const {rerender, props, container} = renderProduction({selectedBeer: createBeer(20, 5), waterStatus: {filledLiters: 0, targetLiters: 0, openClose: false}});

        // Prepare 5 l recipe sparge plus a measured 1 l manual addition.
        fireEvent.click(getSpargeButton());
        rerender(<Production {...props} waterStatus={{filledLiters: 5, targetLiters: 5, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 5, targetLiters: 5, openClose: false}} />);
        const manualWaterSwitch = container.querySelector('.settingsRowWater input') as HTMLInputElement;
        fireEvent.click(manualWaterSwitch);
        rerender(<Production {...props} waterStatus={{filledLiters: 1, targetLiters: 1, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 1, targetLiters: 1, openClose: false}} />);
        expect(screen.getByText('6,0 l')).toBeInTheDocument();

        // Mash start still represents transfer of sparge out of the visible vessel.
        fireEvent.click(getMashButton());
        expect(screen.getByText('0,0 l')).toBeInTheDocument();
        rerender(<Production {...props} waterStatus={{filledLiters: 20, targetLiters: 20, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 20, targetLiters: 20, openClose: false}} />);
        fireEvent.click(manualWaterSwitch);
        rerender(<Production {...props} waterStatus={{filledLiters: 2, targetLiters: 2, openClose: true}} />);
        rerender(<Production {...props} waterStatus={{filledLiters: 2, targetLiters: 2, openClose: false}} />);
        expect(screen.getByText('22,0 l')).toBeInTheDocument();

        // Starting the brewing process is not a physical water transition.
        fireEvent.click(screen.getByRole('button', {name: 'Start'}));
        expect(screen.getByText('22,0 l')).toBeInTheDocument();

        // Leaving the explicit mashing-out confirmation adds actual prepared sparge once.
        rerender(<Production {...props} brewingStatus={waitingForMashingOut} waterStatus={{filledLiters: 2, targetLiters: 2, openClose: false}} />);
        rerender(<Production {...props} brewingStatus={cooking} waterStatus={{filledLiters: 2, targetLiters: 2, openClose: false}} />);
        expect(screen.getByText('28,0 l')).toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={cooking} waterStatus={{filledLiters: 2, targetLiters: 2, openClose: false}} />);
        expect(screen.getByText('28,0 l')).toBeInTheDocument();
    });

    it('keeps the existing manual water filling control unchanged', () => {
        const {props, container} = renderProduction({selectedBeer: createBeer(21, 9)});
        const manualWaterSwitch = container.querySelector('.settingsRowWater input') as HTMLInputElement;
        fireEvent.click(manualWaterSwitch);
        expect(props.startWaterFilling).toHaveBeenCalledWith(0);
    });

    it('disables production settings controls while the controller is offline', () => {
        const {container} = renderProduction({
            selectedBeer: createBeer(21, 9),
            isBackenAvailable: {isBackenAvailable: false, statusText: 'Offline'}
        });

        expect(container.querySelector('.Settings')).toHaveClass('Settings--disabled');
        expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
        expect(container.querySelector('.startPollingBtn')).toBeDisabled();
        expect(screen.getByRole('button', {name: /Nachguss/})).toBeDisabled();
        expect(screen.getByRole('button', {name: /Hauptguss/})).toBeDisabled();
        expect(container.querySelectorAll('.Settings .quantity-picker-content button:not(:disabled)')).toHaveLength(0);
    });
});


describe('Production flame display', () => {
    const cases = [
        {name: 'ready heater', heater: 'OFF', enabled: true, followsDecoction: false, mode: ProcessMode.TIMER_RUNNING, current: 60, target: 55, label: 'Heizung bereit', flame: false},
        {name: 'active heater', heater: 'ON', enabled: true, followsDecoction: false, mode: ProcessMode.HEATING, current: 54, target: 55, label: 'Heizung aktiv', flame: true},
        {name: 'blocked heater', heater: 'OFF', enabled: false, followsDecoction: false, mode: ProcessMode.HEATING, current: 54, target: 55, label: 'Heizung gesperrt', flame: false},
        {name: 'rest above target', heater: 'OFF', enabled: true, followsDecoction: false, mode: ProcessMode.TIMER_RUNNING, current: 60, target: 55, label: 'Heizung bereit', flame: false},
        {name: 'rest actively reheating', heater: 'ON', enabled: true, followsDecoction: false, mode: ProcessMode.HEATING, current: 54, target: 55, label: 'Heizung aktiv', flame: true},
        {name: 'blocked decoction return', heater: 'OFF', enabled: false, followsDecoction: true, mode: ProcessMode.HEATING, current: 54, target: 55, label: 'Heizung gesperrt', flame: false},
        {name: 'enabled decoction return', heater: 'OFF', enabled: true, followsDecoction: true, mode: ProcessMode.HEATING, current: 54, target: 55, label: 'Heizung bereit', flame: false},
    ] as const;

    it.each(cases)('derives flames and the user-facing status for $name', ({heater, enabled, followsDecoction, mode, current, target, label, flame}) => {
        const status = createBrewingStatus(ProcessState.ACTIVE);
        status.currentStep = {phase: ProcessPhase.RAST, mode};
        status.temperature = {current, target};
        status.hardware.heater = heater;
        status.heating = {followsDecoction, heaterEnabled: enabled};

        const {container} = renderProduction({brewingStatus: status});

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(container.querySelector('.flame-strip') !== null).toBe(flame);
        expect(screen.queryAllByLabelText('Heizflamme')).toHaveLength(flame ? 4 : 0);
    });

    it('does not infer an active flame from heating mode when hardware is off', () => {
        const status = createBrewingStatus(ProcessState.ACTIVE);
        status.currentStep.mode = ProcessMode.HEATING;
        status.hardware.heater = 'OFF';
        const {container} = renderProduction({brewingStatus: status});
        expect(container.querySelector('.flame-strip')).toBeNull();
    });
});

describe('Production layout structure', () => {
    it('renders the localized settings hierarchy', () => {
        renderProduction();

        expect(screen.getByRole('heading', {name: 'Einstellungen'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Rührwerk'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Intervallbetrieb'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Wasser'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Manuelle Wasserzufuhr'})).toBeInTheDocument();
    });

    it('groups manual water controls in an accent container above the recipe water buttons', () => {
        const {container} = renderProduction();
        const manualHeading = screen.getByRole('heading', {name: 'Manuelle Wasserzufuhr'});
        const manualControls = container.querySelector('.manualWaterSettings');
        const recipeControls = container.querySelector('.recipeWaterButtons');

        expect(manualControls).toHaveClass('intervalSettings');
        expect(manualControls).toContainElement(manualHeading);
        expect(manualControls).toContainElement(screen.getByText('Wasser aktivieren'));
        expect(manualControls).toContainElement(screen.getByText('Liter'));
        expect(container.querySelector('.waterSettingsSeparator')).not.toBeInTheDocument();
        expect(recipeControls).toContainElement(screen.getByRole('button', {name: /Nachguss/}));
        expect(recipeControls).toContainElement(screen.getByRole('button', {name: /Hauptguss/}));
        expect((manualControls as Node).compareDocumentPosition(recipeControls as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('keeps the main production regions in a shared structural grid', () => {
        const {container} = renderProduction();

        expect(container.querySelector('.containerProduction')).toBeInTheDocument();
        expect(container.querySelector('.Left')).toBeInTheDocument();
        expect(container.querySelector('.List')).toBeInTheDocument();
        expect(container.querySelector('.Meters')).toBeInTheDocument();
        expect(container.querySelector('.Settings')).toBeInTheDocument();
        expect(container.querySelector('.Info')).toBeInTheDocument();
        expect(container.querySelector('.Meters .Agitator')).toBeInTheDocument();
        expect(container.querySelector('.Meters .Temp')).toBeInTheDocument();
    });

    it('keeps both time panels reachable after the layout correction', () => {
        const brewingStatus = createBrewingStatus(ProcessState.ACTIVE);
        brewingStatus.currentStep.duration = 3600;

        renderProduction({brewingStatus});

        expect(screen.getByText('Laufzeit')).toBeInTheDocument();
        expect(screen.getByText('Zielzeit')).toBeInTheDocument();
    });
});

describe('Production vessel content mapping', () => {
    const makePhaseStatus = (aPhase: ProcessPhase, aWaitingFor = WaitingFor.NONE): BrewingStatus => {
        const status = createBrewingStatus(ProcessState.ACTIVE);
        status.currentStep.phase = aPhase;
        status.waiting = {waitingFor: aWaitingFor, canConfirm: aWaitingFor !== WaitingFor.NONE};
        return status;
    };

    it('renders water before successful mashing-in and while waiting for mashing-in confirmation', () => {
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.NONE)}).container.querySelector('.water-gauge--water')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.MASHING_IN)}).container.querySelector('.water-gauge--water')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.MASHING_IN, WaitingFor.MASHING_IN_CONFIRMATION)}).container.querySelector('.water-gauge--water')).not.toBeNull();
    });

    it('renders mash during rests, mashing-out, and pending mashing-out confirmation', () => {
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.RAST)}).container.querySelector('.water-gauge--mash')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.MASHING_OUT)}).container.querySelector('.water-gauge--mash')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.MASHING_OUT, WaitingFor.MASHING_OUT_CONFIRMATION)}).container.querySelector('.water-gauge--mash')).not.toBeNull();
    });

    it('renders wort after mashing-out has been confirmed and the process moved on', () => {
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.COOKING)}).container.querySelector('.water-gauge--wort')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.COOLING)}).container.querySelector('.water-gauge--wort')).not.toBeNull();
        expect(renderProduction({brewingStatus: makePhaseStatus(ProcessPhase.FINISHED)}).container.querySelector('.water-gauge--wort')).not.toBeNull();
    });
});

describe('Production process overview countdown', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });


    const createProcessBeer = (): Beer => ({
        ...createBeer(),
        cookingTime: 60,
        cookingTemperatur: 99,
        fermentation: [
            {type: 'Einmaischen', temperature: 57},
            {type: 'Rast 1', temperature: 63, time: 1200},
            {type: 'Rast 2', temperature: 72, time: 1800},
            {type: 'Abmaischen', temperature: 78}
        ]
    });

    const createActiveTimedStatus = (remainingTime: number, index = 2): BrewingStatus => ({
        ...createBrewingStatus(ProcessState.ACTIVE),
        currentStep: {
            index,
            count: 4,
            phase: ProcessPhase.RAST,
            mode: ProcessMode.TIMER_RUNNING,
            name: 'Rast 1',
            duration: 1200,
            elapsedTime: 1200 - remainingTime,
            remainingTime
        },
        temperature: {target: 63},
        waiting: {waitingFor: WaitingFor.NONE, canConfirm: false}
    });

    it('counts the remaining time down locally between controller status updates', () => {
        renderProduction({selectedBeer: createProcessBeer(), brewingStatus: createActiveTimedStatus(120)});

        expect(screen.getByText('00:02:00')).toBeInTheDocument();
        jest.advanceTimersByTime(1000);
        expect(screen.getByText('00:01:59')).toBeInTheDocument();
    });

    it('never displays a negative remaining time', () => {
        renderProduction({selectedBeer: createProcessBeer(), brewingStatus: createActiveTimedStatus(0)});

        expect(screen.getByText('00:00:00')).toBeInTheDocument();
        jest.advanceTimersByTime(2000);
        expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });

    it('resynchronizes the countdown when a new controller status arrives', () => {
        const {rerender, props} = renderProduction({selectedBeer: createProcessBeer(), brewingStatus: createActiveTimedStatus(120)});
        jest.advanceTimersByTime(1000);
        expect(screen.getByText('00:01:59')).toBeInTheDocument();

        rerender(<Production {...props} brewingStatus={createActiveTimedStatus(90)} />);
        expect(screen.getByText('00:01:30')).toBeInTheDocument();
    });

    it('updates the active process card and remaining list on step changes', () => {
        const {rerender, props} = renderProduction({selectedBeer: createProcessBeer(), brewingStatus: createActiveTimedStatus(120, 2)});
        expect(screen.getAllByText('Rast 1').length).toBeGreaterThan(0);
        expect(screen.getByText('4 / 11')).toBeInTheDocument();

        rerender(<Production {...props} brewingStatus={createActiveTimedStatus(600, 3)} />);
        expect(screen.getAllByText('Rast 2').length).toBeGreaterThan(0);
        expect(screen.getByText('6 / 11')).toBeInTheDocument();
    });

    it('leaves the lower info bar free of runtime and target time labels', () => {
        const {container} = renderProduction({selectedBeer: createProcessBeer(), brewingStatus: createActiveTimedStatus(120)});

        expect(container.querySelector('.Info--empty')).toBeInTheDocument();
        expect(screen.queryByText('Laufzeit')).not.toBeInTheDocument();
        expect(screen.queryByText('Zielzeit')).not.toBeInTheDocument();
    });
});
