import { BehaviorSubject, Subject } from 'rxjs';
import { BeerActions, ProductionActions } from '../actions/actions';
import { BREWING_STATUS_REQUEST_TIMEOUT, confirmEpic$, discardBrewRecoveryEpic$, mapControlSocketEvent, nextProcedureStepEpic$, restoreBrewSessionEpic$, resumeBrewRecoveryEpic$, sendBrewingDataEpic$, startPollingEpic$, startWaterFillingEpic$, WATER_FILLING_MAX_DURATION, WATER_STATUS_REQUEST_TIMEOUT } from './productionEpics';
import { ProductionRepository } from '../repositorys/ProductionRepository';
import {BackendAvailable} from '../reducers/productionReducer';
import {BrewingData} from '../model/BrewingData';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from '../model/brewingStatus.types';
import {ConfirmStates} from '../enums/eConfirmStates';
import {BeerRepository} from '../repositorys/BeerRepository';
import {BeerRecipeScaler} from '../utils/BeerScaler/ScalingBeerRecipe';
import {initialBeerState, initialProductionState} from '../reducers/rootReducer';
import {Beer} from '../model/Beer';
import {dataCollector} from '../utils/DataCollector/dataCollector';

jest.mock('../repositorys/ProductionRepository', () => ({
  ProductionRepository: {
    fillWaterAutomatic: jest.fn(),
    getWaterStatus: jest.fn(),
    sendBrewingData: jest.fn(),
    startBrewing: jest.fn(),
    getBrewingStatus: jest.fn(),
    confirm: jest.fn(),
    nextProcedureStep: jest.fn(),
    getBrewSession: jest.fn(),
    resumeBrewRecovery: jest.fn(),
    discardBrewRecovery: jest.fn(),
  },
}));

jest.mock('../repositorys/BeerRepository', () => ({BeerRepository: {getBeers: jest.fn()}}));

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
  beerId: 'beer-1',
  plannedVolume: 20,
  plannedBrewhouseEfficiency: 60,
  MashdownTemperature: 76,
  MashupTemperature: 62,
  CookingTemperature: 99,
  CookingTime: 60,
  Rasten: [],
});

const baseBeer = (): Beer => ({
  id: 'beer-1', name: 'Test', type: 'Ale', color: 'gold', alcohol: 5,
  originalwort: 12, bitterness: 20, description: '', rating: 0,
  mashVolume: 10, spargeVolume: 10, referenceVolume: 10,
  referenceBrewhouseEfficiency: 52, cookingTime: 60, cookingTemperatur: 100,
  fermentation: [], malts: [], wortBoiling: {totalTime: 60, hops: []},
  fermentationMaturation: {fermentationTemperature: 20, carbonation: 5, yeast: []},
});

const restoreState = (beers: Beer[] | undefined, isPollingRunning = false): any => ({
  beerDataReducer: {...initialBeerState, beers},
  productionReducer: {...initialProductionState, isPollingRunning},
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
    const state$ = new BehaviorSubject(restoreState([]));
    const emitted: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$, state$).subscribe((action: unknown) => emitted.push(action as ProductionActions.AllProductionActions));
    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();
    expect(emitted).toEqual([ProductionActions.brewingStartFailure('Das Rezept konnte nicht an den Controller übertragen werden.')]);
    subscription.unsubscribe();
  });
});

