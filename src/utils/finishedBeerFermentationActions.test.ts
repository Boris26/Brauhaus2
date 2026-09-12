import {AdditionalIngredientPhase, Beer} from '../model/Beer';
import {HopUsage} from '../enums/eHopUsage';
import {TimeUnit, TriggerType, TriggerUnit} from '../model/FermentationRecipeAction';
import {createFinishedBeerFermentationActions} from './finishedBeerFermentationActions';

const scaledBeer = (): Beer => ({
  id: 'beer-1', name: 'IPA', type: '', color: '', alcohol: 0, originalwort: 0,
  bitterness: 0, description: '', rating: 0, mashVolume: 0, spargeVolume: 0,
  plannedVolume: 30, cookingTime: 60, cookingTemperatur: 100, fermentation: [], malts: [],
  fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: []},
  wortBoiling: {totalTime: 60, hops: [
    {id: 'hop-time', recipeRelationId: 'hop-rel', quantity: 30, usage: HopUsage.DRY_HOP, triggerType: TriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: TriggerUnit.DAYS, contactTime: 72, contactTimeUnit: TimeUnit.HOURS},
    {id: 'hop-plato', quantity: 15, usage: HopUsage.DRY_HOP, triggerType: TriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: TriggerUnit.PLATO},
    {id: 'boil', quantity: 20, usage: HopUsage.BOIL, additionTime: 10},
  ]},
  additionalIngredients: [
    {id: 'oak', recipeRelationId: 'oak-rel', quantity: 3, unit: 'PIECES', phase: AdditionalIngredientPhase.FERMENTATION, triggerType: TriggerType.MANUAL, triggerValue: null, triggerUnit: null},
    {id: 'salt', quantity: 2, unit: 'GRAMS', phase: AdditionalIngredientPhase.MASH, triggerType: TriggerType.MANUAL},
  ],
});

describe('createFinishedBeerFermentationActions', () => {
  it('snapshots dry hops and fermentation ingredients with exact trigger/contact metadata', () => {
    const actions = createFinishedBeerFermentationActions(scaledBeer(), [
      {id: 'hop-time', name: 'Citra'}, {id: 'hop-plato', name: 'Mosaic'},
    ], [{id: 'oak', name: 'Eichenholz'}]);

    expect(actions).toEqual([
      expect.objectContaining({sourceType: 'DRY_HOP', recipeRelationId: 'hop-rel', ingredientId: 'hop-time', name: 'Citra', amount: 30, unit: 'GRAMS', triggerType: TriggerType.TIME_OFFSET, triggerValue: 4, triggerUnit: TriggerUnit.DAYS, contactTime: 72, contactTimeUnit: TimeUnit.HOURS}),
      expect.objectContaining({sourceType: 'DRY_HOP', ingredientId: 'hop-plato', name: 'Mosaic', amount: 15, triggerType: TriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: TriggerUnit.PLATO}),
      expect.objectContaining({sourceType: 'ADDITIONAL_INGREDIENT', recipeRelationId: 'oak-rel', ingredientId: 'oak', name: 'Eichenholz', amount: 3, unit: 'PIECES', triggerType: TriggerType.MANUAL, triggerValue: null, triggerUnit: null}),
    ]);
  });

  it('uses already scaled quantities unchanged and does not apply the volume factor again', () => {
    const actions = createFinishedBeerFermentationActions(scaledBeer());
    expect(actions.map(action => action.amount)).toEqual([30, 15, 3]);
  });
});
