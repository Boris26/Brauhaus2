import {render, screen} from '@testing-library/react';
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
    render(<Details selectedBeer={beer} updateRecipeScaling={jest.fn()} />);

    expect(screen.getByText('Ausschlagmenge:')).toBeInTheDocument();
    expect(screen.getByText('Sudhausausbeute:')).toBeInTheDocument();
    expect(screen.getByText('Rezeptbasis: 30 l · 71 % SHA')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveClass('brewhouse-efficiency-input');
    expect(screen.getByRole('combobox')).toHaveValue('30');
    expect(screen.queryByText('Liter:')).not.toBeInTheDocument();
});

it('handles the initial render before a selected recipe is available', () => {
    const updateRecipeScaling = jest.fn();
    const {container, rerender} = render(<Details updateRecipeScaling={updateRecipeScaling} />);

    expect(container).toBeEmptyDOMElement();

    rerender(<Details selectedBeer={beer} updateRecipeScaling={updateRecipeScaling} />);

    expect(screen.getByRole('combobox')).toHaveValue('30');
    expect(screen.getByRole('spinbutton')).toHaveValue(71);
});
