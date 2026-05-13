import { Beer, FermentationSteps } from '../model/Beer';
import { BrewingData } from '../model/BrewingData';
import { RestExecutionMode } from '../enums/eRestExecutionMode';

const isValidTemperature = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const isValidTimedDuration = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;

export interface ProductionRecipeNormalizationResult {
  ok: boolean;
  brewingData?: BrewingData;
  fermentationSteps?: FermentationSteps[];
  error?: string;
}

export function normalizeFermentationStepsForProduction(steps: FermentationSteps[]): ProductionRecipeNormalizationResult {
  const normalized: FermentationSteps[] = [];
  const fixedProcessStepTypes = new Set(['Einmaischen', 'Abmaischen', 'Kochen']);

  for (const step of steps ?? []) {
    const executionMode = step.executionMode ?? RestExecutionMode.TIMED;

    if (!isValidTemperature(step.temperature)) {
      return { ok: false, error: `Ungültige Rasttemperatur bei Schritt "${step.type}".` };
    }

    // Wichtig: executionMode steuert die Logik. time=0 markiert NICHT CONFIRMATION_HOLD.
    if (executionMode === RestExecutionMode.CONFIRMATION_HOLD) {
      const { time, ...restWithoutTime } = step;
      normalized.push({ ...restWithoutTime, executionMode });
      continue;
    }

    // Ein-/Abmaischen/Kochen sind feste Prozessschritte über Top-Level-Felder und dürfen nicht als normale Rasten gesendet werden.
    if (fixedProcessStepTypes.has(step.type)) {
      continue;
    }

    if (!isValidTimedDuration(step.time)) {
      return { ok: false, error: `Zeitgesteuerte Rast "${step.type}" benötigt Zeit > 0.` };
    }

    normalized.push({
      ...step,
      executionMode,
      time: step.time
    });
  }

  return { ok: true, fermentationSteps: normalized };
}

export function mapBeerToBrewingData(beer: Beer): ProductionRecipeNormalizationResult {
  const ein = beer.fermentation.find(item => item.type === 'Einmaischen');
  const aus = beer.fermentation.find(item => item.type === 'Abmaischen');

  if (!ein || !aus || !isValidTemperature(ein.temperature) || !isValidTemperature(aus.temperature)) {
    return { ok: false, error: 'Einmaischen/Abmaischen Temperatur fehlt oder ist ungültig.' };
  }
  if (!isValidTimedDuration(beer.cookingTime)) {
    return { ok: false, error: 'Kochzeit fehlt oder ist ungültig.' };
  }
  if (!isValidTemperature(beer.cookingTemperatur)) {
    return { ok: false, error: 'Kochtemperatur fehlt oder ist ungültig.' };
  }

  const normalizedStepsResult = normalizeFermentationStepsForProduction(beer.fermentation);
  if (!normalizedStepsResult.ok) return normalizedStepsResult;

  return {
    ok: true,
    brewingData: {
      MashdownTemperature: aus.temperature,
      MashupTemperature: ein.temperature,
      CookingTemperature: beer.cookingTemperatur,
      CookingTime: beer.cookingTime,
      Rasten: normalizedStepsResult.fermentationSteps ?? []
    }
  };
}
