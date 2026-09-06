import {isValidIngredientId, validIngredientMasterData} from './ingredientId';

describe('ingredient ids', () => {
    it.each([undefined, null, '', ' ', 'undefined', ' Undefined ', 'null', 'NULL', 'NaN', Number.NaN, Infinity])('rejects invalid id %#', value => {
        expect(isValidIngredientId(value)).toBe(false);
    });

    it.each(['hop-1', 0, 42, '42'])('accepts valid string and number id %#', value => {
        expect(isValidIngredientId(value)).toBe(true);
    });

    it('removes malformed API master-data entries before Redux state', () => {
        expect(validIngredientMasterData([{id: 1, name: 'valid'}, {id: undefined, name: 'missing'}, {id: 'null', name: 'invalid'}])).toEqual([{id: 1, name: 'valid'}]);
    });
});
