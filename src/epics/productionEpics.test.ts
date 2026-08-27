import { Subject } from 'rxjs';
import { ProductionActions } from '../actions/actions';
import { BREWING_STATUS_REQUEST_TIMEOUT, confirmEpic$, mapControlSocketEvent, nextProcedureStepEpic$, sendBrewingDataEpic$, startPollingEpic$, startWaterFillingEpic$, WATER_FILLING_MAX_DURATION, WATER_STATUS_REQUEST_TIMEOUT } from './productionEpics';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import {BackendAvailable} from '../reducers/productionReducer';
import {BrewingData} from '../model/BrewingData';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ConfirmStates} from '../enums/eConfirmStates';

jest.mock('../repositorys/ProductionRepository', () => ({
  ProductionRepository: {
    fillWaterAutomatic: jest.fn(),
    getWaterStatus: jest.fn(),
    sendBrewingData: jest.fn(),
    startBrewing: jest.fn(),
    getBrewingStatus: jest.fn(),
    confirm: jest.fn(),
    nextProcedureStep: jest.fn(),
  },
}));

const mockedProductionRepository = ProductionRepository as jest.Mocked<typeof ProductionRepository>;

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const createDeferred = <TValue>(): { promise: Promise<TValue>; resolve: (aValue: TValue) => void; reject: (aError: Error) => void } => {
  let aResolve: (aValue: TValue) => void = () => undefined;
  let aReject: (aError: Error) => void = () => undefined;
  const aPromise = new Promise<TValue>((aPromiseResolve, aPromiseReject): void => {
    aResolve = aPromiseResolve;
    aReject = aPromiseReject;
  });
  return {promise: aPromise, resolve: aResolve, reject: aReject};
};

const createBrewingStatus = (aProcessState: ProcessState): BrewingStatus => ({
  elapsedTime: 1,
  currentTime: 1,
  process: {state: aProcessState},
  currentStep: {
    index: 1,
    phase: ProcessPhase.RAST,
    mode: ProcessMode.HEATING,
    name: 'Rast',
  },
  temperature: {
    current: 64,
    target: 65,
  },
  hardware: {},
  waiting: {
    waitingFor: WaitingFor.NONE,
    canConfirm: false,
  },
  error: {},
  alarms: [],
});

const createStatusResponse = (aProcessState: ProcessState): { available: BackendAvailable; brewingStatus: BrewingStatus } => ({
  available: {isBackenAvailable: true, statusText: ''},
  brewingStatus: createBrewingStatus(aProcessState),
});

const createBrewingData = (): BrewingData => ({
  MashdownTemperature: 76,
  MashupTemperature: 62,
  CookingTemperature: 99,
  CookingTime: 60,
  Rasten: [],
});

describe('confirmEpic$', () => {
  beforeEach(() => jest.clearAllMocks());

  it('emits success after a successful confirm request', async () => {
    mockedProductionRepository.confirm.mockResolvedValue(undefined);
    const action$ = new Subject<ProductionActions.Confirm>();
    const emitted: any[] = [];
    const subscription = confirmEpic$(action$).subscribe((action: any) => emitted.push(action));

    action$.next(ProductionActions.confirm(ConfirmStates.IODINE));
    await flushPromises();

    expect(emitted).toEqual([ProductionActions.confirmSuccess()]);
    subscription.unsubscribe();
  });

  it('emits failure and a visible error when the request fails', async () => {
    mockedProductionRepository.confirm.mockRejectedValue(new Error('HTTP 500'));
    const action$ = new Subject<ProductionActions.Confirm>();
    const emitted: any[] = [];
    const subscription = confirmEpic$(action$).subscribe((action: any) => emitted.push(action));

    action$.next(ProductionActions.confirm(ConfirmStates.IODINE));
    await flushPromises();

    expect(emitted[0]).toEqual(ProductionActions.confirmFailure('HTTP 500'));
    expect(emitted[1]).toMatchObject({type: 'ApplicationActions.OPEN_ERROR_DIALOG', payload: {open: true}});
    subscription.unsubscribe();
  });

  it('ignores parallel confirms and accepts a retry after failure', async () => {
    const first = createDeferred<void>();
    mockedProductionRepository.confirm
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    const action$ = new Subject<ProductionActions.Confirm>();
    const emitted: any[] = [];
    const subscription = confirmEpic$(action$).subscribe((action: any) => emitted.push(action));

    action$.next(ProductionActions.confirm(ConfirmStates.IODINE));
    action$.next(ProductionActions.confirm(ConfirmStates.IODINE));
    expect(mockedProductionRepository.confirm).toHaveBeenCalledTimes(1);

    first.reject(new Error('network unavailable'));
    await flushPromises();
    action$.next(ProductionActions.confirm(ConfirmStates.IODINE));
    await flushPromises();

    expect(mockedProductionRepository.confirm).toHaveBeenCalledTimes(2);
    expect(emitted).toContainEqual(ProductionActions.confirmFailure('network unavailable'));
    expect(emitted).toContainEqual(ProductionActions.confirmSuccess());
    subscription.unsubscribe();
  });
});

