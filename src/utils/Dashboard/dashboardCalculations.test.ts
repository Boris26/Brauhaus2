import { AdditionalIngredientPhase } from '../../model/Beer';
import { Beer } from '../../model/Beer';
import { FinishedBrew } from '../../model/FinishedBrew';
import { eBrewState } from '../../enums/eBrewState';
import { buildActiveBrewRows, calculateCareHints, calculateDashboardKpis, calculateIngredientSummary, calculateMonthlyStats } from './dashboardCalculations';

const makeBeer = (id: string, name: string): Beer => ({
  id,
  name,
  type: 'Pils',
  color: 'hell',
  alcohol: 5,
  originalwort: 12,
  bitterness: 30,
  description: '',
  rating: 4,
  mashVolume: 20,
  spargeVolume: 10,
  cookingTime: 60,
  cookingTemperatur: 99,
  fermentation: [],
  malts: [{ id: 'm1', name: 'Pilsner Malz', description: '', EBC: 4, quantity: 5000 }],
  wortBoiling: { totalTime: 60, hops: [{ id: 'h1', name: 'Hallertau', description: '', alpha: 4, quantity: 50, time: 60 }] },
  fermentationMaturation: { fermentationTemperature: 18, carbonation: 5, yeast: [
    { id: 'y1', name: 'US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 1 },
    { id: 'y2', name: 'US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 1 },
  ] },
  additionalIngredients: [{ id: 'a1', name: 'Koriander', quantity: 100, unit: 'g', phase: AdditionalIngredientPhase.BOIL }],
});

const makeBrew = (id: string, beerId: string | undefined, state: eBrewState, liters: number, startDate = '2026-07-01'): FinishedBrew => ({
  id,
  name: `Sud ${id}`,
  beer_id: beerId,
  startDate,
  liters,
  originalwort: 12,
  residual_extract: 3,
  note: '',
  active: state !== eBrewState.FINISHED,
  state,
});

describe('dashboard calculations', () => {
  it('calculates recipe, brew, liter and status KPIs without NaN', () => {
    const result = calculateDashboardKpis([makeBeer('b1', 'Pils')], [
      makeBrew('f1', 'b1', eBrewState.FERMENTATION, 20),
      makeBrew('f2', 'b1', eBrewState.MATURATION, Number.NaN),
      makeBrew('f3', 'b1', eBrewState.FINISHED, 10),
    ]);

    expect(result).toEqual({ recipeCount: 1, brewCount: 3, totalLiters: 30, activeBeerCount: 2, fermentationCount: 1, maturationCount: 1, finishedCount: 1 });
  });

  it('aggregates ingredients only for valid recipe links and separates additional ingredient units', () => {
    const beer = makeBeer('b1', 'Pils');
    const beerWithDifferentUnit = { ...makeBeer('b2', 'Weizen'), additionalIngredients: [{ id: 'a2', name: 'Koriander', quantity: 2, unit: 'Stück', phase: AdditionalIngredientPhase.BOIL }] };
    const result = calculateIngredientSummary([beer, beerWithDifferentUnit], [
      makeBrew('f1', 'b1', eBrewState.FINISHED, 20),
      makeBrew('f2', 'b1', eBrewState.FINISHED, 20),
      makeBrew('f3', 'b2', eBrewState.FINISHED, 20),
      makeBrew('f4', undefined, eBrewState.FINISHED, 20),
      makeBrew('f5', 'missing', eBrewState.FINISHED, 20),
    ]);

    expect(result.linkedBrewCount).toBe(3);
    expect(result.malts[0]).toMatchObject({ name: 'Pilsner Malz', quantity: 10000, brewCount: 2 });
    expect(result.hops[0]).toMatchObject({ name: 'Hallertau', quantity: 100, brewCount: 2 });
    expect(result.yeasts[0]).toMatchObject({ name: 'US-05', brewCount: 3, type: 'Obergärig' });
    expect(result.additionalIngredients).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Koriander', unit: 'g', quantity: 200 }),
      expect.objectContaining({ name: 'Koriander', unit: 'Stück', quantity: 2 }),
    ]));
  });

  it('groups monthly statistics chronologically and ignores invalid dates', () => {
    const result = calculateMonthlyStats([
      makeBrew('f2', 'b1', eBrewState.FINISHED, 10, '2026-02-01'),
      makeBrew('f1', 'b1', eBrewState.FINISHED, 20, '2026-01-15'),
      makeBrew('f3', 'b1', eBrewState.FINISHED, 5, 'ungültig'),
    ]);

    expect(result.map((item) => item.key)).toEqual(['2026-01', '2026-02']);
    expect(result[0]).toMatchObject({ brewCount: 1, liters: 20 });
  });

  it('builds care hints and active brew rows defensively', () => {
    const brews = [
      makeBrew('f1', 'b1', eBrewState.FERMENTATION, 0, 'bad-date'),
      { ...makeBrew('f2', undefined, eBrewState.MATURATION, 10), endDate: undefined, residual_extract: null },
    ];

    expect(calculateCareHints([makeBeer('b1', 'Pils')], brews)).toEqual({ missingLiters: 1, missingEndDate: 2, missingResidualExtract: 1, activeInvalidStartDate: 1, missingRecipeLink: 1 });
    expect(buildActiveBrewRows(brews, new Date('2026-07-22'))[0].daysSinceStartLabel).toBe('-');
  });
});
