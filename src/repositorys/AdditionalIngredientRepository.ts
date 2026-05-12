import {BaseRepository} from "./BaseRepository";
import {AdditionalIngredient, AdditionalIngredientCreatePayload} from "../model/AdditionalIngredient";

export class AdditionalIngredientRepository extends BaseRepository {
    static getAdditionalIngredients(): Promise<AdditionalIngredient[]> {
        return this.get<AdditionalIngredient[]>("additionalingredients");
    }

    static submitAdditionalIngredient(aIngredient: AdditionalIngredientCreatePayload): Promise<void> {
        return this.post("additionalingredient", aIngredient);
    }
}
