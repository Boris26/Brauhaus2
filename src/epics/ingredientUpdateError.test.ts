import {AxiosError} from "axios";
import {getIngredientUpdateError} from "./ingredientUpdateError";
const error = (status: number) => new AxiosError("failure", undefined, undefined, undefined, {status, statusText: "", headers: {}, config: {} as any, data: {}});
describe("getIngredientUpdateError", () => {
    it.each([[400, "Die eingegebenen Daten sind ungültig."], [404, "Die Zutat wurde nicht gefunden."], [409, "Eine Zutat mit diesem Namen existiert bereits."]])("maps HTTP %s", (status, message) => expect(getIngredientUpdateError(error(status))).toBe(message));
});
