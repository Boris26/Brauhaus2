import { Beer } from '../../model/Beer';
import { FinishedBrew } from '../../model/FinishedBrew';
import { eBrewState, BrewStateGerman } from '../../enums/eBrewState';
import { DashboardActiveBrewRow, DashboardAdditionalStats, DashboardCareHints, DashboardConsumption, DashboardIngredientSummary, DashboardIngredientUsage, DashboardKpis, DashboardMonthlyStat, DashboardRecipeHistory, DashboardYeastUsage } from './dashboardTypes';

const TOP_LIMIT = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const safeNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());

const parseDate = (value: Date | string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return isValidDate(date) ? date : undefined;
};

export const formatDateGerman = (value: Date | string | undefined): string => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('de-DE') : '-';
};

export const calculateDaysSinceStart = (value: Date | string | undefined, now = new Date()): number | undefined => {
  const date = parseDate(value);
  if (!date) return undefined;
  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.floor((nowDay - startDay) / MS_PER_DAY));
};

const formatQuantity = (value: number): string => Number.isInteger(value) ? String(value) : value.toLocaleString('de-DE', { maximumFractionDigits: 2 });

export const calculateDashboardKpis = (beers: Beer[] = [], brews: FinishedBrew[] = []): DashboardKpis => ({
  recipeCount: beers.length,
  brewCount: brews.length,
  totalLiters: brews.reduce((sum, brew) => sum + Math.max(0, safeNumber(brew.liters)), 0),
  activeBeerCount: brews.filter((brew) => brew.state === eBrewState.FERMENTATION || brew.state === eBrewState.MATURATION).length,
  fermentationCount: brews.filter((brew) => brew.state === eBrewState.FERMENTATION).length,
  maturationCount: brews.filter((brew) => brew.state === eBrewState.MATURATION).length,
  finishedCount: brews.filter((brew) => brew.state === eBrewState.FINISHED).length,
});

interface UsageWithIds extends DashboardIngredientUsage { brewCountIds: Set<string>; }

const addIngredientUsage = (map: Map<string, UsageWithIds>, name: string | undefined, quantity: unknown, brewId: string, unit?: string): void => {
  const cleanedName = name?.trim();
  if (!cleanedName) return;
  const key = `${cleanedName}|${unit ?? ''}`;
  const existing = map.get(key) ?? { name: cleanedName, unit, quantity: 0, brewCount: 0, brewCountIds: new Set<string>() };
  existing.quantity += Math.max(0, safeNumber(quantity));
  if (!existing.brewCountIds.has(brewId)) {
    existing.brewCount += 1;
    existing.brewCountIds.add(brewId);
  }
  map.set(key, existing);
};
interface YeastWithIds extends DashboardYeastUsage { brewCountIds: Set<string>; }

const sortedTop = <T extends DashboardIngredientUsage | DashboardYeastUsage>(items: T[]): T[] => [...items]
  .sort((a, b) => ('quantity' in b ? b.quantity : b.brewCount) - ('quantity' in a ? a.quantity : a.brewCount) || a.name.localeCompare(b.name, 'de'))
  .slice(0, TOP_LIMIT);

export const calculateIngredientSummary = (beers: Beer[] = [], brews: FinishedBrew[] = []): DashboardIngredientSummary => {
  const recipesById = new Map(beers.map((beer) => [String(beer.id), beer]));
  const malts = new Map<string, UsageWithIds>();
  const hops = new Map<string, UsageWithIds>();
  const additionalIngredients = new Map<string, UsageWithIds>();
  const yeasts = new Map<string, YeastWithIds>();
  let linkedBrewCount = 0;

  brews.forEach((brew) => {
    if (!brew.beer_id) return;
    const recipe = recipesById.get(String(brew.beer_id));
    if (!recipe) return;
    linkedBrewCount += 1;
    const brewId = brew.id;

    recipe.malts?.forEach((malt) => addIngredientUsage(malts, malt.name, malt.quantity, brewId));
    recipe.wortBoiling?.hops?.forEach((hop) => addIngredientUsage(hops, hop.name, hop.quantity, brewId));
    recipe.additionalIngredients?.forEach((ingredient) => addIngredientUsage(additionalIngredients, ingredient.name, ingredient.quantity, brewId, ingredient.unit));

    const yeastNamesInBrew = new Set<string>();
    recipe.fermentationMaturation?.yeast?.forEach((yeast) => {
      const name = yeast.name?.trim();
      if (!name || yeastNamesInBrew.has(name)) return;
      yeastNamesInBrew.add(name);
      const existing = yeasts.get(name) ?? { name, brewCount: 0, type: yeast.type, brewCountIds: new Set<string>() };
      if (!existing.brewCountIds.has(brewId)) {
        existing.brewCount += 1;
        existing.brewCountIds.add(brewId);
      }
      yeasts.set(name, existing);
    });
  });

  const cleanupIngredient = ({ brewCountIds, ...item }: UsageWithIds): DashboardIngredientUsage => item;
  const cleanupYeast = ({ brewCountIds, ...item }: YeastWithIds): DashboardYeastUsage => item;

  return {
    malts: sortedTop(Array.from(malts.values()).map(cleanupIngredient)),
    hops: sortedTop(Array.from(hops.values()).map(cleanupIngredient)),
    yeasts: sortedTop(Array.from(yeasts.values()).map(cleanupYeast)),
    additionalIngredients: sortedTop(Array.from(additionalIngredients.values()).map(cleanupIngredient)),
    linkedBrewCount,
  };
};

