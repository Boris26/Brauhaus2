export interface AdditionalIngredient {
    id: string;
    name: string;
    description?: string;
}

export interface AdditionalIngredientCreatePayload {
    name: string;
    description?: string;
}


export type AdditionalIngredientMasterData = Required<Pick<AdditionalIngredient, "name">> & {
    description: string;
};
