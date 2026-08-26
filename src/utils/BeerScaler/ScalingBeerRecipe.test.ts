import {AdditionalIngredientPhase, Beer} from '../../model/Beer';
import {BeerRecipeScaler} from './ScalingBeerRecipe';

const recipe = (overrides: Partial<Beer> = {}): Beer => ({
    id: 'recipe-1', name: 'Test', type: 'Ale', color: '10', alcohol: 5,
    originalwort: 12, bitterness: 25, description: '', rating: 4,
    mashVolume: 20, spargeVolume: 10, cookingTime: 60, cookingTemperatur: 100,
    fermentation: [],
    malts: [{id: 'm1', name: 'Pilsner', description: '', EBC: 3, quantity: 6000}],
    wortBoiling: {totalTime: 60, hops: [{id: 'h1', name: 'Hopfen', description: '', alpha: 5, quantity: 60}]},
    fermentationMaturation: {fermentationTemperature: 20, carbonation: 5, yeast: [{id: 'y1', name: 'Hefe', description: '', EVG: '75', temperature: '20', type: 'Ale', quantity: 3}]},
    additionalIngredients: [{name: 'Zucker', quantity: 300, unit: 'g', phase: AdditionalIngredientPhase.BOIL}],
    ...overrides,
});

describe('BeerRecipeScaler', () => {
    it('uses the stored recipe volume and efficiency as independent references', () => {
        const scaled = BeerRecipeScaler.scale({
            beer: recipe({referenceVolume: 30, referenceBrewhouseEfficiency: 71}),
            volume: 60,
            brewhouseEfficiency: 80,
        });

        expect(scaled.malts[0].quantity).toBe(10650); // 6000 * (60 / 30) * (71 / 80)
        expect(scaled.wortBoiling.hops[0].quantity).toBe(120);
        expect(scaled.fermentationMaturation.yeast[0].quantity).toBe(6);
        expect(scaled.additionalIngredients?.[0].quantity).toBe(600);
        expect(scaled.plannedVolume).toBe(60);
        expect(scaled.plannedBrewhouseEfficiency).toBe(80);
    });

    it('keeps a compatible fallback only for legacy recipes without reference fields', () => {
        const scaled = BeerRecipeScaler.scale({beer: recipe(), volume: 20, brewhouseEfficiency: 52});
        expect(scaled.malts[0].quantity).toBe(12000);
        expect(BeerRecipeScaler.getReferenceVolume(recipe())).toBe(10);
    });

    it('uses legacy reference fallbacks while no recipe is loaded yet', () => {
        expect(BeerRecipeScaler.getReferenceVolume(undefined)).toBe(10);
        expect(BeerRecipeScaler.getReferenceEfficiency(undefined)).toBe(52);
    });
});