export const calculateMonthlyStats = (brews: FinishedBrew[] = []): DashboardMonthlyStat[] => {
  const stats = new Map<string, DashboardMonthlyStat>();
  brews.forEach((brew) => {
    const date = parseDate(brew.startDate);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    const existing = stats.get(key) ?? { key, label, brewCount: 0, liters: 0 };
    existing.brewCount += 1;
    existing.liters += Math.max(0, safeNumber(brew.liters));
    stats.set(key, existing);
  });
  return Array.from(stats.values()).sort((a, b) => a.key.localeCompare(b.key));
};

export const calculateRecipeHistory = (beers: Beer[] = [], brews: FinishedBrew[] = []): DashboardRecipeHistory[] => {
  const recipes = new Map(beers.map((beer) => [String(beer.id), beer]));
  const history = new Map<string, DashboardRecipeHistory>();
  brews.forEach((brew) => {
    if (!brew.beer_id) return;
    const recipe = recipes.get(String(brew.beer_id));
    if (!recipe) return;
    const recipeId = String(recipe.id);
    const row = history.get(recipeId) ?? { recipeId, recipeName: recipe.name || 'Unbenanntes Rezept', brewCount: 0, liters: 0 };
    row.brewCount += 1;
    row.liters += Math.max(0, safeNumber(brew.liters));
    history.set(recipeId, row);
  });
  return Array.from(history.values()).sort((a, b) => b.brewCount - a.brewCount || b.liters - a.liters || a.recipeName.localeCompare(b.recipeName, 'de'));
};

export const calculateAdditionalStats = (brews: FinishedBrew[] = []): DashboardAdditionalStats => {
  const wortValues = brews.map((brew) => safeNumber(brew.originalwort)).filter((value) => value > 0);
  const literValues = brews.map((brew) => safeNumber(brew.liters)).filter((value) => value > 0);
  const dates = brews.map((brew) => parseDate(brew.startDate)).filter((date): date is Date => Boolean(date));
  return {
    averageOriginalWort: wortValues.length ? wortValues.reduce((sum, value) => sum + value, 0) / wortValues.length : undefined,
    originalWortSampleCount: wortValues.length,
    largestBrew: literValues.length ? Math.max(...literValues) : undefined,
    smallestBrew: literValues.length ? Math.min(...literValues) : undefined,
    lastBrew: dates.length ? formatDateGerman(new Date(Math.max(...dates.map((date) => date.getTime())))) : undefined,
  };
};

export const calculateConsumption = (beers: Beer[] = [], brews: FinishedBrew[] = []): DashboardConsumption => {
  const recipes = new Map(beers.map((beer) => [String(beer.id), beer]));
  return brews.reduce<DashboardConsumption>((result, brew) => {
    const recipe = brew.beer_id ? recipes.get(String(brew.beer_id)) : undefined;
    if (!recipe) return result;
    result.linkedBrewCount += 1;
    result.maltQuantity += recipe.malts?.reduce((sum, malt) => sum + Math.max(0, safeNumber(malt.quantity)), 0) ?? 0;
    result.hopQuantity += recipe.wortBoiling?.hops?.reduce((sum, hop) => sum + Math.max(0, safeNumber(hop.quantity)), 0) ?? 0;
    if (recipe.fermentationMaturation?.yeast?.length) result.yeastUses += 1;
    return result;
  }, { maltQuantity: 0, hopQuantity: 0, yeastUses: 0, linkedBrewCount: 0 });
};

export const calculateCareHints = (beers: Beer[] = [], brews: FinishedBrew[] = []): DashboardCareHints => {
  const recipeIds = new Set(beers.map((beer) => String(beer.id)));
  return {
    missingLiters: brews.filter((brew) => safeNumber(brew.liters) <= 0).length,
    missingEndDate: brews.filter((brew) => brew.state === eBrewState.FINISHED && !parseDate(brew.endDate)).length,
    missingResidualExtract: brews.filter((brew) => brew.residual_extract === null || safeNumber(brew.residual_extract) <= 0).length,
    activeInvalidStartDate: brews.filter((brew) => brew.active === true && !parseDate(brew.startDate)).length,
    missingRecipeLink: brews.filter((brew) => !brew.beer_id || !recipeIds.has(String(brew.beer_id))).length,
  };
};

export const buildActiveBrewRows = (brews: FinishedBrew[] = [], now = new Date()): DashboardActiveBrewRow[] => brews
  .filter((brew) => brew.state === eBrewState.FERMENTATION || brew.state === eBrewState.MATURATION)
  .map((brew) => {
    const days = calculateDaysSinceStart(brew.startDate, now);
    return {
      id: brew.id,
      name: brew.name || 'Unbenannter Sud',
      stateLabel: BrewStateGerman[brew.state] ?? String(brew.state ?? '-'),
      state: brew.state,
      startDateLabel: formatDateGerman(brew.startDate),
      daysSinceStartLabel: days === undefined ? '-' : `${days} Tage`,
      litersLabel: `${formatQuantity(Math.max(0, safeNumber(brew.liters)))} Liter`,
      originalWortLabel: safeNumber(brew.originalwort) > 0 ? `${formatQuantity(safeNumber(brew.originalwort))} °P` : '-',
      residualExtractLabel: brew.residual_extract !== null && safeNumber(brew.residual_extract) > 0 ? `${formatQuantity(safeNumber(brew.residual_extract))} °P` : '-',
      noteLabel: brew.note || '-',
    };
  });

export const formatDashboardQuantity = formatQuantity;
