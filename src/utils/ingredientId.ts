export type IngredientId = string | number;

const invalidStringIds = new Set(['undefined', 'null', 'nan']);

export const isValidIngredientId = (value: unknown): value is IngredientId => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;

    const normalized = value.trim();
    return normalized.length > 0 && !invalidStringIds.has(normalized.toLowerCase());
};

export const validIngredientMasterData = <T extends {id: unknown}>(items: T[]): Array<T & {id: IngredientId}> =>
    items.filter((item): item is T & {id: IngredientId} => isValidIngredientId(item.id));
