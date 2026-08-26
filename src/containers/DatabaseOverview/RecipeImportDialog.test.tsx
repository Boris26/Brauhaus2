import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RecipeImportDialog} from './RecipeImportDialog';
import {RecipeImportSource} from '../../model/RecipeImport';

const jsonFile = (content: string) => ({
    name: 'recipe.json',
    text: jest.fn().mockResolvedValue(content),
}) as unknown as File;

const selectSource = (label: string) => {
    fireEvent.mouseDown(screen.getByLabelText('Quelle'));
    fireEvent.click(screen.getByRole('option', {name: label}));
};

const selectFile = (file: File) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {target: {files: [file]}});
};

describe('RecipeImportDialog', () => {
    it.each([
        ['MaischeMalzundMehr', RecipeImportSource.MAISCHE_MALZ_UND_MEHR],
        ['BräuReKa / Müggelland', RecipeImportSource.BRAUREKA],
        ['Brauhaus', RecipeImportSource.BRAUHAUS],
    ])('sends valid JSON unchanged for source %s', async (label, source) => {
        const onImport = jest.fn();
        const recipe = {name: 'Extern', nested: {value: 7}, values: [1, '2', null]};
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);

        selectSource(label as string);
        selectFile(jsonFile(JSON.stringify(recipe)));
        fireEvent.click(screen.getByRole('button', {name: 'Import starten'}));

        await waitFor(() => expect(onImport).toHaveBeenCalledWith({source, recipe}));
    });

    it('does not import without a source', async () => {
        const onImport = jest.fn();
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectFile(jsonFile('{"name":"Extern"}'));

        fireEvent.click(screen.getByRole('button', {name: 'Import starten'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Bitte wählen Sie eine Rezeptquelle aus.');
        expect(onImport).not.toHaveBeenCalled();
    });

    it('does not import without a file', async () => {
        const onImport = jest.fn();
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectSource('MaischeMalzundMehr');

        fireEvent.click(screen.getByRole('button', {name: 'Import starten'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Bitte wählen Sie eine JSON-Datei aus.');
        expect(onImport).not.toHaveBeenCalled();
    });

    it('rejects invalid JSON without importing', async () => {
        const onImport = jest.fn();
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectSource('BräuReKa / Müggelland');
        selectFile(jsonFile('{invalid'));

        fireEvent.click(screen.getByRole('button', {name: 'Import starten'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Die ausgewählte Datei enthält kein gültiges JSON.');
        expect(onImport).not.toHaveBeenCalled();
    });
});
