import {api} from "./BaseRepository";
import {MaltRepository} from "./MaltRepository";
import {HopRepository} from "./HopRepository";
import {YeastRepository} from "./YeastRepository";
import {AdditionalIngredientRepository} from "./AdditionalIngredientRepository";

jest.mock("./BaseRepository", () => {
    const put = jest.fn();
    return {api: {put}, BaseRepository: class { protected static async put<T>(url: string, body: unknown): Promise<T> { return (await put(url, body)).data; } }};
});
const put = (api as unknown as {put: jest.Mock}).put;

describe("ingredient master-data repositories", () => {
    beforeEach(() => put.mockReset());
    it.each([
        ["malt", 7, MaltRepository.updateMalt, {name: "Pilsener", description: "", ebc: 3}],
        ["hop", 17, HopRepository.updateHop, {name: "Styrian Golding", description: "Aroma", type: "Aromahopfen", alpha: 3.2}],
        ["yeast", 23, YeastRepository.updateYeast, {name: "M41", description: "", type: "Obergärig", evg: 75, temperature: 18}],
        ["additionalingredient", 9, AdditionalIngredientRepository.updateAdditionalIngredient, {name: "Koriander", description: "Samen"}],
    ])("uses PUT %s/<id> without an id in the complete body", async (path, id, update, body) => {
        put.mockResolvedValueOnce({data: {id, ...body}});
        const result = await (update as any)(id, body);
        expect(put).toHaveBeenCalledWith(`${path}/${id}`, body);
        expect(put.mock.calls[0][1]).not.toHaveProperty("id");
        expect(result).toEqual({id, ...body});
    });
});
