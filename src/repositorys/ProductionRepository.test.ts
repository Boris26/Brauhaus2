import axios from 'axios';
import { ProductionRepository } from './ProductionRepository';
import { ConfirmStates } from '../enums/eConfirmStates';
import { MashAgitatorStates } from '../model/MashAgitator';
import { ToggleState } from '../enums/eToggleState';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProductionRepository API method/path usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ status: 200, data: 42, statusText: 'OK' } as any);
    mockedAxios.post.mockResolvedValue({ status: 200, data: {}, statusText: 'OK' } as any);
  });

  it('uses POST only for concrete confirm actions', async () => {
    await ProductionRepository.confirm(ConfirmStates.IODINE);

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Confirm/Iodine'));
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringContaining('/Confirm/Wait'));
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringContaining('/Confirm/'));
  });

  it('uses POST for decoction confirm action', async () => {
    await ProductionRepository.confirm(ConfirmStates.DECOCTION);
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Confirm/Decoction'));
  });

  it('uses POST for command-based state changes', async () => {
    await ProductionRepository.startBrewing();
    await ProductionRepository.fillWaterAutomatic(15);
    await ProductionRepository.setAgitatorSpeed(22);

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Command/StartBrewing:""'));
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Command/FillWaterAutomatic:15'));
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Command/Speed:22'));
  });

  it('keeps heater commands as no-value aliases', async () => {
    await ProductionRepository.toggleHeater(ToggleState.ON);
    await ProductionRepository.toggleHeater(ToggleState.OFF);

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Command/TurnOn'));
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/Command/TurnOff'));
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringContaining('/Command/TurnOn:""'));
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringContaining('/Command/TurnOff:""'));
  });

  it('uses POST /next for next procedure step', async () => {
    await ProductionRepository.nextProcedureStep();

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/next'));
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringContaining('/Command/next'));
  });

  it('keeps safe reads on GET', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { liters: 3, openClose: true }, statusText: 'OK' } as any);
    await ProductionRepository.getWaterStatus();
    await ProductionRepository.getBrewingStatus();
    await ProductionRepository.checkIsBackendAvailable();

    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/WaterStatus'));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/Status/'));
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/Available/'));
  });

  it('uses canonical GET /temperatur/<alter> for temperature reads', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: 67 } as any);

    const value = await ProductionRepository.getTemperature();

    expect(value).toBe(67);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/temperatur/0'));
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringContaining('/Command/Temperatur'));
  });

  it('keeps recipe submission as POST /Recipe/ and expects 201 success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 201 } as any);

    const result = await ProductionRepository.sendBrewingData({
      MashdownTemperature: 76,
      MashupTemperature: 52,
      CookingTemperature: 100,
      CookingTime: 60,
      Rasten: []
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/Recipe/'),
      expect.objectContaining({ CookingTime: 60 })
    );
    expect(result).toBe(true);
  });

  it('keeps executionMode in recipe payload', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 201 } as any);
    await ProductionRepository.sendBrewingData({
      MashdownTemperature: 76,
      MashupTemperature: 52,
      CookingTemperature: 100,
      CookingTime: 60,
      Rasten: [{ type: 'Dickmaische führen', temperature: 64, executionMode: 'CONFIRMATION_HOLD' as any }]
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/Recipe/'),
      expect.objectContaining({
        Rasten: expect.arrayContaining([
          expect.objectContaining({ executionMode: 'CONFIRMATION_HOLD' })
        ])
      })
    );
  });

  it('keeps agitator interval command as POST with JSON body', async () => {
    const state: MashAgitatorStates = {
      isTurnOn: true,
      rotationsPerMinute: 40,
      runningTime: 10,
      breakTime: 5,
      isIntervalTurnOn: true,
      isHeatingAndStirringTurnOn: false,
    };

    const result = await ProductionRepository.toggleAgitator(state);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/Command/AgitatorInterval:""'),
      state
    );
    expect(result).toBe(true);
  });

  it('normalizes unavailable WaterStatus responses to the safe default object', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: '', statusText: 'OK' } as any);
    await expect(ProductionRepository.getWaterStatus()).resolves.toEqual({ liters: 0, openClose: false });

    mockedAxios.get.mockRejectedValueOnce(new Error('offline'));
    await expect(ProductionRepository.getWaterStatus()).resolves.toEqual({ liters: 0, openClose: false });
  });
});