describe('nextProcedureStepEpic$', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows only one next-step request while the first is pending', async () => {
    const request = createDeferred<boolean>();
    mockedProductionRepository.nextProcedureStep.mockReturnValue(request.promise);
    const action$ = new Subject<ProductionActions.NextProcedureStep>();
    const emitted: ProductionActions.AllProductionActions[] = [];
    const subscription = nextProcedureStepEpic$(action$).subscribe((action: unknown) => emitted.push(action as ProductionActions.AllProductionActions));

    action$.next(ProductionActions.nextProcedureStep());
    action$.next(ProductionActions.nextProcedureStep());
    expect(mockedProductionRepository.nextProcedureStep).toHaveBeenCalledTimes(1);

    request.resolve(true);
    await flushPromises();
    expect(emitted).toEqual([ProductionActions.nextProcedureStepSuccess()]);
    subscription.unsubscribe();
  });
});

describe('sendBrewingDataEpic$ failures', () => {
  it('emits a visible lifecycle failure when recipe transfer fails', async () => {
    mockedProductionRepository.sendBrewingData.mockResolvedValue(false);
    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const emitted: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$).subscribe((action: unknown) => emitted.push(action as ProductionActions.AllProductionActions));
    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();
    expect(emitted).toEqual([ProductionActions.brewingStartFailure('Das Rezept konnte nicht an den Controller übertragen werden.')]);
    subscription.unsubscribe();
  });
});

it('maps the structured socket.io overheat event without JSON parsing', () => {
  expect(mapControlSocketEvent({event: 'overheat', data: {temperature: 101}})).toEqual(ProductionActions.overheatReceived({temperature: 101}));
  expect(mapControlSocketEvent({event: 'other', data: {}})).toBeUndefined();
});

describe('startWaterFillingEpic$', () => {
  beforeEach((): void => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('polls and dispatches every water status while water filling is still open', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus.mockResolvedValue({ filledLiters: 1, targetLiters: 24.8, openClose: true });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(3);
    expect(emittedActions).toEqual([
      ProductionActions.setWaterStatus({ filledLiters: 1, targetLiters: 24.8, openClose: true }),
      ProductionActions.setWaterStatus({ filledLiters: 1, targetLiters: 24.8, openClose: true }),
      ProductionActions.setWaterStatus({ filledLiters: 1, targetLiters: 24.8, openClose: true }),
    ]);

    subscription.unsubscribe();
  });

  it('does not start another water status request while the previous one is still running', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    const aDeferredStatus = createDeferred<{ filledLiters: number; targetLiters: number; openClose: boolean }>();
    mockedProductionRepository.getWaterStatus.mockReturnValue(aDeferredStatus.promise);

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const subscription = startWaterFillingEpic$(action$).subscribe();

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledWith(WATER_STATUS_REQUEST_TIMEOUT, true);

    aDeferredStatus.resolve({filledLiters: 1, targetLiters: 24.8, openClose: true});
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('dispatches the final closed water status before stopping polling', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus
      .mockResolvedValueOnce({ filledLiters: 1, targetLiters: 24.8, openClose: true })
      .mockResolvedValueOnce({ filledLiters: 10, targetLiters: 24.8, openClose: true })
      .mockResolvedValueOnce({ filledLiters: 24.8, targetLiters: 24.8, openClose: false });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    jest.advanceTimersByTime(3000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(3);
    expect(emittedActions).toEqual([
      ProductionActions.setWaterStatus({ filledLiters: 1, targetLiters: 24.8, openClose: true }),
      ProductionActions.setWaterStatus({ filledLiters: 10, targetLiters: 24.8, openClose: true }),
      ProductionActions.setWaterStatus({ filledLiters: 24.8, targetLiters: 24.8, openClose: false }),
    ]);

    subscription.unsubscribe();
  });

  it('dispatches a water filling failure when the maximum filling duration is exceeded', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus.mockResolvedValue({ filledLiters: 1, targetLiters: 24.8, openClose: true });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(WATER_FILLING_MAX_DURATION);
    await flushPromises();

    expect(emittedActions.at(-1)).toEqual(ProductionActions.startWaterFillingSuccess(false));
    subscription.unsubscribe();
  });
});


