import {AdditionalIngredientPhase, Beer} from '../model/Beer';
import {FinishedBeerFermentationActionCreate} from '../model/FinishedBrew';
import {HopUsage} from '../enums/eHopUsage';
import {hasRecipeAction, RecipeActionFields} from '../model/FermentationRecipeAction';

type IngredientName = {id: string | number; name: string};

const nameFor = (id: string | number, ingredients: IngredientName[]): string =>
    ingredients.find(ingredient => String(ingredient.id) === String(id))?.name ?? `Unbekannte Zutat (ID ${id})`;

const actionFields = (ingredient: Partial<RecipeActionFields>) => ({
    triggerType: ingredient.triggerType!,
    triggerValue: ingredient.triggerValue ?? null,
    triggerUnit: ingredient.triggerUnit ?? null,
    contactTime: ingredient.contactTime ?? null,
    contactTimeUnit: ingredient.contactTimeUnit ?? null,
});

/** Uses quantities from the already scaled production plan without scaling again. */
export const createFinishedBeerFermentationActions = (
    scaledBeer: Beer,
    hops: IngredientName[] = [],
    additionalIngredients: IngredientName[] = [],
): FinishedBeerFermentationActionCreate[] => [
    ...scaledBeer.wortBoiling.hops
        .filter(hop => hop.usage === HopUsage.DRY_HOP && hasRecipeAction(hop))
        .map(hop => ({
            sourceType: 'DRY_HOP' as const,
            ...(hop.recipeRelationId != null ? {recipeRelationId: hop.recipeRelationId} : {}),
            ingredientId: hop.id,
            name: nameFor(hop.id, hops),
            amount: hop.quantity,
            unit: 'GRAMS',
            ...actionFields(hop),
        })),
    ...(scaledBeer.additionalIngredients ?? [])
        .filter(ingredient => ingredient.phase === AdditionalIngredientPhase.FERMENTATION && hasRecipeAction(ingredient))
        .map(ingredient => ({
            sourceType: 'ADDITIONAL_INGREDIENT' as const,
            ...(ingredient.recipeRelationId != null ? {recipeRelationId: ingredient.recipeRelationId} : {}),
            ingredientId: ingredient.id,
            name: nameFor(ingredient.id, additionalIngredients),
            amount: ingredient.quantity,
            unit: ingredient.unit,
            ...actionFields(ingredient),
        })),
];
