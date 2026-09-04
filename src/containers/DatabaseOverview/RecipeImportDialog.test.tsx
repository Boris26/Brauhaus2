import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RecipeImportDialog} from './RecipeImportDialog';
import {RecipeImportFormat} from '../../model/RecipeImport';

jest.mock('../../utils/recipeImport', () => ({createImportIdempotencyKey: jest.fn()}));
import {createImportIdempotencyKey} from '../../utils/recipeImport';

const jsonFile = (content: string) => ({name: 'recipe.json', text: jest.fn().mockResolvedValue(content)}) as unknown as File;
const selectFormat = (label: string) => { fireEvent.mouseDown(screen.getByLabelText('Importformat')); fireEvent.click(screen.getByRole('option', {name: label})); };
const selectFile = (file: File) => fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {target: {files: [file]}});

describe('RecipeImportDialog', () => {
    beforeEach(() => (createImportIdempotencyKey as jest.Mock).mockReset().mockReturnValue('key-a'));

    it('uses the app dialog styles for its surface and controls', () => {
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={jest.fn()} />);

        expect(screen.getByRole('dialog')).toHaveClass('recipe-import-dialog');
        expect(screen.getByText('Rezept importieren')).toHaveClass('app-dialog__title');
        expect(screen.getByRole('button', {name: 'Datei auswählen'})).toHaveClass('recipe-import-dialog__file-button');
        expect(screen.getByRole('button', {name: 'Abbrechen'})).toHaveClass('recipe-import-dialog__cancel-button');
        expect(screen.getByRole('button', {name: 'Importieren'})).toHaveClass('recipe-import-dialog__import-button');
    });

    it.each([
        ['Brauhaus', RecipeImportFormat.BRAUHAUS],
        ['MaischeMalzundMehr (MMuM)', RecipeImportFormat.MMUM],
    ])('sends valid JSON unchanged for format %s', async (label, format) => {
        const onImport = jest.fn();
        const recipe = {name: 'Extern', Malz1_Menge: '5 kg', Hopfen_1_Kochzeit: '70', nested: {value: 7}};
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectFormat(label as string); selectFile(jsonFile(JSON.stringify(recipe)));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(onImport).toHaveBeenCalledWith({format, recipe, idempotencyKey: 'key-a'});
    });

    it.each([['', 'Die ausgewählte Datei enthält kein gültiges JSON.'], ['{invalid', 'Die ausgewählte Datei enthält kein gültiges JSON.'], ['[]', 'Die JSON-Datei muss ein Objekt enthalten.']])('rejects invalid input %#', async (content, message) => {
        const onImport = jest.fn();
        render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectFormat('Brauhaus'); selectFile(jsonFile(content));
        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(screen.getByRole('button', {name: 'Importieren'})).toBeDisabled();
        expect(onImport).not.toHaveBeenCalled();
    });

    it('does not offer BRAUREKA and disables interaction while loading', () => {
        render(<RecipeImportDialog open loading onCancel={jest.fn()} onImport={jest.fn()} />);
        expect(screen.queryByText(/BräuReKa/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: /Importieren/})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Abbrechen'})).toBeDisabled();
    });

    it('shows a structured backend error without closing the dialog', async () => {
        const props = {open: true, onCancel: jest.fn(), onImport: jest.fn()};
        const {rerender} = render(<RecipeImportDialog {...props} />);
        selectFormat('Brauhaus');
        selectFile(jsonFile('{"name":"Extern"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        rerender(<RecipeImportDialog {...props} backendError="Quelldaten ungültig. Betroffenes Feld: recipe.Malze[2].Menge" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Betroffenes Feld');
        expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('retains the key for another send of the same request and creates a new key for a new file', async () => {
        (createImportIdempotencyKey as jest.Mock).mockReturnValueOnce('key-a').mockReturnValueOnce('key-b');
        const onImport = jest.fn();
        render(<RecipeImportDialog open backendError="Netzwerkfehler" onCancel={jest.fn()} onImport={onImport} />);
        selectFormat('Brauhaus');
        selectFile(jsonFile('{"name":"first"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(onImport.mock.calls[0][0].idempotencyKey).toBe('key-a');
        expect(onImport.mock.calls[1][0].idempotencyKey).toBe('key-a');

        selectFile(jsonFile('{"name":"second"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(onImport.mock.calls[2][0].idempotencyKey).toBe('key-b');
    });
});
