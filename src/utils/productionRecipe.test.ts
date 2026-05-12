import { mapBeerToBrewingData } from './productionRecipe';
import { RestExecutionMode } from '../enums/eRestExecutionMode';
import { Beer } from '../model/Beer';

const makeBeer = (overrides?: Partial<Beer>): Beer => ({
  id: '1',
  name: 'Test',
  type: 'Ale',
  color: 'Amber',
  alcohol: 5,
  originalwort: 12,
  bitterness: 30,
  description: '',
  rating: 0,
  mashVolume: 10,
  spargeVolume: 5,
  cookingTime: 60,
  cookingTemperatur: 100,
  fermentation: [
    { type: 'Einmaischen', temperature: 52, time: 10 },
    { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
    { type: 'Dickmaische führen', temperature: 66, time: 0, executionMode: RestExecutionMode.CONFIRMATION_HOLD },
    { type: 'Abmaischen', temperature: 78, time: 10 }
  ],
  malts: [],
  wortBoiling: { totalTime: 60, hops: [] },
  fermentationMaturation: { fermentationTemperature: 18, carbonation: 2.5, yeast: [] },
  ...overrides,
});

describe('productionRecipe mapping', () => {
  it('keeps executionMode in /Recipe/ payload and strips time for CONFIRMATION_HOLD', () => {
    const result = mapBeerToBrewingData(makeBeer());

    expect(result.ok).toBe(true);
    const decoction = result.brewingData?.Rasten.find((s) => s.type === 'Dickmaische führen');
    expect(decoction).toEqual(expect.objectContaining({ executionMode: RestExecutionMode.CONFIRMATION_HOLD }));
    expect(decoction).not.toHaveProperty('time');
  });

  it('normalizes missing executionMode to TIMED for production payload', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 10 },
      { type: 'Rast 1', temperature: 64, time: 40 },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(true);
    const rest = result.brewingData?.Rasten.find((s) => s.type === 'Rast 1');
    expect(rest).toEqual(expect.objectContaining({ executionMode: RestExecutionMode.TIMED, time: 40 }));
  });

  it('blocks TIMED rest with missing/invalid time before sending', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 10 },
      { type: 'Rast 1', temperature: 64, executionMode: RestExecutionMode.TIMED },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Zeitgesteuerte Rast');
  });

  it('allows Einmaischen with time=0 as fixed process step', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 0 },
      { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(true);
    const mashIn = result.brewingData?.Rasten.find((s) => s.type === 'Einmaischen');
    expect(mashIn).toEqual(expect.objectContaining({ executionMode: RestExecutionMode.TIMED, time: 0 }));
  });

  it('allows Einmaischen with missing time as fixed process step', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52 },
      { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(true);
    const mashIn = result.brewingData?.Rasten.find((s) => s.type === 'Einmaischen');
    expect(mashIn).toEqual(expect.objectContaining({ executionMode: RestExecutionMode.TIMED }));
    expect(mashIn?.time).toBeUndefined();
  });

  it('still fails when Einmaischen temperature is invalid', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 0 },
      { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Einmaischen/Abmaischen Temperatur fehlt oder ist ungültig');
  });


  it('keeps imported CONFIRMATION_HOLD without time through production mapping', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 10 },
      { type: 'Dickmaische führen', temperature: 66, executionMode: RestExecutionMode.CONFIRMATION_HOLD },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(true);
    const hold = result.brewingData?.Rasten.find((s) => s.type === 'Dickmaische führen');
    expect(hold).toEqual(expect.objectContaining({ executionMode: RestExecutionMode.CONFIRMATION_HOLD }));
    expect(hold).not.toHaveProperty('time');
  });

  it('does not infer CONFIRMATION_HOLD from time=0', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 10 },
      { type: 'Rast 1', temperature: 64, time: 0 },
      { type: 'Abmaischen', temperature: 78, time: 10 }
    ] }));

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Zeitgesteuerte Rast');
  });

  it('keeps Abmaischen legacy behavior unchanged (time is still required in TIMED flow)', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52 },
      { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
      { type: 'Abmaischen', temperature: 78, time: 0 }
    ] }));

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Zeitgesteuerte Rast "Abmaischen" benötigt Zeit > 0.');
  });
});
