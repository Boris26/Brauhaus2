import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {BeerForm} from './BeerForm';
import {HopUsage} from '../../enums/eHopUsage';
import {HopTimeUnit} from '../../enums/eHopTimeUnit';

const baseProps: React.ComponentProps<typeof BeerForm> = {
    onSubmitBeer: jest.fn(),
    getMalt: jest.fn(),
    getHop: jest.fn(),
    getYeast: jest.fn(),
    getAdditionalIngredients: jest.fn(),
    saveBeerFormState: jest.fn(),
    malts: [{id: 'm1', name: 'Pilsner Malz', description: '', EBC: 4, quantity: 0}],
    hops: [{id: 'h1', name: 'Hallertauer Mittelfrüh', description: '', alpha: 4, quantity: 0, time: 0}],
    yeasts: [{id: 'y1', name: 'SafAle US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 0}],
    additionalIngredients: [{id: 'a1', name: 'Koriandersamen', description: ''}],
    isSubmitSuccessful: undefined,
    messageType: '',
    message: '',
    beers: [],
    importBeer: jest.fn(),
    isSavingBeer: false,
};

const renderBeerForm = (overrides: Partial<React.ComponentProps<typeof BeerForm>> = {}) => {
    const props: React.ComponentProps<typeof BeerForm> = {
        ...baseProps,
        onSubmitBeer: jest.fn(),
        getMalt: jest.fn(),
        getHop: jest.fn(),
        getYeast: jest.fn(),
        getAdditionalIngredients: jest.fn(),
        saveBeerFormState: jest.fn(),
        importBeer: jest.fn(),
        ...overrides,
    };

    return {props, ...render(<BeerForm {...props} />)};
};

const fillValidRecipe = () => {
    fireEvent.change(screen.getByLabelText(/Name:/), {target: {value: 'Helles'}});
    fireEvent.change(screen.getByLabelText(/Typ:/), {target: {value: 'Lager'}});
    fireEvent.change(screen.getByLabelText(/Bitterkeit:/), {target: {value: '25'}});
    fireEvent.change(screen.getByLabelText(/Alkoholgehalt:/), {target: {value: '5.2'}});
    fireEvent.change(screen.getByLabelText(/Stammwürze:/), {target: {value: '12.5'}});
    fireEvent.change(screen.getByLabelText(/Hauptguss/), {target: {value: '20'}});
    fireEvent.change(screen.getByLabelText(/Nachguss/), {target: {value: '10'}});
    fireEvent.change(screen.getByLabelText(/Kochzeit/), {target: {value: '60'}});
    fireEvent.change(screen.getByLabelText(/Kochtemperatur/), {target: {value: '99'}});

    fireEvent.click(screen.getByRole('button', {name: /Malze/}));
    fireEvent.change(screen.getByDisplayValue('Malz'), {target: {value: 'Pilsner Malz'}});
    fireEvent.change(screen.getAllByRole('spinbutton').find((input) => input.getAttribute('name') === 'quantity')!, {target: {value: '4000'}});

    fireEvent.click(screen.getByRole('button', {name: /Hopfen/}));
    fireEvent.change(screen.getByDisplayValue('Hopfen'), {target: {value: 'Hallertauer Mittelfrüh'}});
    const hopQuantity = screen.getAllByRole('spinbutton').filter((input) => input.getAttribute('name') === 'quantity')[1];
    fireEvent.change(hopQuantity, {target: {value: '50'}});
    fireEvent.change(screen.getByDisplayValue('0'), {target: {value: '60'}});

    fireEvent.click(screen.getByRole('button', {name: /Hefe/}));
    fireEvent.change(screen.getByDisplayValue('Hefe'), {target: {value: 'SafAle US-05'}});
    const yeastQuantity = screen.getAllByRole('spinbutton').filter((input) => input.getAttribute('name') === 'quantity')[2];
    fireEvent.change(yeastQuantity, {target: {value: '1'}});
};

describe('BeerForm accordions', () => {
    it('opens basic and brewing data initially while keeping table sections collapsed', () => {
        renderBeerForm();

        expect(screen.getByRole('button', {name: /Grunddaten/})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Braudaten/})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Maischeplan/})).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('button', {name: /Malze/})).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles sections by keyboard and preserves entered form values', () => {
        renderBeerForm();
        const nameInput = screen.getByLabelText(/Name:/);
        fireEvent.change(nameInput, {target: {value: 'Helles'}});

        const basicHeader = screen.getByRole('button', {name: /Grunddaten/});
        fireEvent.keyDown(basicHeader, {key: 'Enter'});
        expect(basicHeader).toHaveAttribute('aria-expanded', 'false');

        fireEvent.keyDown(basicHeader, {key: ' '});
        expect(basicHeader).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByLabelText(/Name:/)).toHaveValue('Helles');
    });

    it('opens closed ingredient sections when validation errors are found', () => {
        const {props} = renderBeerForm();

        fireEvent.click(screen.getByRole('button', {name: /Rezept speichern/}));

        expect(screen.getByRole('button', {name: /Malze.*Fehler/i})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Hopfen.*Fehler/i})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Hefe.*Fehler/i})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(/Bitte korrigiere die markierten Pflichtfelder/)).toBeInTheDocument();
        expect(props.onSubmitBeer).not.toHaveBeenCalled();
    });

    it('submits a new beer exactly once with the complete create/update payload', () => {
        const {props} = renderBeerForm();
        fillValidRecipe();

        fireEvent.click(screen.getByRole('button', {name: /Rezept speichern/}));

        expect(props.onSubmitBeer).toHaveBeenCalledTimes(1);
        expect(props.onSubmitBeer).toHaveBeenCalledWith(expect.objectContaining({
            id: '',
            name: 'Helles',
            type: 'Lager',
            alcohol: 5.2,
            originalwort: 12.5,
            bitterness: 25,
            mashVolume: 20,
            spargeVolume: 10,
            cookingTime: 60,
            cookingTemperatur: 99,
            malts: [{id: 'm1', name: 'Pilsner Malz', quantity: 4000}],
            wortBoiling: {totalTime: 0, hops: [{id: 'h1', name: 'Hallertauer Mittelfrüh', quantity: 50, time: 60, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES}]},
            fermentationMaturation: {fermentationTemperature: 0, carbonation: 0, yeast: [{id: 'y1', name: 'SafAle US-05', quantity: 1}]},
        }));
    });

    it('submits an existing beer with its id after selecting it for editing', () => {
        const existingBeer: React.ComponentProps<typeof BeerForm>['beers'][number] = {
            id: 'beer-1', name: 'Alt', type: 'Ale', color: 'amber', alcohol: 5, originalwort: 12, bitterness: 30, description: '', rating: 3,
            mashVolume: 18, spargeVolume: 8, cookingTime: 60, cookingTemperatur: 99,
            fermentation: [{type: 'Einmaischen', temperature: 65, time: 0}, {type: 'Abmaischen', temperature: 78, time: 0}, {type: 'Kochen', temperature: 99, time: 0}],
            malts: [{id: 'm1', name: 'Pilsner Malz', description: '', EBC: 4, quantity: 4000}],
            wortBoiling: {totalTime: 60, hops: [{id: 'h1', name: 'Hallertauer Mittelfrüh', description: '', alpha: 4, quantity: 50, time: 60, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES}]},
            fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: [{id: 'y1', name: 'SafAle US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 1}]},
            additionalIngredients: [],
        };
        const {props} = renderBeerForm({beers: [existingBeer]});

        fireEvent.change(screen.getByLabelText(/Bier auswählen/), {target: {value: 'beer-1'}});
        fireEvent.change(screen.getByLabelText(/Name:/), {target: {value: 'Altbier'}});
        fireEvent.click(screen.getByRole('button', {name: /Rezept speichern/}));

        expect(props.onSubmitBeer).toHaveBeenCalledTimes(1);
        expect(props.onSubmitBeer).toHaveBeenCalledWith(expect.objectContaining({id: 'beer-1', name: 'Altbier'}));
    });

    it('keeps the submit button disabled while saving to prevent duplicate submits', () => {
        renderBeerForm({isSavingBeer: true});

        expect(screen.getByRole('button', {name: /Speichern/})).toBeDisabled();
    });

    it('shows success and error messages supplied by the save flow', () => {
        const {rerender, props} = renderBeerForm({isSubmitSuccessful: true, message: 'Gespeichert'});
        expect(screen.getByText('Gespeichert')).toBeInTheDocument();

        rerender(<BeerForm {...props} isSubmitSuccessful={false} message="Fehler beim Speichern" />);
        expect(screen.getByText('Fehler beim Speichern')).toBeInTheDocument();
    });

    it('keeps add and delete actions available in table sections', () => {
        renderBeerForm();
        fireEvent.click(screen.getByRole('button', {name: /Malze/}));
        fireEvent.click(screen.getByRole('button', {name: /\+ Malz hinzufügen/}));
        expect(screen.getAllByRole('button', {name: /Malz löschen/})).toHaveLength(2);
        fireEvent.click(screen.getAllByRole('button', {name: /Malz löschen/})[0]);
        expect(screen.getAllByRole('button', {name: /Malz löschen/})).toHaveLength(1);
    });
});