describe('mapControlSocketEvent', () => {
  it('maps every Realtime State Contract v1 event without changing its snapshot', () => {
    const heating = {running: true};
    const agitator = {mode: 'AUTOMATIC' as const, paused: false, operation: 'INTERVAL' as const, intervalPhase: 'RUNNING', actualOutputOn: true, speedPercent: 42, runningMinutes: 3, breakMinutes: 2};
    const alarm = {alarms: [{type: 'EQUIPMENT_ALARM', active: true}]};
    const sensor = {current: 55.4, health: 'OK' as const, sensorId: '28-1'};
    const defaults = {speed: 75, intervalOnMinutes: 5, intervalOffMinutes: 2};
    expect(mapControlSocketEvent({event: 'heating-running-changed', data: heating})).toEqual(ProductionActions.heatingRunningChanged(heating));
    expect(mapControlSocketEvent({event: 'agitator-state-changed', data: agitator})).toEqual(ProductionActions.agitatorStateChanged(agitator));
    expect(mapControlSocketEvent({event: 'alarm-state-changed', data: alarm})).toEqual(ProductionActions.alarmStateChanged(alarm));
    expect(mapControlSocketEvent({event: 'temperature-sensor-state-changed', data: sensor})).toEqual(ProductionActions.temperatureSensorStateChanged(sensor));
    expect(mapControlSocketEvent({event: 'agitator-defaults-changed', data: defaults})).toEqual(ProductionActions.agitatorDefaultsChanged(defaults));
  });
  it('maps the structured socket.io overheat event without JSON parsing', () => {
    expect(mapControlSocketEvent({event: 'overheat', data: {temperature: 101}})).toEqual(ProductionActions.overheatReceived({temperature: 101}));
  });

  it('maps brew-session-running to its payload-free technical Redux signal', () => {
    expect(mapControlSocketEvent({event: 'brew-session-running'})).toEqual(ProductionActions.brewSessionRunningReceived());
  });

  it('maps recovery replacement snapshots and rejects malformed payloads visibly', () => {
    const active: any = {available: true, recovery: {version: 1, brewSession: {}, status: {}, updatedAt: 'now'}};
    expect(mapControlSocketEvent({event: 'brew-recovery-state-changed', data: active})).toEqual(ProductionActions.brewRecoveryStateChanged(active));
    expect(mapControlSocketEvent({event: 'brew-recovery-state-changed', data: {available: false, recovery: null}})).toEqual(ProductionActions.brewRecoveryStateChanged({available: false, recovery: null}));
    expect((mapControlSocketEvent({event: 'brew-recovery-state-changed', data: {}}) as any).payload.error).toMatch(/ungültige/);
  });

  it('maps socket connection changes without affecting existing control events', () => {
    expect(mapControlSocketEvent({event: 'connection-status', data: {connected: true, socketId: 'abc123'}}))
      .toEqual(ProductionActions.socketConnectionChanged(true, 'abc123'));
    expect(mapControlSocketEvent({event: 'connection-status', data: {connected: false}}))
      .toEqual(ProductionActions.socketConnectionChanged(false));
  });

  it('ignores unknown socket events', () => {
    expect(mapControlSocketEvent({event: 'other', data: {}})).toBeUndefined();
  });
});

