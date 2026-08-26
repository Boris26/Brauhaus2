import {fireEvent, render, screen} from '@testing-library/react';
import {Beer} from '../../../model/Beer';
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
    expect(screen.queryByText('Liter:')).not.toBeInTheDocument();
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

it('keeps the 10 l / 52 % defaults for a legacy recipe without references', () => {
    const legacyBeer = {...beer, referenceVolume: undefined, referenceBrewhouseEfficiency: undefined};
    const updateRecipeScaling = jest.fn();

    render(<Details selectedBeer={legacyBeer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByRole('combobox')).toHaveValue('10');
    expect(screen.getByRole('spinbutton')).toHaveValue(52);
    expect(updateRecipeScaling).toHaveBeenCalledWith({beer: legacyBeer, volume: 10, brewhouseEfficiency: 52});
});
