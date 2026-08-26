import {BaseRepository} from "./BaseRepository";
import {AdditionalIngredient, AdditionalIngredientCreatePayload, AdditionalIngredientMasterData} from "../model/AdditionalIngredient";

export class AdditionalIngredientRepository extends BaseRepository {
    static getAdditionalIngredients(): Promise<AdditionalIngredient[]> {
        return this.get<AdditionalIngredient[]>("additionalingredients");
    }

    static submitAdditionalIngredient(aIngredient: AdditionalIngredientCreatePayload): Promise<void> {
        return this.post("additionalingredient", aIngredient);
    }

    static deleteAdditionalIngredientById(aId: string): Promise<void> {
        return this.delete(`additionalingredient/${aId}`);
    }

    static updateAdditionalIngredient(aId: string | number, aData: AdditionalIngredientMasterData): Promise<AdditionalIngredient> {
        return this.put<AdditionalIngredient>(`additionalingredient/${aId}`, aData);
    }
}
