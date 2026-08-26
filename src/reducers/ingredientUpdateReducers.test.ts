import {maltsReducer, initialMaltsState} from "./maltsReducer";
import {hopsReducer, initialHopsState} from "./hopsReducer";
import {yeastReducer, initialYeastState} from "./yeastReducer";
import {additionalIngredientsReducer, initialAdditionalIngredientsState} from "./additionalIngredientsReducer";
import {MaltsActions} from "../actions/malt.actions";
import {HopsActions} from "../actions/hops.actions";
import {YeastActions} from "../actions/yeast.actions";
import {AdditionalIngredientsActions} from "../actions/additionalIngredients.actions";

describe("ingredient update reducers", () => {
    it("replaces the malt returned by PUT without changing its id", () => {
        const old = {id: 7, name: "Alt", description: "", ebc: 3};
        const updated = {...old, name: "Neu", ebc: 5};
        const state = maltsReducer({...initialMaltsState, malts: [old]}, MaltsActions.updateMaltsSuccess(updated));
        expect(state.malts).toEqual([updated]); expect(state.malts?.[0].id).toBe(7);
    });
    it("replaces complete hop, yeast, and additional ingredient responses", () => {
        const hop = {id: 17, name: "Hop", description: "", type: "Aroma", alpha: 3.2};
        expect(hopsReducer({...initialHopsState, hops: [{...hop, alpha: 0}]}, HopsActions.updateHopsSuccess(hop)).hops).toEqual([hop]);
        const yeast = {id: 23, name: "M41", description: "", type: "Obergärig", evg: 75, temperature: 18};
        expect(yeastReducer({...initialYeastState, yeasts: [{...yeast, evg: 0}]}, YeastActions.updateYeastsSuccess(yeast)).yeasts).toEqual([yeast]);
        const ingredient = {id: "9", name: "Koriander", description: "Samen"};
        expect(additionalIngredientsReducer({...initialAdditionalIngredientsState, additionalIngredients: [{...ingredient, description: ""}]}, AdditionalIngredientsActions.updateAdditionalIngredientSuccess(ingredient)).additionalIngredients).toEqual([ingredient]);
    });
});