describe('startPollingEpic$', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('fetches status immediately and continues polling after START_POLLING', async (): Promise<void> => {
    mockedProductionRepository.getBrewingStatus.mockResolvedValue(createStatusResponse(ProcessState.ACTIVE));

    const action$ = new Subject<ProductionActions.AllProductionActions>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startPollingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.startPolling());
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledWith(BREWING_STATUS_REQUEST_TIMEOUT);

    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(2);
    expect(emittedActions).toEqual([
      ProductionActions.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE)),
      ProductionActions.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE)),
    ]);
    subscription.unsubscribe();
  });

  it('continues polling after a failed status request', async (): Promise<void> => {
    mockedProductionRepository.getBrewingStatus
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(createStatusResponse(ProcessState.ACTIVE));

    const action$ = new Subject<ProductionActions.AllProductionActions>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startPollingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.startPolling());
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(2);
    expect(emittedActions).toEqual([ProductionActions.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE))]);
    subscription.unsubscribe();
  });

  it('stops polling after STOP_POLLING', async (): Promise<void> => {
    mockedProductionRepository.getBrewingStatus.mockResolvedValue(createStatusResponse(ProcessState.ACTIVE));

    const action$ = new Subject<ProductionActions.AllProductionActions>();
    const subscription = startPollingEpic$(action$).subscribe();

    action$.next(ProductionActions.startPolling());
    await flushPromises();
    action$.next(ProductionActions.stopPolling());
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });
});

describe('sendBrewingDataEpic$', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedProductionRepository.sendBrewingData.mockResolvedValue(true);
    mockedProductionRepository.startBrewing.mockResolvedValue(true);
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('does not start another brewing status request while the previous one is still running', async (): Promise<void> => {
    const aDeferredStatus = createDeferred<{ available: BackendAvailable; brewingStatus: BrewingStatus }>();
    mockedProductionRepository.getBrewingStatus.mockReturnValue(aDeferredStatus.promise);

    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const subscription = sendBrewingDataEpic$(action$).subscribe();

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledWith(BREWING_STATUS_REQUEST_TIMEOUT);

    aDeferredStatus.resolve(createStatusResponse(ProcessState.ACTIVE));
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it.each([ProcessState.FINISHED, ProcessState.ABORTED, ProcessState.ERROR])('stops polling for terminal state %s', async (aTerminalState: ProcessState): Promise<void> => {
    mockedProductionRepository.getBrewingStatus.mockResolvedValue(createStatusResponse(aTerminalState));

    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    expect(emittedActions).toEqual([ProductionActions.setBrewingStatus(createBrewingStatus(aTerminalState))]);
    subscription.unsubscribe();
  });

  it('continues at the configured interval after a failed status request without increasing frequency', async (): Promise<void> => {
    mockedProductionRepository.getBrewingStatus
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(createStatusResponse(ProcessState.ACTIVE));

    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => {
      emittedActions.push(aAction);
    });

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(2);
    expect(emittedActions).toEqual([ProductionActions.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE))]);
    subscription.unsubscribe();
  });
});
