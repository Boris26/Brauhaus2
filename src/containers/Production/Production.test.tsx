import React from 'react';
import {act, render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {AGITATOR_SPEED_DEBOUNCE_MS, Production} from './Production';
import {Beer} from '../../model/Beer';
import {ToggleState} from '../../enums/eToggleState';
import {AlarmType, BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../../model/brewingStatus.types';
import {ConfirmStates} from '../../enums/eConfirmStates';
import {dataCollector} from '../../utils/DataCollector/dataCollector';
import {ProductionRepository} from '../../repositorys/ProductionRepository';
import {AgitatorSettingsRepository} from '../../repositorys/AgitatorSettingsRepository';

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
    waiting: {waitingFor: WaitingFor.NONE, canConfirm: false},
    error: {},
});

const renderProduction = (aOverrides: Partial<React.ComponentProps<typeof Production>> = {}) => {
    const props: React.ComponentProps<typeof Production> = {
        selectedBeer: createBeer(),
        temperature: 20,
        currentAgitatorState: ToggleState.OFF,
        currentAgitatorSpeed: 5,
        agitatorSpeed: 5,
        agitatorIsRunning: ToggleState.OFF,
        toggleAgitator: jest.fn(),
        setAgitatorSpeed: jest.fn(),
        startWaterFilling: jest.fn(),
        isWaterFillingSuccessful: true,
        isToggleAgitatorSuccess: true,
        sendBrewingData: jest.fn(),
        brewingStatus: createBrewingStatus(),
        isPollingRunning: false,
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
        realtimeState: {alarms: [], alarmsReceived: true, temperatureSensor: {current: 55.4, health: 'OK', sensorId: '28-1'}},
        socketConnected: true,
        ...aOverrides
    };
    return {props, ...render(<Production {...props} />)};
};

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return {promise, resolve, reject};
};

