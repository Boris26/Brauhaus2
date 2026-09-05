import {eBrewState} from '../enums/eBrewState';
import {canTransitionBrew, lifecycleErrorMessage, transitionFinishedBrew} from './brewLifecycle';

const brew: any = {id: 'brew-1', state: eBrewState.FERMENTATION, active: true};

it('defines only the normal fermentation lifecycle', () => {
  expect(canTransitionBrew(eBrewState.FERMENTATION, eBrewState.MATURATION)).toBe(true);
  expect(canTransitionBrew(eBrewState.FERMENTATION, eBrewState.FINISHED)).toBe(true);
  expect(canTransitionBrew(eBrewState.MATURATION, eBrewState.FINISHED)).toBe(true);
  expect(canTransitionBrew(eBrewState.FINISHED, eBrewState.FERMENTATION)).toBe(false);
});

it('finishes without changing measurements or recipe linkage', () => {
  const result = transitionFinishedBrew({...brew, beer_id: 'recipe-1', brewValues: '{"kept":true}'}, eBrewState.FINISHED);
  expect(result).toEqual(expect.objectContaining({state: eBrewState.FINISHED, active: false, beer_id: 'recipe-1', brewValues: '{"kept":true}'}));
});

it('explains backend transition conflicts', () => {
  expect(lifecycleErrorMessage({response: {status: 409, data: {code: 'INVALID_FINISHED_BEER_TRANSITION'}}})).toMatch(/nicht mehr zulässig/);
});
