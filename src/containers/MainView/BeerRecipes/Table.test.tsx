import {Beer} from '../../../model/Beer';
import {BeerTableComponent, BeerTableProps} from './Table';

const storedRecipe = {id: 'beer-1', name: 'Stored', malts: [{quantity: 1000}]} as Beer;
const plannedBrew = {id: 'beer-1', name: 'Stored', malts: [{quantity: 3000}]} as Beer;

it('uses the temporary scaled selection when the user starts brewing', () => {
    const setBeerToBrew = jest.fn();
    const props = {
        beers: [storedRecipe], selectedBeer: plannedBrew, setBeerToBrew,
        setSelectedBeer: jest.fn(), exportShoppingListPdf: jest.fn(), deleteBeer: jest.fn(),
    } as BeerTableProps;
    const table = new BeerTableComponent(props);

    table.onBrewBeer(storedRecipe);

    expect(setBeerToBrew).toHaveBeenCalledWith(plannedBrew);
    expect(storedRecipe.malts[0].quantity).toBe(1000);
});

it('does not delete the recipe used by an active brewing process', () => {
    const deleteBeer = jest.fn();
    const props = {
        beers: [storedRecipe], selectedBeer: plannedBrew, beerToBrew: plannedBrew,
        isPollingRunning: true, setBeerToBrew: jest.fn(), setSelectedBeer: jest.fn(),
        exportShoppingListPdf: jest.fn(), deleteBeer,
    } as BeerTableProps;
    const table = new BeerTableComponent(props);
    Object.assign(table.state, {beerPendingDelete: storedRecipe});

    table.confirmDeleteBeer();

    expect(deleteBeer).not.toHaveBeenCalled();
    expect(table.state.beerPendingDelete).toBe(storedRecipe);
});