describe('Production agitator controller integration', () => {
    const detail = {
        config: {mode: 'AUTOMATIC' as const, speedPercent: 36, runningMinutes: 2, breakMinutes: 7},
        inputs: {heatingActive: false},
        runtime: {paused: false, desiredOperation: 'INTERVAL' as const, actualOutputOn: false, intervalPhase: 'BREAK'}
    };

    beforeEach(() => {
        jest.spyOn(AgitatorSettingsRepository, 'get').mockResolvedValue({speed: 26, intervalOnMinutes: 2, intervalOffMinutes: 2});
        jest.spyOn(AgitatorSettingsRepository, 'update').mockResolvedValue({speed: 26, intervalOnMinutes: 2, intervalOffMinutes: 2});
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue(detail);
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockResolvedValue();
        jest.spyOn(ProductionRepository, 'pauseAgitator').mockResolvedValue();
        jest.spyOn(ProductionRepository, 'resumeAgitator').mockResolvedValue();
    });
    afterEach(() => jest.restoreAllMocks());

    it('maps AUTOMATIC detail state to the switches without a runtime status row', async () => {
        renderProduction();
        expect(await screen.findByText('Geschwindigkeit')).toBeInTheDocument();
        expect(screen.getByText('36 %')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).not.toBeChecked();
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toBeChecked();
        expect(screen.getAllByRole('switch', {name: 'Intervallbetrieb'})).toHaveLength(1);
        expect(screen.queryByText('Intervallbetrieb · Intervallpause')).not.toBeInTheDocument();
        expect(ProductionRepository.getAgitatorStatus).toHaveBeenCalledTimes(1);
        expect(AgitatorSettingsRepository.get).toHaveBeenCalledTimes(1);
        expect(AgitatorSettingsRepository.update).not.toHaveBeenCalled();
    });

    it('places one interval indicator between the interval header and time controls without inventing progress', async () => {
        const {container} = renderProduction();
        await screen.findByRole('switch', {name: 'Intervallbetrieb'});

        const header = container.querySelector('.agitatorAutomaticHeader') as HTMLElement;
        const progressRow = container.querySelector('.agitatorIntervalProgressRow') as HTMLElement;
        const timeControls = container.querySelector('.intervalTimeControls') as HTMLElement;
        expect(header).toContainElement(screen.getByRole('switch', {name: 'Intervallbetrieb'}));
        expect(header).not.toContainElement(screen.getByRole('progressbar', {name: 'Intervallfortschritt'}));
        expect(progressRow).toContainElement(screen.getByRole('progressbar', {name: 'Intervallfortschritt'}));
        expect(header.compareDocumentPosition(progressRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(progressRow.compareDocumentPosition(timeControls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getAllByRole('progressbar')).toHaveLength(1);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
        expect(screen.queryByText('Beim Heizen durchgehend, sonst im Intervall')).not.toBeInTheDocument();
    });

    it('uses controller-owned interval progress only while an interval phase is active', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByRole('progressbar');
        const runtime = {mode: 'AUTOMATIC' as const, paused: false, operation: 'INTERVAL' as const,
            intervalPhase: 'RUNNING', intervalProgressPercent: 48, actualOutputOn: true,
            speedPercent: 36, runningMinutes: 2, breakMinutes: 7};

        rerender(<Production {...props} realtimeState={{alarms: [], alarmsReceived: true, agitator: runtime}} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '48');

        rerender(<Production {...props} realtimeState={{alarms: [], alarmsReceived: true,
            agitator: {...runtime, operation: 'CONTINUOUS'}}} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

        rerender(<Production {...props} realtimeState={{alarms: [], alarmsReceived: true,
            agitator: {...runtime, paused: true}}} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('uses persistent defaults as the initial runtime config when no current agitator state is available', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockRejectedValue(new Error('no runtime state'));
        renderProduction();
        expect(await screen.findByText('26 %')).toBeInTheDocument();
        expect(within(screen.getByTestId('running-minutes-stepper')).getByText('2')).toBeInTheDocument();
        expect(within(screen.getByTestId('break-minutes-stepper')).getByText('2')).toBeInTheDocument();
        expect(AgitatorSettingsRepository.get).toHaveBeenCalledTimes(1);
        expect(AgitatorSettingsRepository.update).not.toHaveBeenCalled();
    });

    it('replaces inactive legacy status values with the current controller defaults', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue({
            ...detail,
            config: {mode: 'OFF', speedPercent: 20, runningMinutes: 1, breakMinutes: 5},
            runtime: {...detail.runtime, desiredOperation: 'STOPPED'},
        });
        renderProduction();
        expect(await screen.findByText('26 %')).toBeInTheDocument();
        expect(screen.getByLabelText('Laufzeit')).toHaveTextContent('2');
        expect(screen.getByLabelText('Pausenzeit')).toHaveTextContent('2');
        expect(AgitatorSettingsRepository.update).not.toHaveBeenCalled();
    });

    it('keeps the complete agitator UI visible and disabled when detail status is unavailable', async () => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockRejectedValue(new Error('offline'));
        jest.spyOn(AgitatorSettingsRepository, 'get').mockRejectedValue(new Error('offline'));
        renderProduction({isBackenAvailable: {isBackenAvailable: false, statusText: 'Offline'}});
        expect(await screen.findByText('Rührwerk-Konfiguration nicht verfügbar')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeDisabled();
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toBeDisabled();
        within(screen.getByTestId('running-minutes-stepper')).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
        within(screen.getByTestId('break-minutes-stepper')).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
        expect(screen.getByRole('slider')).toBeDisabled();
        expect(screen.getByText('Geschwindigkeit')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Rührwerk pausieren'})).toBeDisabled();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it.each([
        ['OFF', true],
        ['CONTINUOUS', false],
        ['AUTOMATIC', false],
    ] as const)('always renders the pause action in %s mode and disabled=%s', async (mode, disabled) => {
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockResolvedValue({
            ...detail,
            config: {...detail.config, mode},
            runtime: {...detail.runtime, desiredOperation: mode === 'OFF' ? 'STOPPED' : detail.runtime.desiredOperation},
        });
        renderProduction();

        const pauseButton = await screen.findByRole('button', {name: 'Rührwerk pausieren'});
        if (disabled) expect(pauseButton).toBeDisabled();
        else expect(pauseButton).toBeEnabled();
    });

    it('keeps the pause action mounted across mode and paused-state updates', async () => {
        const {props, rerender} = renderProduction();
        const pauseButton = await screen.findByRole('button', {name: 'Rührwerk pausieren'});

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {
            mode: 'OFF', paused: false, operation: 'STOPPED', actualOutputOn: false,
            speedPercent: 36, runningMinutes: 2, breakMinutes: 7,
        }}} />);
        expect(screen.getByRole('button', {name: 'Rührwerk pausieren'})).toBe(pauseButton);
        expect(pauseButton).toBeDisabled();

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {
            mode: 'CONTINUOUS', paused: false, operation: 'CONTINUOUS', actualOutputOn: true,
            speedPercent: 36, runningMinutes: 2, breakMinutes: 7,
        }}} />);
        expect(screen.getByRole('button', {name: 'Rührwerk pausieren'})).toBe(pauseButton);
        expect(pauseButton).toBeEnabled();

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {
            mode: 'AUTOMATIC', paused: true, operation: 'STOPPED', actualOutputOn: false,
            speedPercent: 36, runningMinutes: 2, breakMinutes: 7,
        }}} />);
        expect(screen.getByRole('button', {name: 'Rührwerk fortsetzen'})).toBe(pauseButton);
        expect(pauseButton).toBeEnabled();
        expect(screen.getByRole('progressbar', {name: 'Intervallfortschritt'})).toBeInTheDocument();
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
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toHaveProperty('checked', automatic);
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
        fireEvent.click(await screen.findByRole('switch', {name: 'Intervallbetrieb'}));
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 2, breakMinutes: 7}));
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
    });

    it('turns an active mode off without changing the remaining config', async () => {
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Intervallbetrieb'}));
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'OFF', speedPercent: 36, runningMinutes: 2, breakMinutes: 7}));
    });

    it('keeps agitator controls enabled and the optimistic mode visible while a config request is pending', async () => {
        let resolveConfig!: () => void;
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementation(() => new Promise<void>(resolve => { resolveConfig = resolve; }));
        renderProduction();
        fireEvent.click(await screen.findByRole('switch', {name: 'Durchgehend rühren'}));
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeEnabled();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeChecked();
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toBeEnabled();
        resolveConfig();
    });

    it('serializes rapid config changes and sends only the latest queued desired state', async () => {
        const first = deferred<void>();
        const second = deferred<void>();
        jest.spyOn(ProductionRepository, 'setAgitatorConfig')
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(() => second.promise);
        renderProduction();
        await screen.findByLabelText('Laufzeit');

        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);

        await act(async () => { first.resolve(); await first.promise; });
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(2);
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenLastCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 5, breakMinutes: 7});
        await act(async () => { second.resolve(); await second.promise; });
    });

    it('keeps the controlled repeat draft when a socket snapshot arrives during a pending config request', async () => {
        jest.useFakeTimers();
        const first = deferred<void>();
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementationOnce(() => first.promise).mockResolvedValue();
        const {props, rerender} = renderProduction();
        await act(async () => { await Promise.resolve(); });

        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment);
        act(() => jest.advanceTimersByTime(400));
        expect(screen.getByLabelText('Laufzeit')).toHaveTextContent('5');
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {
            mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', actualOutputOn: true,
            speedPercent: 41, runningMinutes: 4, breakMinutes: 8,
        }}} />);
        expect(screen.getByLabelText('Laufzeit')).toHaveTextContent('5');
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);

        fireEvent.pointerUp(increment);
        await act(async () => { first.resolve(); await first.promise; });
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(2);
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenLastCalledWith({
            mode: 'AUTOMATIC', speedPercent: 41, runningMinutes: 5, breakMinutes: 8,
        });
        jest.useRealTimers();
    });

    it('stops controlled auto-repeat on unmount while a config request is pending', async () => {
        jest.useFakeTimers();
        const request = deferred<void>();
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockReturnValue(request.promise);
        const {unmount} = renderProduction();
        await act(async () => { await Promise.resolve(); });

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Laufzeit erhöhen'}));
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
        unmount();
        act(() => jest.advanceTimersByTime(1000));
        await act(async () => { request.resolve(); await request.promise; });

        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });

    it('coalesces speed and interval edits behind an active request', async () => {
        jest.useFakeTimers();
        const first = deferred<void>();
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementationOnce(() => first.promise).mockResolvedValue();
        renderProduction();
        await act(async () => { await Promise.resolve(); });
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        fireEvent.change(screen.getByRole('slider'), {target: {value: '40'}});
        fireEvent.change(screen.getByRole('slider'), {target: {value: '44'}});
        act(() => jest.advanceTimersByTime(AGITATOR_SPEED_DEBOUNCE_MS));
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(1);
        await act(async () => { first.resolve(); await first.promise; });
        expect(ProductionRepository.setAgitatorConfig).toHaveBeenLastCalledWith({mode: 'AUTOMATIC', speedPercent: 44, runningMinutes: 3, breakMinutes: 7});
        jest.useRealTimers();
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

    it('keeps confirmed config when a realtime snapshot updates runtime only', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        rerender(<Production {...props} socketConnected={true} realtimeState={{alarms: [], alarmsReceived: true, agitator: {mode: 'AUTOMATIC', paused: true, operation: 'INTERVAL', intervalPhase: 'BREAK', actualOutputOn: false, speedPercent: 36, runningMinutes: 2, breakMinutes: 7}}} />);
        expect(await screen.findByText('36 %')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toBeChecked();
        expect(screen.getByRole('button', {name: 'Rührwerk fortsetzen'})).toBeInTheDocument();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it('does not let a late bootstrap REST response overwrite a newer socket snapshot', async () => {
        const status = deferred<typeof detail>();
        jest.spyOn(ProductionRepository, 'getAgitatorStatus').mockReturnValue(status.promise);
        const {props, rerender} = renderProduction();
        const socketAgitator = {mode: 'CONTINUOUS' as const, paused: true, operation: 'CONTINUOUS' as const, intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 51, runningMinutes: 4, breakMinutes: 9};
        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: socketAgitator}} />);
        expect(await screen.findByText('51 %')).toBeInTheDocument();
        await act(async () => { status.resolve(detail); await status.promise; });
        expect(screen.getByText('51 %')).toBeInTheDocument();
        expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).toBeChecked();
    });

    it('renders realtime multi-client mode changes without sending config', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        (ProductionRepository.setAgitatorConfig as jest.Mock).mockClear();
        rerender(<Production {...props} socketConnected={true} realtimeState={{alarms: [], alarmsReceived: true, agitator: {mode: 'CONTINUOUS', paused: false, operation: 'CONTINUOUS', intervalPhase: 'IDLE', actualOutputOn: true, speedPercent: 36, runningMinutes: 2, breakMinutes: 7}}} />);
        expect(await screen.findByRole('switch', {name: 'Durchgehend rühren'})).toBeChecked();
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).not.toBeChecked();
        rerender(<Production {...props} socketConnected={true} realtimeState={{alarms: [], alarmsReceived: true, agitator: {mode: 'OFF', paused: false, operation: 'STOPPED', intervalPhase: 'IDLE', actualOutputOn: false, speedPercent: 36, runningMinutes: 2, breakMinutes: 7}}} />);
        await waitFor(() => expect(screen.getByRole('switch', {name: 'Durchgehend rühren'})).not.toBeChecked());
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).not.toBeChecked();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
    });

    it('adopts config fields from the realtime snapshot', async () => {
        const {props, rerender} = renderProduction();
        await screen.findByText('36 %');
        rerender(<Production {...props} socketConnected={true} realtimeState={{alarms: [], alarmsReceived: true, agitator: {mode: 'AUTOMATIC', paused: false, operation: 'INTERVAL', intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 42, runningMinutes: 4, breakMinutes: 10}}} />);
        expect(await screen.findByText('42 %')).toBeInTheDocument();
        expect(within(screen.getByTestId('running-minutes-stepper')).getByText('4')).toBeInTheDocument();
        expect(within(screen.getByTestId('break-minutes-stepper')).getByText('10')).toBeInTheDocument();
    });

    it('keeps a speed draft through HTTP success and reconciles it only with the matching socket state', async () => {
        jest.useFakeTimers();
        const {props, rerender} = renderProduction();
        await act(async () => { await Promise.resolve(); });
        fireEvent.change(screen.getByRole('slider'), {target: {value: '42'}});
        expect(screen.getByText('42 %')).toBeInTheDocument();
        act(() => jest.advanceTimersByTime(AGITATOR_SPEED_DEBOUNCE_MS));
        await act(async () => { await Promise.resolve(); });
        expect(screen.getByText('42 %')).toBeInTheDocument();

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {...detail.config, paused: false, operation: 'INTERVAL', actualOutputOn: true, speedPercent: 36}}} />);
        expect(await screen.findByText('42 %')).toBeInTheDocument();
        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {...detail.config, paused: false, operation: 'INTERVAL', actualOutputOn: true, speedPercent: 42}}} />);
        expect(await screen.findByText('42 %')).toBeInTheDocument();
        jest.useRealTimers();
    });

    it.each([
        ['runningMinutes', 'Laufzeit', 'Laufzeit erhöhen', 3, 7],
        ['breakMinutes', 'Pausenzeit', 'Pausenzeit verringern', 2, 6],
    ] as const)('keeps the %s draft stable until an identical socket snapshot confirms it', async (_field, label, buttonName, runningMinutes, breakMinutes) => {
        const {props, rerender} = renderProduction();
        await screen.findByLabelText(label);
        const button = screen.getByRole('button', {name: buttonName});
        fireEvent.pointerDown(button);
        fireEvent.pointerUp(button);
        expect(screen.getByLabelText(label)).toHaveTextContent(String(label === 'Laufzeit' ? runningMinutes : breakMinutes));
        expect(button).toBeEnabled();

        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {...detail.config, paused: false, operation: 'INTERVAL', actualOutputOn: true}}} />);
        expect(await screen.findByLabelText(label)).toHaveTextContent(String(label === 'Laufzeit' ? runningMinutes : breakMinutes));
        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {...detail.config, paused: false, operation: 'INTERVAL', actualOutputOn: true, runningMinutes, breakMinutes}}} />);
        expect(await screen.findByLabelText(label)).toHaveTextContent(String(label === 'Laufzeit' ? runningMinutes : breakMinutes));
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

    it('treats pause HTTP success as an ACK and waits for socket confirmation', async () => {
        renderProduction();
        fireEvent.click(await screen.findByRole('button', {name: 'Rührwerk pausieren'}));
        await waitFor(() => expect(ProductionRepository.pauseAgitator).toHaveBeenCalledTimes(1));
        expect(screen.getByRole('switch', {name: 'Intervallbetrieb'})).toBeChecked();
        expect(ProductionRepository.setAgitatorConfig).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Rührwerk pausieren'})).toBeInTheDocument();
    });

    it('keeps socket pause state authoritative when it arrives before the HTTP ACK', async () => {
        const pause = deferred<void>();
        jest.spyOn(ProductionRepository, 'pauseAgitator').mockReturnValue(pause.promise);
        const {props, rerender} = renderProduction();
        fireEvent.click(await screen.findByRole('button', {name: 'Rührwerk pausieren'}));
        rerender(<Production {...props} realtimeState={{...props.realtimeState!, agitator: {...detail.config, paused: true, operation: 'STOPPED', actualOutputOn: false}}} />);
        expect(await screen.findByRole('button', {name: 'Rührwerk fortsetzen'})).toBeInTheDocument();
        await act(async () => { pause.resolve(); await pause.promise; });
        expect(screen.getByRole('button', {name: 'Rührwerk fortsetzen'})).toBeInTheDocument();
    });

    it('suppresses an old config error after a newer queued intent succeeds', async () => {
        const first = deferred<void>();
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockImplementationOnce(() => first.promise).mockResolvedValueOnce();
        renderProduction();
        await screen.findByLabelText('Laufzeit');
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        fireEvent.pointerDown(increment); fireEvent.pointerUp(increment);
        await act(async () => { first.reject(new Error('old failure')); try { await first.promise; } catch (_) {} });
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('uses controller minute values and sends the complete config when incrementing runtime', async () => {
        renderProduction();
        expect(await screen.findByLabelText('Laufzeit')).toHaveTextContent('2');
        expect(screen.getByLabelText('Pausenzeit')).toHaveTextContent('7');
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment);
        fireEvent.pointerUp(increment);
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 3, breakMinutes: 7}));
    });

    it('sends the complete config when decrementing break time', async () => {
        renderProduction();
        await screen.findByLabelText('Pausenzeit');
        const decrement = screen.getByRole('button', {name: 'Pausenzeit verringern'});
        fireEvent.pointerDown(decrement);
        fireEvent.pointerUp(decrement);
        await waitFor(() => expect(ProductionRepository.setAgitatorConfig).toHaveBeenCalledWith({mode: 'AUTOMATIC', speedPercent: 36, runningMinutes: 2, breakMinutes: 6}));
    });

    it('discards an interval draft after a failed config request', async () => {
        jest.spyOn(ProductionRepository, 'setAgitatorConfig').mockRejectedValue(new Error('failed'));
        renderProduction();
        await screen.findByLabelText('Laufzeit');
        const increment = screen.getByRole('button', {name: 'Laufzeit erhöhen'});
        fireEvent.pointerDown(increment);
        fireEvent.pointerUp(increment);
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
        const {props, rerender, finishedStatus} = openFinishDialog({addFinishedBrew});

        fireEvent.click(await screen.findByRole('button', {name: 'Sud speichern'}));
        fireEvent.click(screen.getByRole('button', {name: 'Sud speichern'}));
        expect(addFinishedBrew).toHaveBeenCalledTimes(1);
        const actualPayload = addFinishedBrew.mock.calls[0][0];

        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={true} pendingFinishedBrewPayload={actualPayload} />);
        expect(screen.getByRole('button', {name: 'Speichert …'})).toBeDisabled();
        expect(dataCollector.getMeasurementCount()).toBe(1);

        rerender(<Production {...props} brewingStatus={finishedStatus} isAddingFinishedBrew={false} pendingFinishedBrewPayload={undefined} />);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

    it('blocks startup safely until the first sensor snapshot arrives', () => {
        renderProduction({realtimeState: {alarms: [], alarmsReceived: false}});
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Temperatursensorstatus wird ermittelt');
        expect(screen.getByLabelText('Aktuelle Temperatur: -- °C')).toBeInTheDocument();
    });

    it.each([
        ['MISSING' as const, 'Temperatursensor nicht verfügbar'],
        ['INVALID_READING' as const, 'Ungültiger Temperaturwert'],
    ])('blocks startup for %s and explains the sensor problem', (health, message) => {
        const {props} = renderProduction({realtimeState: {alarms: [], alarmsReceived: true, temperatureSensor: {current: null, health, sensorId: '28-1'}}});
        fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang starten'}));
        expect(props.sendBrewingData).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent(message);
        expect(screen.getByLabelText('Aktuelle Temperatur: -- °C')).toBeInTheDocument();
        expect(screen.queryByLabelText('Aktuelle Temperatur: 0 °C')).not.toBeInTheDocument();
    });

    it('keeps a real zero valid and recovers immediately after a healthy snapshot', () => {
        const missing = {alarms: [], alarmsReceived: true, temperatureSensor: {current: null, health: 'MISSING' as const, sensorId: '28-1'}};
        const {rerender, props} = renderProduction({realtimeState: missing});
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        rerender(<Production {...props} realtimeState={{...missing, temperatureSensor: {current: 0, health: 'OK', sensorId: '28-1'}}} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Aktuelle Temperatur: 0 °C')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeEnabled();
        rerender(<Production {...props} realtimeState={{...missing, temperatureSensor: {current: 55.8, health: 'OK', sensorId: '28-1'}}} />);
        expect(screen.getByLabelText('Aktuelle Temperatur: 55,8 °C')).toBeInTheDocument();
    });

    it('does not start status polling when the desktop production view is mounted', () => {
        renderProduction({isPollingRunning: false});
        expect(Production.prototype.componentDidMount.toString()).not.toContain('startPolling');
    });

    it('keeps realtime heater feedback independent from stale process status', () => {
        const status = createBrewingStatus(ProcessState.ACTIVE);
        const {container} = renderProduction({brewingStatus: status, isBrewingStatusStale: true});
        expect(screen.getByRole('alert')).toHaveTextContent('Braustatus ist veraltet');
        expect(container.querySelector('.flame-strip')).not.toBeNull();
    });

    it('places the current step above the sole temperature gauge and keeps the process column focused on the upcoming flow', () => {
        const {container} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE)});
        const meters = container.querySelector('.meters') as HTMLElement;
        const processColumn = container.querySelector('.list') as HTMLElement;

        expect(meters.querySelector('.current-step-panel')).toBeInTheDocument();
        expect(meters.querySelector('.Temp')).toBeInTheDocument();
        expect(meters.querySelectorAll('.GaugeContainer')).toHaveLength(1);
        expect(meters.querySelector('[aria-label="Aktueller Prozessschritt"]')).toHaveTextContent('Brauprozess');
        expect(meters).toContainElement(screen.getByRole('button', {name: 'Brauvorgang starten'}));
        expect(container.querySelector('.settings')).not.toContainElement(screen.getByRole('button', {name: 'Brauvorgang starten'}));
        expect(processColumn).toHaveTextContent('Ablauf');
        expect(processColumn.querySelector('.current-process-step')).not.toBeInTheDocument();
        expect(container.querySelector('.Water')).toHaveTextContent('0,0 l');
    });

    it('keeps the start button enabled when no brew is running', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).not.toBeDisabled();
    });

    it('hides the start state and shows the existing active-step state while a brew is active', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: false});
        expect(screen.queryByRole('button', {name: 'Brauvorgang starten'})).not.toBeInTheDocument();
        expect(screen.getByText('Aktiver Schritt')).toBeInTheDocument();
        expect(screen.getAllByRole('button', {name: 'Brauvorgang starten'})).toHaveLength(0);
    });

    it('disables the start button while a start request is running', () => {
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: true});
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
    });

    it('sends the brewing data only once for fast repeated start clicks', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        const startButton = screen.getByRole('button', {name: 'Brauvorgang starten'});
        fireEvent.click(startButton);
        fireEvent.click(startButton);
        expect(props.sendBrewingData).toHaveBeenCalledTimes(1);
    });

    it('does not send another start request when a brew is already active', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: false});
        expect(screen.queryByRole('button', {name: 'Brauvorgang starten'})).not.toBeInTheDocument();
        expect(props.sendBrewingData).not.toHaveBeenCalled();
    });

    it('keeps the start state hidden for terminal processes and restores it when control returns to idle', () => {
        const {rerender, props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), isPollingRunning: true});
        expect(screen.queryByRole('button', {name: 'Brauvorgang starten'})).not.toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.FINISHED)} isPollingRunning={false} />);
        expect(screen.queryByRole('button', {name: 'Brauvorgang starten'})).not.toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.ABORTED)} isPollingRunning={false} />);
        expect(screen.queryByRole('button', {name: 'Brauvorgang starten'})).not.toBeInTheDocument();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).not.toBeDisabled();
    });


    it('enables the start button again after a failed start request without active control status', () => {
        const {rerender, props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang starten'}));
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={true} />);
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        rerender(<Production {...props} brewingStatus={createBrewingStatus(ProcessState.IDLE)} isPollingRunning={false} />);
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).not.toBeDisabled();
    });

    it('keeps the existing recipe transfer and start flow unchanged', () => {
        const {props} = renderProduction({brewingStatus: createBrewingStatus(ProcessState.IDLE), isPollingRunning: false});
        fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang starten'}));
        expect(props.sendBrewingData).toHaveBeenCalledTimes(1);
    });

    it('does not render a redundant manual polling button', () => {
        const {container} = renderProduction();
        expect(container.querySelector('.startPollingBtn')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Status aktualisieren')).not.toBeInTheDocument();
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

    it('reinitializes the hop plan and announced times when the selected recipe id changes', async () => {
        const recipeA = {...createBeer(18, 12, 'recipe-a'), wortBoiling: {totalTime: 60, hops: [{id: 'h1', name: 'Cascade', description: '', alpha: 5, quantity: 10, time: 60}]}};
        const recipeB = {...createBeer(18, 12, 'recipe-b'), wortBoiling: {totalTime: 60, hops: [{id: 'h2', name: 'Saaz', description: '', alpha: 4, quantity: 10, time: 59}]}};
        const cooking = createBrewingStatus(ProcessState.ACTIVE);
        cooking.currentStep = {index: 3, phase: ProcessPhase.COOKING, mode: ProcessMode.TIMER_RUNNING, elapsedTime: 61, duration: 3600};
        const {rerender, props} = renderProduction({selectedBeer: recipeA, brewingStatus: cooking});

        expect(await screen.findByLabelText('Hopfengabe')).toHaveTextContent('Cascade zugeben');
        rerender(<Production {...props} selectedBeer={recipeB} brewingStatus={cooking} />);

        expect(await screen.findByLabelText('Hopfengabe')).toHaveTextContent('Saaz zugeben');
        expect(screen.queryByText('Cascade zugeben')).not.toBeInTheDocument();
    });

    it('does not reinitialize hop reminders for a new object with the same recipe id', async () => {
        const recipe = {...createBeer(18, 12, 'recipe-a'), wortBoiling: {totalTime: 60, hops: [{id: 'h1', name: 'Cascade', description: '', alpha: 5, quantity: 10, time: 60}]}};
        const cooking = createBrewingStatus(ProcessState.ACTIVE);
        cooking.currentStep = {index: 3, phase: ProcessPhase.COOKING, mode: ProcessMode.TIMER_RUNNING, elapsedTime: 1, duration: 3600};
        const {rerender, props} = renderProduction({selectedBeer: recipe, brewingStatus: cooking});

        expect(await screen.findByLabelText('Hopfengabe')).toHaveTextContent('Cascade zugeben');
        fireEvent.click(screen.getByRole('button', {name: 'Erledigt'}));
        rerender(<Production {...props} selectedBeer={{...recipe}} brewingStatus={cooking} />);

        expect(screen.queryByLabelText('Hopfengabe')).not.toBeInTheDocument();
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
    const inactiveRealtime = {alarms: [], alarmsReceived: true};
    const activeRealtime = {alarms: [{type: AlarmType.EQUIPMENT_ALARM, active: true}], alarmsReceived: true};

    it('is absent without an alarm and visible immediately for an initially active alarm', () => {
        const {unmount} = renderProduction();
        expect(screen.queryByRole('dialog', {name: 'Anlagenalarm'})).not.toBeInTheDocument();
        unmount();
        renderProduction({brewingStatus: createBrewingStatus(ProcessState.ACTIVE), socketConnected: true, realtimeState: activeRealtime});
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
        expect(screen.getByText(/angeschlossene Anlagensteuerung meldet einen Fehler/)).toBeInTheDocument();
    });

    it('stays dismissed across active polls and reopens for a new alarm cycle', () => {
        const {rerender, props} = renderProduction({socketConnected: true, realtimeState: inactiveRealtime});
        rerender(<Production {...props} socketConnected={true} realtimeState={activeRealtime} />);
        fireEvent.click(screen.getByRole('button', {name: 'Schließen'}));
        rerender(<Production {...props} socketConnected={true} realtimeState={{...activeRealtime}} />);
        expect(screen.queryByRole('dialog', {name: 'Anlagenalarm'})).not.toBeInTheDocument();
        rerender(<Production {...props} socketConnected={true} realtimeState={inactiveRealtime} />);
        rerender(<Production {...props} socketConnected={true} realtimeState={activeRealtime} />);
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
    });

    it('closes automatically without user action when the alarm ends', () => {
        const {rerender, props} = renderProduction({socketConnected: true, realtimeState: activeRealtime});
        expect(screen.getByRole('dialog', {name: 'Anlagenalarm'})).toBeInTheDocument();
        rerender(<Production {...props} socketConnected={true} realtimeState={inactiveRealtime} />);
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

    it('keeps only one water failure timeout across repeated updates and clears it after execution', () => {
        jest.useFakeTimers();
        const failure = jest.spyOn(Production.prototype, 'failActiveRecipeWaterFill');
        const {container, rerender, props, unmount} = renderProduction();
        fireEvent.click(container.querySelector('.settingsRowWater input') as HTMLInputElement);

        rerender(<Production {...props} isWaterFillingSuccessful={false} />);
        rerender(<Production {...props} isWaterFillingSuccessful={false} brewingStatus={{...props.brewingStatus!, elapsedTime: 1}} />);
        rerender(<Production {...props} isWaterFillingSuccessful={false} brewingStatus={{...props.brewingStatus!, elapsedTime: 2}}
                             realtimeState={{...props.realtimeState!, agitator: {
                                 mode: 'CONTINUOUS', paused: false, operation: 'CONTINUOUS', actualOutputOn: true,
                                 speedPercent: 40, runningMinutes: 3, breakMinutes: 8,
                             }}} />);
        act(() => jest.advanceTimersByTime(300));
        expect(failure).toHaveBeenCalledTimes(1);

        act(() => jest.advanceTimersByTime(300));
        expect(failure).toHaveBeenCalledTimes(1);
        unmount();
        failure.mockRestore();
        jest.useRealTimers();
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
        fireEvent.click(screen.getByRole('button', {name: 'Brauvorgang starten'}));
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
        expect(screen.getByRole('button', {name: 'Brauvorgang starten'})).toBeDisabled();
        expect(screen.getByRole('button', {name: /Nachguss/})).toBeDisabled();
        expect(screen.getByRole('button', {name: /Hauptguss/})).toBeDisabled();
        expect(container.querySelectorAll('.Settings .quantity-picker-content button:not(:disabled)')).toHaveLength(0);
    });
});


describe('Production flame display', () => {
    it('shows accessible flames only for a connected running heater snapshot', () => {
        const {container} = renderProduction({socketConnected: true, realtimeState: {heatingRunning: true, alarms: [], alarmsReceived: true}});

        expect(container.querySelector('.flame-strip')).toHaveAttribute('aria-label', 'Heizung aktiv');
        expect(screen.queryAllByLabelText('Heizflamme')).toHaveLength(4);
        expect(screen.queryByText('Heizung aktiv')).not.toBeInTheDocument();
        expect(screen.queryByText('Heizung bereit')).not.toBeInTheDocument();
        expect(screen.queryByText('Heizung gesperrt')).not.toBeInTheDocument();
    });

    it('does not show flames when the connected controller reports running false', () => {
        const {container} = renderProduction({socketConnected: true, realtimeState: {heatingRunning: false, alarms: [], alarmsReceived: true}});
        expect(container.querySelector('.flame-strip')).toBeNull();
    });

    it('does not show a stale active snapshot after socket disconnect', () => {
        const {container, rerender, props} = renderProduction({socketConnected: true, realtimeState: {heatingRunning: true, alarms: [], alarmsReceived: true}});
        expect(container.querySelector('.flame-strip')).not.toBeNull();

        rerender(<Production {...props} socketConnected={false} />);
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