describe('brew recovery command epics', () => {
  const mockedBeerRepository = BeerRepository as jest.Mocked<typeof BeerRepository>;
  const recoverableBeer = (): Beer => ({...baseBeer(), fermentation: [
    {type: 'Einmaischen', temperature: 52},
    {type: 'Maltoserast', temperature: 64, time: 20},
    {type: 'Abmaischen', temperature: 76},
  ] as any});
  const recoveryState = (beers?: Beer[]): any => ({
    ...restoreState(beers),
    productionReducer: {...initialProductionState, brewRecovery: {
      available: true, resumePending: false, discardPending: false, requestGeneration: 0,
      recovery: {version: 1, brewSession: {beerId: 'beer-1', plannedVolume: 25, plannedBrewhouseEfficiency: 70}, status: {}, updatedAt: '2026-01-01T00:00:00Z'},
    }},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedProductionRepository.resumeBrewRecovery.mockResolvedValue(undefined);
    mockedProductionRepository.discardBrewRecovery.mockResolvedValue(undefined);
  });

  it('uses loaded beer, scaling and mapped BrewingData without start, recipe POST or poll actions', async () => {
    const action$ = new Subject<any>();
    const emitted: any[] = [];
    const subscription = resumeBrewRecoveryEpic$(action$, new BehaviorSubject(recoveryState([recoverableBeer()]))).subscribe((action: any) => emitted.push(action));
    action$.next(ProductionActions.resumeBrewRecovery());
    await flushPromises();
    expect(mockedBeerRepository.getBeers).not.toHaveBeenCalled();
    expect(mockedProductionRepository.resumeBrewRecovery).toHaveBeenCalledWith(expect.objectContaining({beerId: 'beer-1', plannedVolume: 25, plannedBrewhouseEfficiency: 70, MashupTemperature: 52}));
    expect(emitted).toEqual([ProductionActions.resumeBrewRecoverySuccess(0)]);
    expect(emitted).not.toEqual(expect.arrayContaining([expect.objectContaining({type: ProductionActions.ActionTypes.SEND_BREWING_DATA}), ProductionActions.startPolling()]));
    expect(mockedProductionRepository.startBrewing).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('loads a missing Redux beer and reports unknown beer without sending resume', async () => {
    mockedBeerRepository.getBeers.mockResolvedValueOnce([recoverableBeer()]);
    const actions = new Subject<any>(); const emitted: any[] = [];
    const sub = resumeBrewRecoveryEpic$(actions, new BehaviorSubject(recoveryState(undefined))).subscribe((a: any) => emitted.push(a));
    actions.next(ProductionActions.resumeBrewRecovery()); await flushPromises();
    expect(emitted[0]).toEqual(BeerActions.getBeersSuccess([recoverableBeer()]));
    sub.unsubscribe();

    jest.clearAllMocks(); mockedBeerRepository.getBeers.mockResolvedValueOnce([]);
    const missingActions = new Subject<any>(); const missing: any[] = [];
    const missingSub = resumeBrewRecoveryEpic$(missingActions, new BehaviorSubject(recoveryState(undefined))).subscribe((a: any) => missing.push(a));
    missingActions.next(ProductionActions.resumeBrewRecovery()); await flushPromises();
    expect(missing[0].type).toBe(ProductionActions.ActionTypes.RESUME_BREW_RECOVERY_FAILURE);
    expect(mockedProductionRepository.resumeBrewRecovery).not.toHaveBeenCalled();
    missingSub.unsubscribe();
  });

  it('serializes resume and discard clicks and preserves recovery on failures', async () => {
    const deferred = createDeferred<void>(); mockedProductionRepository.resumeBrewRecovery.mockReturnValue(deferred.promise);
    const actions = new Subject<any>(); const emitted: any[] = [];
    const sub = resumeBrewRecoveryEpic$(actions, new BehaviorSubject(recoveryState([recoverableBeer()]))).subscribe((a: any) => emitted.push(a));
    actions.next(ProductionActions.resumeBrewRecovery()); actions.next(ProductionActions.resumeBrewRecovery());
    expect(mockedProductionRepository.resumeBrewRecovery).toHaveBeenCalledTimes(1);
    deferred.reject(new Error('HTTP 409')); await flushPromises();
    expect(emitted[0]).toEqual(ProductionActions.resumeBrewRecoveryFailure('HTTP 409', 0));
    sub.unsubscribe();

    const discardDeferred = createDeferred<void>(); mockedProductionRepository.discardBrewRecovery.mockReturnValue(discardDeferred.promise);
    const discardActions = new Subject<any>(); const discarded: any[] = [];
    const discardSub = discardBrewRecoveryEpic$(discardActions, new BehaviorSubject(recoveryState([recoverableBeer()]))).subscribe((a: any) => discarded.push(a));
    discardActions.next(ProductionActions.discardBrewRecovery()); discardActions.next(ProductionActions.discardBrewRecovery());
    expect(mockedProductionRepository.discardBrewRecovery).toHaveBeenCalledTimes(1);
    discardDeferred.reject(new Error('offline')); await flushPromises();
    expect(discarded).toEqual([ProductionActions.discardBrewRecoveryFailure('offline', 0)]);
    discardSub.unsubscribe();
  });
});

describe('restoreBrewSessionEpic$', () => {
  const mockedBeerRepository = BeerRepository as jest.Mocked<typeof BeerRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    dataCollector.reset();
    mockedProductionRepository.getBrewSession.mockResolvedValue({beerId: 'beer-1', plannedVolume: 20, plannedBrewhouseEfficiency: 60});
  });

  const runRestore = async (state: any): Promise<any[]> => {
    const action$ = new Subject<any>();
    const emitted: any[] = [];
    const subscription = restoreBrewSessionEpic$(action$, new BehaviorSubject(state)).subscribe((action: any) => emitted.push(action));
    action$.next(ProductionActions.brewSessionRunningReceived());
    await flushPromises();
    subscription.unsubscribe();
    return emitted;
  };

  it('uses a loaded beer, reconstructs it with BeerRecipeScaler and starts observation only', async () => {
    dataCollector.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE));
    const scale = jest.spyOn(BeerRecipeScaler, 'scale');
    const emitted = await runRestore(restoreState([baseBeer()]));

    expect(mockedProductionRepository.getBrewSession).toHaveBeenCalledTimes(1);
    expect(mockedBeerRepository.getBeers).not.toHaveBeenCalled();
    expect(scale).toHaveBeenCalledWith(expect.objectContaining({volume: 20, brewhouseEfficiency: 60}));
    expect(emitted[0]).toEqual(BeerActions.setSelectedBeer(expect.objectContaining({id: 'beer-1', plannedVolume: 20}) as any));
    expect(emitted[1]).toEqual(BeerActions.setBeerToBrew(expect.objectContaining({id: 'beer-1', plannedBrewhouseEfficiency: 60}) as any));
    expect(emitted[2]).toEqual(ProductionActions.startPolling());
    expect(dataCollector.getMeasurementCount()).toBe(0);
    expect(emitted).not.toEqual(expect.arrayContaining([expect.objectContaining({type: ProductionActions.ActionTypes.SEND_BREWING_DATA})]));
    scale.mockRestore();
  });

  it('loads beers through BeerRepository when the beer is not in state', async () => {
    mockedBeerRepository.getBeers.mockResolvedValue([baseBeer()]);
    const emitted = await runRestore(restoreState(undefined));
    expect(mockedBeerRepository.getBeers).toHaveBeenCalledTimes(1);
    expect(emitted[0]).toEqual(BeerActions.getBeersSuccess([baseBeer()]));
    expect(emitted).toContainEqual(ProductionActions.startPolling());
  });

  it('reports unknown beers and request or validation errors without polling', async () => {
    mockedBeerRepository.getBeers.mockResolvedValue([]);
    expect(await runRestore(restoreState(undefined))).not.toContainEqual(ProductionActions.startPolling());

    mockedProductionRepository.getBrewSession.mockRejectedValueOnce(new Error('HTTP 404'));
    expect(await runRestore(restoreState([baseBeer()]))).toEqual([expect.objectContaining({type: 'ApplicationActions.OPEN_ERROR_DIALOG'})]);

    mockedProductionRepository.getBrewSession.mockResolvedValueOnce({beerId: 'beer-1', plannedVolume: 0, plannedBrewhouseEfficiency: 60});
    expect(await runRestore(restoreState([baseBeer()]))).not.toContainEqual(ProductionActions.startPolling());
  });

  it('does not restart an already running poll', async () => {
    dataCollector.setBrewingStatus(createBrewingStatus(ProcessState.ACTIVE));
    const emitted = await runRestore(restoreState([baseBeer()], true));
    expect(emitted).not.toContainEqual(ProductionActions.startPolling());
    expect(emitted).toHaveLength(2);
    expect(dataCollector.getMeasurementCount()).toBe(1);
  });
});

