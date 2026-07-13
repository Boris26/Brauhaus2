import { Subject } from 'rxjs';
import { ProductionActions } from '../actions/actions';
import { BREWING_STATUS_REQUEST_TIMEOUT, sendBrewingDataEpic$, startWaterFillingEpic$, WATER_FILLING_MAX_DURATION, WATER_STATUS_REQUEST_TIMEOUT } from './productionEpics';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import {BackendAvailable} from '../reducers/productionReducer';
import {BrewingData} from '../model/BrewingData';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';

jest.mock('../repositorys/ProductionRepository', () => ({
  ProductionRepository: {
    fillWaterAutomatic: jest.fn(),
    getWaterStatus: jest.fn(),
    sendBrewingData: jest.fn(),
    startBrewing: jest.fn(),
    getBrewingStatus: jest.fn(),
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
    mockedProductionRepository.getWaterStatus.mockResolvedValue({ liters: 1, openClose: true });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => emittedActions.push(aAction));

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(3);
    expect(emittedActions).toEqual([
      ProductionActions.setWaterStatus({ liters: 1, openClose: true }),
      ProductionActions.setWaterStatus({ liters: 1, openClose: true }),
      ProductionActions.setWaterStatus({ liters: 1, openClose: true }),
    ]);

    subscription.unsubscribe();
  });

  it('does not start another water status request while the previous one is still running', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    const aDeferredStatus = createDeferred<{ liters: number; openClose: boolean }>();
    mockedProductionRepository.getWaterStatus.mockReturnValue(aDeferredStatus.promise);

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const subscription = startWaterFillingEpic$(action$).subscribe();

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledWith(WATER_STATUS_REQUEST_TIMEOUT, true);

    aDeferredStatus.resolve({liters: 1, openClose: true});
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('dispatches the final closed water status before stopping polling', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus
      .mockResolvedValueOnce({ liters: 1, openClose: true })
      .mockResolvedValueOnce({ liters: 10, openClose: true })
      .mockResolvedValueOnce({ liters: 24.8, openClose: false });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => emittedActions.push(aAction));

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
      ProductionActions.setWaterStatus({ liters: 1, openClose: true }),
      ProductionActions.setWaterStatus({ liters: 10, openClose: true }),
      ProductionActions.setWaterStatus({ liters: 24.8, openClose: false }),
    ]);

    subscription.unsubscribe();
  });

  it('dispatches a water filling failure when the maximum filling duration is exceeded', async (): Promise<void> => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus.mockResolvedValue({ liters: 1, openClose: true });

    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const emittedActions: ProductionActions.AllProductionActions[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => emittedActions.push(aAction));

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(WATER_FILLING_MAX_DURATION);
    await flushPromises();

    expect(emittedActions.at(-1)).toEqual(ProductionActions.startWaterFillingSuccess(false));
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
    const subscription = sendBrewingDataEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => emittedActions.push(aAction));

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
    const subscription = sendBrewingDataEpic$(action$).subscribe((aAction: ProductionActions.AllProductionActions): void => emittedActions.push(aAction));

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
