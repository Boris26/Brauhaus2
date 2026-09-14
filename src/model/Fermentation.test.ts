import {mapFermentationAction} from './Fermentation';

describe('mapFermentationAction', () => {
  it('normalizes BeerDataStore DUE to an actionable pending UI state', () => {
    const action = mapFermentationAction({
      actionId: 'action-1',
      sourceType: 'ADDITIONAL_INGREDIENT',
      name: 'Plato-gesteuerte Fermentationszutat',
      status: 'DUE',
      due: true,
    });

    expect(action.status).toBe('PENDING');
    expect(action.due).toBe(true);
  });

  it('keeps completed and skipped states unchanged', () => {
    expect(mapFermentationAction({actionId: 'completed', sourceType: 'DRY_HOP', status: 'COMPLETED'}).status).toBe('COMPLETED');
    expect(mapFermentationAction({actionId: 'skipped', sourceType: 'DRY_HOP', status: 'SKIPPED'}).status).toBe('SKIPPED');
  });
});
