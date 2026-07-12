import { Subject } from 'rxjs';
import { ProductionActions } from '../actions/actions';
import { startWaterFillingEpic$ } from './productionEpics';
import { ProductionRepository } from '../repositorys/ProductionRepository';

jest.mock('../repositorys/ProductionRepository', () => ({
  ProductionRepository: {
    fillWaterAutomatic: jest.fn(),
    getWaterStatus: jest.fn(),
  },
}));

const mockedProductionRepository = ProductionRepository as jest.Mocked<typeof ProductionRepository>;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('startWaterFillingEpic$', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls and dispatches every water status while water filling is still open', async () => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus.mockResolvedValue({ liters: 1, openClose: true });

    const action$ = new Subject<any>();
    const emittedActions: any[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((action: any) => emittedActions.push(action));

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

  it('dispatches the final closed water status before stopping polling', async () => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus
      .mockResolvedValueOnce({ liters: 1, openClose: true })
      .mockResolvedValueOnce({ liters: 10, openClose: true })
      .mockResolvedValueOnce({ liters: 24.8, openClose: false });

    const action$ = new Subject<any>();
    const emittedActions: any[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((action: any) => emittedActions.push(action));

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

  it('dispatches a water filling failure and does not start polling when the fill command fails', async () => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(false);

    const action$ = new Subject<any>();
    const emittedActions: any[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((action: any) => emittedActions.push(action));

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(3000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).not.toHaveBeenCalled();
    expect(emittedActions).toEqual([ProductionActions.startWaterFillingSuccess(false)]);

    subscription.unsubscribe();
  });

  it('dispatches a water filling failure and stops when polling fails', async () => {
    mockedProductionRepository.fillWaterAutomatic.mockResolvedValue(true);
    mockedProductionRepository.getWaterStatus.mockRejectedValue(new Error('WaterStatus failed'));

    const action$ = new Subject<any>();
    const emittedActions: any[] = [];
    const subscription = startWaterFillingEpic$(action$).subscribe((action: any) => emittedActions.push(action));

    action$.next(ProductionActions.startWaterFilling(24.8));
    await flushPromises();
    jest.advanceTimersByTime(3000);
    await flushPromises();

    expect(mockedProductionRepository.getWaterStatus).toHaveBeenCalledTimes(1);
    expect(emittedActions).toEqual([ProductionActions.startWaterFillingSuccess(false)]);

    subscription.unsubscribe();
  });
});
