import { extractBeerErrorMessage, hasPersistedBeerId, isRequiredPositiveQuantity, resolveSubmittedBeer, toBeerCreatePayload } from './beerSubmission';
import { BeerDTO } from '../model/BeerDTO';

const makeBeer = (id: any): BeerDTO => ({
  id,
  name: 'Testbier',
  type: 'Pils',
  color: 'hell',
  alcohol: 5,
  originalwort: 12,
  bitterness: 30,
  description: '',
  rating: 0,
  mashVolume: 20,
  spargeVolume: 10,
  cookingTime: 60,
  cookingTemperatur: 99,
  fermentationSteps: [],
  malts: [{ id: '26', name: 'Pilsener Malz', quantity: 7 }],
  wortBoiling: { totalTime: 60, hops: [{ id: '10', name: 'Hallertau', quantity: 50, time: 60 }] },
  fermentationMaturation: { fermentationTemperature: 18, carbonation: 5, yeast: [{ id: '1', name: 'Ale', quantity: 1 }] },
  additionalIngredients: [{ id: 'a1', name: 'Orange', quantity: 2, unit: 'g', phase: 'BOIL' as any }],
});

describe('beer submission helpers', () => {
  it('treats empty, missing, and 0 ids as new recipes', () => {
    expect(hasPersistedBeerId(makeBeer(''))).toBe(false);
    expect(hasPersistedBeerId(makeBeer('0'))).toBe(false);
    expect(hasPersistedBeerId(makeBeer(null))).toBe(false);
    expect(hasPersistedBeerId(makeBeer(undefined))).toBe(false);
  });

  it('treats a non-empty backend id as an existing recipe', () => {
    expect(hasPersistedBeerId(makeBeer('a9fc1e36-db1b-41d4-a6ff-9a580209889e'))).toBe(true);
  });

  it('removes id from create payload', () => {
    expect(toBeerCreatePayload(makeBeer(''))).not.toHaveProperty('id');
    expect(toBeerCreatePayload(makeBeer('old-id'))).not.toHaveProperty('id');
  });

  it('uses the created backend id from a create response', () => {
    expect(resolveSubmittedBeer(makeBeer(''), { id: 'generated-id', beer: { id: 'generated-id' } }).id).toBe('generated-id');
  });

  it('keeps the update backend id from an update response', () => {
    expect(resolveSubmittedBeer(makeBeer('existing-id'), { id: 'existing-id', beer: { id: 'existing-id' } }).id).toBe('existing-id');
  });



  it('rejects missing and invalid ingredient quantities', () => {
    ['', 0, -1, 'abc', null, undefined].forEach((value) => {
      expect(isRequiredPositiveQuantity(value)).toBe(false);
    });
  });

  it('accepts positive numeric ingredient quantities and string form values', () => {
    expect(isRequiredPositiveQuantity(7)).toBe(true);
    expect(isRequiredPositiveQuantity('7')).toBe(true);
  });

  it('maps backend validation errors to a user-facing message', () => {
    const message = extractBeerErrorMessage({ response: { status: 400, data: { error: 'VALIDATION_ERROR', message: 'The beer recipe contains invalid data.', fields: [{ path: 'malts[0].quantity', message: 'quantity is required' }] } } }, 'fallback');
    expect(message).toContain('The beer recipe contains invalid data.');
    expect(message).toContain('malts[0].quantity: quantity is required');
  });

  it('maps missing update ids to a specific message', () => {
    expect(extractBeerErrorMessage({ response: { status: 404, data: { error: 'BEER_NOT_FOUND' } } }, 'fallback')).toBe('Das Rezept konnte nicht aktualisiert werden, da es nicht mehr existiert.');
  });
});
