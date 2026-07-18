import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {BeerForm} from './BeerForm';

const renderBeerForm = () => {
    const props: React.ComponentProps<typeof BeerForm> = {
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
        isSubmitSuccessful: true,
        messageType: '',
        message: '',
        beers: [],
        importBeer: jest.fn(),
        isSavingBeer: false,
    };

    return {props, ...render(<BeerForm {...props} />)};
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
        expect(props.onSubmitBeer).not.toHaveBeenCalled();
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
