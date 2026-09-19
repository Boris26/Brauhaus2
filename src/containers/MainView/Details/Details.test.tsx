import {fireEvent, render, screen} from '@testing-library/react';
import {Beer} from '../../../model/Beer';
import {HopUsage} from '../../../enums/eHopUsage';
import {Details} from './Details';

const beer = {
    id: 'recipe-30', name: 'Import', type: 'Ale', color: '10', alcohol: 5,
    originalwort: 12, bitterness: 25, description: '', rating: 4,
    mashVolume: 20, spargeVolume: 10, cookingTime: 60, cookingTemperatur: 100,
    fermentation: [], malts: [], wortBoiling: {totalTime: 60, hops: []},
    fermentationMaturation: {fermentationTemperature: 20, carbonation: 5, yeast: []},
    referenceVolume: 30, referenceBrewhouseEfficiency: 71,
} as Beer;

it('labels the planned batch clearly and displays the compact recipe reference', () => {
    const updateRecipeScaling = jest.fn();
    render(<Details selectedBeer={beer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByText('Ausschlagmenge:')).toBeInTheDocument();
    expect(screen.getByText('Sudhausausbeute:')).toBeInTheDocument();
    expect(screen.getByText('Rezeptbasis: 30 l · 71 % SHA')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveClass('brewhouse-efficiency-input');
    expect(screen.getByRole('spinbutton')).toHaveValue(52);
    expect(screen.getByRole('combobox')).toHaveValue('30');
    expect(screen.getByText('Liter')).toBeInTheDocument();
    expect(updateRecipeScaling).toHaveBeenCalledWith({beer, volume: 30, brewhouseEfficiency: 52});
});

it('handles the initial render before a selected recipe is available', () => {
    const updateRecipeScaling = jest.fn();
    const {container, rerender} = render(<Details updateRecipeScaling={updateRecipeScaling} />);

    expect(container).toBeEmptyDOMElement();

    rerender(<Details selectedBeer={beer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByRole('combobox')).toHaveValue('30');
    expect(screen.getByRole('spinbutton')).toHaveValue(52);
    expect(updateRecipeScaling).toHaveBeenCalledWith({beer, volume: 30, brewhouseEfficiency: 52});
});

it('resets volume and planned efficiency when the selected recipe changes', () => {
    const updateRecipeScaling = jest.fn();
    const {rerender} = render(<Details selectedBeer={beer} updateRecipeScaling={updateRecipeScaling} />);
    const nextBeer = {...beer, id: 'recipe-20', referenceVolume: 20, referenceBrewhouseEfficiency: 80};

    fireEvent.change(screen.getByRole('spinbutton'), {target: {value: '72'}});
    rerender(<Details selectedBeer={nextBeer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByRole('combobox')).toHaveValue('20');
    expect(screen.getByRole('spinbutton')).toHaveValue(52);
    expect(updateRecipeScaling).toHaveBeenLastCalledWith({beer: nextBeer, volume: 20, brewhouseEfficiency: 52});
});

it('renders only the active tab and keeps it active when the recipe changes', () => {
    const recipeWithMalt = {...beer, malts: [{id: 'malt-1', name: 'Pilsner Malz', quantity: 4500}]};
    const nextRecipe = {...recipeWithMalt, id: 'recipe-next', name: 'Next', malts: [{id: 'malt-2', name: 'Wiener Malz', quantity: 3000}]};
    const {rerender} = render(<Details selectedBeer={recipeWithMalt} updateRecipeScaling={jest.fn()}/>);

    expect(screen.queryByText('Pilsner Malz')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', {name: 'Schüttung'}));
    expect(screen.getByText('Pilsner Malz')).toBeInTheDocument();
    expect(screen.queryByText('Allgemeine Daten')).not.toBeInTheDocument();

    rerender(<Details selectedBeer={nextRecipe} updateRecipeScaling={jest.fn()}/>);
    expect(screen.getByText('Wiener Malz')).toBeInTheDocument();
    expect(screen.queryByText('Pilsner Malz')).not.toBeInTheDocument();
});

it('keeps the 10 l / 52 % defaults for a legacy recipe without references', () => {
    const legacyBeer = {...beer, referenceVolume: undefined, referenceBrewhouseEfficiency: undefined};
    const updateRecipeScaling = jest.fn();

    render(<Details selectedBeer={legacyBeer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByRole('combobox')).toHaveValue('10');
    expect(screen.getByRole('spinbutton')).toHaveValue(52);
    expect(updateRecipeScaling).toHaveBeenCalledWith({beer: legacyBeer, volume: 10, brewhouseEfficiency: 52});
});

it('displays the recipe malt name when no ingredient master data is loaded', () => {
    const beerWithNamedMalt = {
        ...beer,
        malts: [{id: 'malt-1', name: 'Pilsner Malz', quantity: 4500}],
    };

    render(<Details selectedBeer={beerWithNamedMalt} updateRecipeScaling={jest.fn()} malts={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Schüttung'}));

    expect(screen.getByText('Pilsner Malz')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Zutat (ID malt-1)')).not.toBeInTheDocument();
});

it('loads the malt master data and resolves a recipe malt by its id', () => {
    const getMalt = jest.fn();
    const beerWithMaltId = {
        ...beer,
        malts: [{id: 26, quantity: 4500}],
    };

    render(
        <Details
            selectedBeer={beerWithMaltId}
            updateRecipeScaling={jest.fn()}
            getMalt={getMalt}
            malts={[{id: '26', name: 'Wiener Malz'}]}
        />
    );
    fireEvent.click(screen.getByRole('tab', {name: 'Schüttung'}));

    expect(getMalt).toHaveBeenCalledWith(true);
    expect(screen.getByText('Wiener Malz')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Zutat (ID 26)')).not.toBeInTheDocument();
});

it('displays the unknown ingredient fallback when neither recipe nor master data has a name', () => {
    const beerWithUnknownMalt = {
        ...beer,
        malts: [{id: 44, quantity: 1000}],
    };

    render(<Details selectedBeer={beerWithUnknownMalt} updateRecipeScaling={jest.fn()} malts={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Schüttung'}));

    expect(screen.getByText('Unbekannte Zutat (ID 44)')).toBeInTheDocument();
});

it('displays the recipe hop name when no ingredient master data is loaded', () => {
    const beerWithNamedHop = {
        ...beer,
        wortBoiling: {
            ...beer.wortBoiling,
            hops: [{id: 'hop-1', name: 'Citra', quantity: 20, additionTime: 10, usage: HopUsage.BOIL}],
        },
    };

    render(<Details selectedBeer={beerWithNamedHop} updateRecipeScaling={jest.fn()} hops={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Würzekochen'}));

    expect(screen.getByText('Citra')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Zutat (ID hop-1)')).not.toBeInTheDocument();
});

it('loads the hop master data and resolves a recipe hop by its id', () => {
    const getHop = jest.fn();
    const beerWithHopId = {
        ...beer,
        wortBoiling: {
            ...beer.wortBoiling,
            hops: [{id: 11, quantity: 20, additionTime: 10, usage: HopUsage.BOIL}],
        },
    };

    render(
        <Details
            selectedBeer={beerWithHopId}
            updateRecipeScaling={jest.fn()}
            getHop={getHop}
            hops={[{id: '11', name: 'Hallertauer Mittelfrüh'}]}
        />
    );
    fireEvent.click(screen.getByRole('tab', {name: 'Würzekochen'}));

    expect(getHop).toHaveBeenCalledWith(true);
    expect(screen.getByText('Hallertauer Mittelfrüh')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Zutat (ID 11)')).not.toBeInTheDocument();
});

it('displays the unknown ingredient fallback for an unresolved recipe hop', () => {
    const beerWithUnknownHop = {
        ...beer,
        wortBoiling: {
            ...beer.wortBoiling,
            hops: [{id: 12, quantity: 20, additionTime: 10, usage: HopUsage.BOIL}],
        },
    };

    render(<Details selectedBeer={beerWithUnknownHop} updateRecipeScaling={jest.fn()} hops={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Würzekochen'}));

    expect(screen.getByText('Unbekannte Zutat (ID 12)')).toBeInTheDocument();
});

it('displays the recipe yeast name when no ingredient master data is loaded', () => {
    const beerWithNamedYeast = {
        ...beer,
        fermentationMaturation: {
            ...beer.fermentationMaturation,
            yeast: [{id: 'yeast-1', name: 'US-05', quantity: 1}],
        },
    };

    render(<Details selectedBeer={beerWithNamedYeast} updateRecipeScaling={jest.fn()} yeasts={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Gärung & Reifung'}));

    expect(screen.getByText('US-05')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Hefe (ID yeast-1)')).not.toBeInTheDocument();
});

it('loads the yeast master data and resolves a recipe yeast by its id', () => {
    const getYeast = jest.fn();
    const beerWithYeastId = {
        ...beer,
        fermentationMaturation: {
            ...beer.fermentationMaturation,
            yeast: [{id: 7, quantity: 1}],
        },
    };

    render(
        <Details
            selectedBeer={beerWithYeastId}
            updateRecipeScaling={jest.fn()}
            getYeast={getYeast}
            yeasts={[{id: '7', name: 'SafAle S-04'}]}
        />
    );
    fireEvent.click(screen.getByRole('tab', {name: 'Gärung & Reifung'}));

    expect(getYeast).toHaveBeenCalledWith(true);
    expect(screen.getByText('SafAle S-04')).toBeInTheDocument();
    expect(screen.queryByText('Unbekannte Hefe (ID 7)')).not.toBeInTheDocument();
});

it('displays the unknown yeast fallback when neither recipe nor master data has a name', () => {
    const beerWithUnknownYeast = {
        ...beer,
        fermentationMaturation: {
            ...beer.fermentationMaturation,
            yeast: [{id: 8, quantity: 1}],
        },
    };

    render(<Details selectedBeer={beerWithUnknownYeast} updateRecipeScaling={jest.fn()} yeasts={[]} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Gärung & Reifung'}));

    expect(screen.getByText('Unbekannte Hefe (ID 8)')).toBeInTheDocument();
});

it('shows decoction as a confirmation step without empty or stale measurements', () => {
    const beerWithDecoction = {
        ...beer,
        fermentation: [{type: 'RAST', procedureType: 'DECOCTION', executionMode: 'CONFIRMATION_HOLD', temperature: 0, time: 0}],
    } as Beer;

    render(<Details selectedBeer={beerWithDecoction} updateRecipeScaling={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Maischen'}));

    expect(screen.getByText('Dekoktion')).toBeInTheDocument();
    expect(screen.getByText('bis Bestätigung')).toBeInTheDocument();
    expect(screen.queryByText(/°C| min/)).not.toBeInTheDocument();
});

it('does not append units to missing optional values', () => {
    const beerWithoutOptionalValues = {
        ...beer,
        fermentationMaturation: {...beer.fermentationMaturation, fermentationTemperature: undefined},
        wortBoiling: {...beer.wortBoiling, hops: [{id: 'hop-1', name: 'Citra', quantity: 20, usage: HopUsage.BOIL}]},
    } as unknown as Beer;

    const {container} = render(<Details selectedBeer={beerWithoutOptionalValues} updateRecipeScaling={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', {name: 'Gärung & Reifung'}));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('— °C');

    fireEvent.click(screen.getByRole('tab', {name: 'Würzekochen'}));
    expect(screen.getByText('20 g')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('— min');
});
