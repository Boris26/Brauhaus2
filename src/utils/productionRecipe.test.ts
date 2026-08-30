import {mapBeerToBrewingData, normalizeFermentationStepsForProduction} from './productionRecipe';
import { RestExecutionMode } from '../enums/eRestExecutionMode';
import {ProcedureType} from '../enums/eProcedureType';
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
    { type: 'Einmaischen', temperature: 52, time: 0 },
    { type: 'Rast 1', temperature: 64, time: 40, executionMode: RestExecutionMode.TIMED },
    { type: 'Dickmaische führen', temperature: 66, executionMode: RestExecutionMode.CONFIRMATION_HOLD },
    { type: 'Kochen', temperature: 100, time: 60 },
    { type: 'Abmaischen', temperature: 78, time: 0 }
  ],
  malts: [],
  wortBoiling: { totalTime: 60, hops: [] },
  fermentationMaturation: { fermentationTemperature: 18, carbonation: 2.5, yeast: [] },
  ...overrides,
});

describe('productionRecipe mapping', () => {
  it('filters fixed process steps from Rasten and keeps top-level mash/cooking fields', () => {
    const result = mapBeerToBrewingData(makeBeer());

    expect(result.ok).toBe(true);
    expect(result.brewingData?.MashupTemperature).toBe(52);
    expect(result.brewingData?.MashdownTemperature).toBe(78);
    expect(result.brewingData?.CookingTime).toBe(60);
    expect(result.brewingData?.CookingTemperature).toBe(100);

    const stepTypes = result.brewingData?.Rasten.map((step) => step.type) ?? [];
    expect(stepTypes).not.toContain('Einmaischen');
    expect(stepTypes).not.toContain('Abmaischen');
    expect(stepTypes).not.toContain('Kochen');
    expect(stepTypes.filter((type) => type === 'Einmaischen')).toHaveLength(0);
    expect(stepTypes.filter((type) => type === 'Abmaischen')).toHaveLength(0);
    expect(stepTypes.filter((type) => type === 'Kochen')).toHaveLength(0);
  });

  it('adds the persisted beer identity and exact planned scaling to the controller payload', () => {
    const result = mapBeerToBrewingData(makeBeer({
      id: 'stored-beer-id',
      plannedVolume: 27.5,
      plannedBrewhouseEfficiency: 64,
    }));

    expect(result.brewingData).toMatchObject({
      beerId: 'stored-beer-id',
      plannedVolume: 27.5,
      plannedBrewhouseEfficiency: 64,
    });
  });

  it('keeps real timed rests with executionMode TIMED and requires time > 0', () => {
    const validResult = mapBeerToBrewingData(makeBeer({
      fermentation: [
        { type: 'Einmaischen', temperature: 52, time: 0 },
        { type: 'Rast 2', temperature: 67, time: 20, executionMode: RestExecutionMode.TIMED },
        { type: 'Abmaischen', temperature: 78, time: 0 }
      ]
    }));

    expect(validResult.ok).toBe(true);
    expect(validResult.brewingData?.Rasten).toEqual([
      expect.objectContaining({ type: 'Rast 2', executionMode: RestExecutionMode.TIMED, time: 20 })
    ]);

    const invalidResult = mapBeerToBrewingData(makeBeer({
      fermentation: [
        { type: 'Einmaischen', temperature: 52, time: 0 },
        { type: 'Rast 2', temperature: 67, time: 0, executionMode: RestExecutionMode.TIMED },
        { type: 'Abmaischen', temperature: 78, time: 0 }
      ]
    }));

    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.error).toContain('Zeitgesteuerte Rast');
  });

  it('keeps CONFIRMATION_HOLD steps in Rasten without requiring time', () => {
    const result = mapBeerToBrewingData(makeBeer({ fermentation: [
      { type: 'Einmaischen', temperature: 52, time: 0 },
      { type: 'Rast 1', temperature: 64, time: 10 },
      { type: 'Dickmaische führen', temperature: 66, executionMode: RestExecutionMode.CONFIRMATION_HOLD },
      { type: 'Abmaischen', temperature: 78, time: 0 }
    ] }));

    expect(result.ok).toBe(true);
    expect(result.brewingData?.Rasten).toEqual([
      expect.objectContaining({ type: 'Rast 1', procedureType: ProcedureType.RAST }),
      expect.objectContaining({ type: 'Dickmaische führen', executionMode: RestExecutionMode.CONFIRMATION_HOLD })
    ]);
    expect(result.brewingData?.Rasten[1]).not.toHaveProperty('time');
    expect(result.brewingData?.Rasten[1]).toMatchObject({
      procedureType: ProcedureType.DECOCTION,
      executionMode: RestExecutionMode.CONFIRMATION_HOLD
    });
  });

  it('serializes normal rests with an explicit RAST procedure type', () => {
    const result = normalizeFermentationStepsForProduction([
      {type: 'Rast 1', temperature: 64, time: 20, executionMode: RestExecutionMode.TIMED}
    ]);

    expect(result.fermentationSteps).toEqual([
      expect.objectContaining({procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.TIMED})
    ]);
  });

  it('enforces confirmation hold for a newly classified decoction', () => {
    const result = normalizeFermentationStepsForProduction([
      {stepId: 'rast-id', type: 'Rast 1', temperature: 64, time: 10, procedureType: ProcedureType.RAST},
      {stepId: 'decoction-id', relatedRastId: 'rast-id', type: '1. Dekoktion', temperature: 67, procedureType: ProcedureType.DECOCTION}
    ]);

    expect(result.fermentationSteps?.[1]).toEqual(expect.objectContaining({stepId: 'decoction-id', relatedRastId: 'rast-id', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD}));
    expect(result.fermentationSteps?.[1]).not.toHaveProperty('time');
    expect(result.fermentationSteps?.[1]).not.toHaveProperty('temperature');
  });

  it('does not infer DECOCTION from an explicit confirmation-hold RAST', () => {
    const result = normalizeFermentationStepsForProduction([
      {type: 'Rast 1', temperature: 68, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.CONFIRMATION_HOLD}
    ]);
    expect(result.fermentationSteps?.[0]).toMatchObject({procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.CONFIRMATION_HOLD, temperature: 68});
    expect(result.fermentationSteps?.[0]).not.toHaveProperty('time');
  });

  it('uses 99 °C as fallback for missing or invalid cooking temperature only', () => {
    const missingCookingTemp = mapBeerToBrewingData(makeBeer({ cookingTemperatur: null as unknown as number }));
    expect(missingCookingTemp.ok).toBe(true);
    expect(missingCookingTemp.brewingData?.CookingTemperature).toBe(99);

    const invalidCookingTemp = mapBeerToBrewingData(makeBeer({ cookingTemperatur: 0 }));
    expect(invalidCookingTemp.ok).toBe(true);
    expect(invalidCookingTemp.brewingData?.CookingTemperature).toBe(99);

    const invalidCookingTime = mapBeerToBrewingData(makeBeer({ cookingTime: 0 }));
    expect(invalidCookingTime.ok).toBe(false);
    expect(invalidCookingTime.error).toContain('Kochzeit');
  });

  it('accepts the example contract shape with only real rests in Rasten', () => {
    const result = mapBeerToBrewingData(makeBeer({
      fermentation: [
        { type: 'Einmaischen', temperature: 48, time: 0, executionMode: RestExecutionMode.TIMED },
        { type: 'Rast1', temperature: 63, time: 40, executionMode: RestExecutionMode.TIMED },
        { type: 'Dickmaische', temperature: 68, executionMode: RestExecutionMode.CONFIRMATION_HOLD },
        { type: 'Abmaischen', temperature: 78, time: 0, executionMode: RestExecutionMode.TIMED }
      ],
      cookingTime: 70,
      cookingTemperatur: 100
    }));

    expect(result.ok).toBe(true);
    expect(result.brewingData).toMatchObject({
      MashupTemperature: 48,
      MashdownTemperature: 78,
      CookingTime: 70,
      CookingTemperature: 100,
      Rasten: [
        expect.objectContaining({ type: 'Rast1', temperature: 63, time: 40, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.TIMED }),
        expect.objectContaining({ type: 'Dickmaische', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD })
      ]
    });
    expect(result.brewingData?.Rasten[0].stepId).toBeTruthy();
    expect(result.brewingData?.Rasten[1].relatedRastId).toBe(result.brewingData?.Rasten[0].stepId);
  });
});