describe('startWaterFillingEpic$', () => {
  beforeEach((): void => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  it('ignores a duplicate start command while the first fill lifecycle is pending', async (): Promise<void> => {
    const fillRequest = createDeferred<boolean>();
    mockedProductionRepository.fillWaterAutomatic.mockReturnValue(fillRequest.promise);
    const action$ = new Subject<ProductionActions.StartWaterFilling>();
    const subscription = startWaterFillingEpic$(action$).subscribe();

    action$.next(ProductionActions.startWaterFilling(20));
    action$.next(ProductionActions.startWaterFilling(30));

    expect(mockedProductionRepository.fillWaterAutomatic).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.fillWaterAutomatic).toHaveBeenCalledWith(20);

    fillRequest.resolve(false);
    await flushPromises();
    subscription.unsubscribe();
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

  it('ignores repeated START_POLLING while one loop is active', async (): Promise<void> => {
    mockedProductionRepository.getBrewingStatus.mockResolvedValue(createStatusResponse(ProcessState.ACTIVE));
    const action$ = new Subject<ProductionActions.AllProductionActions>();
    const subscription = startPollingEpic$(action$).subscribe();

    action$.next(ProductionActions.startPolling());
    action$.next(ProductionActions.startPolling());
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    await flushPromises();
    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it.each([ProcessState.FINISHED, ProcessState.ABORTED, ProcessState.ERROR])('stops for terminal process state %s', async (terminalState): Promise<void> => {
    mockedProductionRepository.getBrewingStatus.mockResolvedValue(createStatusResponse(terminalState));
    const action$ = new Subject<ProductionActions.AllProductionActions>();
    const subscription = startPollingEpic$(action$).subscribe();

    action$.next(ProductionActions.startPolling());
    await flushPromises();
    jest.advanceTimersByTime(5000);
    await flushPromises();

    expect(mockedProductionRepository.getBrewingStatus).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });
});

describe('sendBrewingDataEpic$', (): void => {
  beforeEach((): void => {
    jest.clearAllMocks();
    mockedProductionRepository.sendBrewingData.mockResolvedValue(true);
    mockedProductionRepository.startBrewing.mockResolvedValue(true);
  });

  const stateWithSocket = (connected: boolean, socketId?: string): any => ({
    beerDataReducer: initialBeerState,
    productionReducer: {
      ...initialProductionState,
      socketConnection: {connected, socketId},
    },
  });

  it('ignores a duplicate brew start while the first recipe transfer is pending', async (): Promise<void> => {
    const sendRequest = createDeferred<boolean>();
    mockedProductionRepository.sendBrewingData.mockReturnValue(sendRequest.promise);
    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const state$ = new BehaviorSubject(stateWithSocket(true, 'socket-123'));
    const subscription = sendBrewingDataEpic$(action$, state$).subscribe();

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    action$.next(ProductionActions.sendBrewingData(createBrewingData()));

    expect(mockedProductionRepository.sendBrewingData).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.startBrewing).not.toHaveBeenCalled();

    sendRequest.resolve(true);
    await flushPromises();
    expect(mockedProductionRepository.startBrewing).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('emits exactly one START_POLLING after a successful own brew start', async (): Promise<void> => {
    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const state$ = new BehaviorSubject(stateWithSocket(true, 'socket-123'));
    const emitted: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$, state$).subscribe((action: unknown) => emitted.push(action as ProductionActions.AllProductionActions));

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();

    expect(mockedProductionRepository.sendBrewingData).toHaveBeenCalledTimes(1);
    expect(mockedProductionRepository.startBrewing).toHaveBeenCalledWith('socket-123');
    expect(emitted).toEqual([ProductionActions.startPolling()]);
    expect(mockedProductionRepository.getBrewingStatus).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('omits the socket id and does not poll when StartBrewing fails', async (): Promise<void> => {
    mockedProductionRepository.startBrewing.mockResolvedValue(false);
    const action$ = new Subject<ProductionActions.SendBrewingData>();
    const state$ = new BehaviorSubject(stateWithSocket(false));
    const emitted: ProductionActions.AllProductionActions[] = [];
    const subscription = sendBrewingDataEpic$(action$, state$).subscribe((action: unknown) => emitted.push(action as ProductionActions.AllProductionActions));

    action$.next(ProductionActions.sendBrewingData(createBrewingData()));
    await flushPromises();

    expect(mockedProductionRepository.startBrewing).toHaveBeenCalledWith(undefined);
    expect(emitted).toEqual([ProductionActions.brewingStartFailure('Der Controller konnte den Brauvorgang nicht starten.')]);
    expect(mockedProductionRepository.getBrewingStatus).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
