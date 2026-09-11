import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {RecipeImportDialog} from './RecipeImportDialog';
import {IngredientResolution, RecipeImportFormat, RecipeImportResult} from '../../model/RecipeImport';

jest.mock('../../utils/recipeImport', () => ({createImportIdempotencyKey: jest.fn()}));
import {createImportIdempotencyKey} from '../../utils/recipeImport';

const jsonFile = (content: string) => ({name: 'recipe.json', text: jest.fn().mockResolvedValue(content)}) as unknown as File;
const selectFormat = (label: string) => { fireEvent.mouseDown(screen.getByLabelText('Importformat')); fireEvent.click(screen.getByRole('option', {name: label})); };
const selectFile = (file: File) => fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {target: {files: [file]}});
const resolutionResult = (ingredients: IngredientResolution[]): RecipeImportResult => ({resolutionRequired: true, ingredients, warnings: [], ingredientMappings: [], createdMasterData: [], replayed: false});

const startResolution = async (ingredients: IngredientResolution[], masterData?: React.ComponentProps<typeof RecipeImportDialog>['masterData']) => {
    const onImport = jest.fn();
    const props = {open: true, onCancel: jest.fn(), onImport, masterData};
    const view = render(<RecipeImportDialog {...props} />);
    selectFormat('Brauhaus'); selectFile(jsonFile('{"name":"Extern"}'));
    await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
    const result = resolutionResult(ingredients);
    view.rerender(<RecipeImportDialog {...props} result={result} />);
    return {onImport, result, ...view};
};

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
        const {rerender} = render(<RecipeImportDialog open backendError="Netzwerkfehler" onCancel={jest.fn()} onImport={onImport} />);
        selectFormat('Brauhaus');
        selectFile(jsonFile('{"name":"first"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        rerender(<RecipeImportDialog open backendError="Netzwerkfehler" onCancel={jest.fn()} onImport={onImport} />);
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(onImport.mock.calls[0][0].idempotencyKey).toBe('key-a');
        expect(onImport.mock.calls[1][0].idempotencyKey).toBe('key-a');

        selectFile(jsonFile('{"name":"second"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        expect(onImport.mock.calls[2][0].idempotencyKey).toBe('key-b');
    });

    it('preselects a single fuzzy candidate and retries statelessly with the original key and document', async () => {
        const onImport = jest.fn();
        const recipe = {name: 'Extern'};
        const {rerender} = render(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} />);
        selectFormat('Brauhaus'); selectFile(jsonFile(JSON.stringify(recipe)));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Importieren'}));
        rerender(<RecipeImportDialog open onCancel={jest.fn()} onImport={onImport} result={{resolutionRequired: true, ingredients: [{ingredientType: 'HOP', sourceName: 'Hallertau Mittelfruh', candidates: [{ingredientId: 8, name: 'Hallertauer Mittelfrüh', matchType: 'FUZZY'}]}], warnings: [], ingredientMappings: [], createdMasterData: [], replayed: false}} />);

        await waitFor(() => expect(screen.getByLabelText('Lokale Zuordnung')).toHaveTextContent('Hallertauer Mittelfrüh'));
        expect(screen.getByText('Vorschlag')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Import abschließen'})).toBeEnabled();
        fireEvent.click(screen.getByRole('button', {name: 'Import abschließen'}));
        expect(onImport).toHaveBeenLastCalledWith({format: RecipeImportFormat.BRAUHAUS, recipe, idempotencyKey: 'key-a', ingredientMappings: [{ingredientType: 'HOP', sourceName: 'Hallertau Mittelfruh', ingredientId: '8'}]});
    });

    it('sends a valid candidate ingredientId', async () => {
        const {onImport} = await startResolution([{ingredientType: 'HOP', sourceName: 'Hallertau', candidates: [{ingredientId: 8, name: 'Hallertauer', matchType: 'FUZZY'}]}]);
        await waitFor(() => expect(screen.getByRole('button', {name: 'Import abschließen'})).toBeEnabled());
        fireEvent.click(screen.getByRole('button', {name: 'Import abschließen'}));
        expect(onImport).toHaveBeenLastCalledWith(expect.objectContaining({ingredientMappings: [{ingredientType: 'HOP', sourceName: 'Hallertau', ingredientId: '8'}]}));
    });

    it('normalizes and sends a valid master-data id', async () => {
        const {onImport} = await startResolution([{ingredientType: 'ADDITIONAL_INGREDIENT', sourceName: 'Holz', candidates: []}], {MALT: [], HOP: [], YEAST: [], ADDITIONAL_INGREDIENT: [{id: 'oak-1', name: 'Eichenholzchips'}]});
        fireEvent.mouseDown(screen.getByLabelText('Lokale Zuordnung'));
        fireEvent.click(screen.getByRole('option', {name: 'Eichenholzchips'}));
        fireEvent.click(screen.getByRole('button', {name: 'Import abschließen'}));
        expect(onImport).toHaveBeenLastCalledWith(expect.objectContaining({ingredientMappings: [{ingredientType: 'ADDITIONAL_INGREDIENT', sourceName: 'Holz', ingredientId: 'oak-1'}]}));
    });

    it('does not offer candidates or master data with missing ids', async () => {
        await startResolution([{ingredientType: 'HOP', sourceName: 'Hopfen', candidates: [{ingredientId: undefined as any, name: 'Ungültiger Kandidat', matchType: 'UNKNOWN'}]}], {MALT: [], HOP: [{id: undefined as any, name: 'Ungültige Stammdaten'}], YEAST: [], ADDITIONAL_INGREDIENT: []});
        fireEvent.mouseDown(screen.getByLabelText('Lokale Zuordnung'));
        expect(screen.queryByRole('option', {name: 'Ungültiger Kandidat'})).not.toBeInTheDocument();
        expect(screen.queryByRole('option', {name: 'Ungültige Stammdaten'})).not.toBeInTheDocument();
    });

    it.each(['undefined', 'null'])('does not complete resolution for invalid mapping %s', async invalidId => {
        const {onImport} = await startResolution([{ingredientType: 'HOP', sourceName: 'Hopfen', candidates: [{ingredientId: invalidId, name: `Ungültig ${invalidId}`, matchType: 'UNKNOWN'}]}]);
        expect(screen.queryByText(`Ungültig ${invalidId}`)).not.toBeInTheDocument();
        const retry = screen.getByRole('button', {name: 'Import abschließen'});
        expect(retry).toBeDisabled();
        fireEvent.click(retry);
        expect(onImport).toHaveBeenCalledTimes(1);
    });

    it('does not retry when one of mixed mappings is invalid', async () => {
        const {onImport} = await startResolution([
            {ingredientType: 'MALT', sourceName: 'Malz', candidates: [{ingredientId: 'm-1', name: 'Pilsener', matchType: 'EXACT'}]},
            {ingredientType: 'HOP', sourceName: 'Hopfen', candidates: [{ingredientId: 'undefined', name: 'Defekt', matchType: 'UNKNOWN'}]},
        ]);
        await waitFor(() => expect(screen.getByText('1 von 2 zugeordnet.')).toBeInTheDocument());
        const retry = screen.getByRole('button', {name: 'Import abschließen'});
        expect(retry).toBeDisabled();
        fireEvent.click(retry);
        expect(onImport).toHaveBeenCalledTimes(1);
    });

    it('sends valid mappings for multiple ingredient types unchanged', async () => {
        const {onImport} = await startResolution([
            {ingredientType: 'MALT', sourceName: 'Malz', candidates: [{ingredientId: 4, name: 'Pilsener', matchType: 'EXACT'}]},
            {ingredientType: 'YEAST', sourceName: 'Hefe', candidates: []},
        ], {MALT: [], HOP: [], YEAST: [{id: 'y-2', name: 'Lagerhefe'}], ADDITIONAL_INGREDIENT: []});
        await waitFor(() => expect(screen.getByText('1 von 2 zugeordnet.')).toBeInTheDocument());
        fireEvent.mouseDown(screen.getAllByLabelText('Lokale Zuordnung')[1]); fireEvent.click(screen.getByRole('option', {name: 'Lagerhefe'}));
        fireEvent.click(screen.getByRole('button', {name: 'Import abschließen'}));
        expect(onImport).toHaveBeenLastCalledWith(expect.objectContaining({ingredientMappings: [
            {ingredientType: 'MALT', sourceName: 'Malz', ingredientId: '4'},
            {ingredientType: 'YEAST', sourceName: 'Hefe', ingredientId: 'y-2'},
        ]}));
    });

    it('deduplicates candidates and master data by id', async () => {
        await startResolution([{ingredientType: 'HOP', sourceName: 'Hopfen', candidates: [{ingredientId: 8, name: 'Kandidat', matchType: 'FUZZY'}]}], {MALT: [], HOP: [{id: 8, name: 'Stammdaten-Duplikat'}], YEAST: [], ADDITIONAL_INGREDIENT: []});
        fireEvent.mouseDown(screen.getByLabelText('Lokale Zuordnung'));
        expect(screen.getAllByRole('option', {name: /Kandidat/})).toHaveLength(1);
        expect(screen.queryByRole('option', {name: 'Stammdaten-Duplikat'})).not.toBeInTheDocument();
    });

    it('preselects the unique highest scored backend candidate', async () => {
        await startResolution([{ingredientType: 'MALT', sourceName: 'Caramünch II', candidates: [
            {ingredientId: 'm-2', name: 'Caramünch 2', matchType: 'FUZZY', score: 0.94},
            {ingredientId: 'm-3', name: 'Caramünch 3', matchType: 'FUZZY', score: 0.71},
        ]}]);
        await waitFor(() => expect(screen.getByLabelText('Lokale Zuordnung')).toHaveTextContent('Caramünch 2'));
        expect(screen.getByRole('button', {name: 'Import abschließen'})).toBeEnabled();
    });

    it('does not preselect tied candidates and explains why completion is disabled', async () => {
        const {onImport} = await startResolution([{ingredientType: 'MALT', sourceName: 'Caramalz', candidates: [
            {ingredientId: 'm-2', name: 'Caramünch 2', matchType: 'FUZZY', score: 0.9},
            {ingredientId: 'm-3', name: 'Caramünch 3', matchType: 'FUZZY', score: 0.9},
        ]}]);
        await waitFor(() => expect(screen.getByText('Noch 1 Zutat muss zugeordnet werden.')).toBeInTheDocument());
        expect(screen.getByText('Zuordnung erforderlich')).toBeInTheDocument();
        const retry = screen.getByRole('button', {name: 'Import abschließen'});
        expect(retry).toBeDisabled(); fireEvent.click(retry);
        expect(onImport).toHaveBeenCalledTimes(1);
    });

    it('leaves an ingredient without candidates open for a manual choice', async () => {
        await startResolution([{ingredientType: 'ADDITIONAL_INGREDIENT', sourceName: 'Eichenholzchips', candidates: []}]);
        await waitFor(() => expect(screen.getByText('0 von 1 zugeordnet.')).toBeInTheDocument());
        expect(screen.getByLabelText('Lokale Zuordnung')).toHaveTextContent('Bitte auswählen');
    });

    it('keeps a manual choice instead of restoring the suggested candidate on rerender', async () => {
        const masterData = {MALT: [{id: 'm-3', name: 'Caramünch 3'}], HOP: [], YEAST: [], ADDITIONAL_INGREDIENT: []};
        const {rerender, result} = await startResolution([{ingredientType: 'MALT', sourceName: 'Caramünch II', candidates: [{ingredientId: 'm-2', name: 'Caramünch 2', matchType: 'FUZZY'}]}], masterData);
        await waitFor(() => expect(screen.getByLabelText('Lokale Zuordnung')).toHaveTextContent('Caramünch 2'));
        fireEvent.mouseDown(screen.getByLabelText('Lokale Zuordnung')); fireEvent.click(screen.getByRole('option', {name: 'Caramünch 3'}));
        rerender(<RecipeImportDialog open onCancel={jest.fn()} onImport={jest.fn()} result={result} masterData={masterData} />);
        expect(screen.getByLabelText('Lokale Zuordnung')).toHaveTextContent('Caramünch 3');
        expect(screen.getByText('Manuell gewählt')).toBeInTheDocument();
    });

    it('does not attach a cancelled resolution response to a newly opened dialog', async () => {
        const onCancel = jest.fn();
        const result = resolutionResult([{ingredientType: 'MALT', sourceName: 'Altes Malz', candidates: []}]);
        const {rerender} = render(<RecipeImportDialog open onCancel={onCancel} onImport={jest.fn()} result={result} />);

        expect(screen.getByText('Rezept importieren')).toBeInTheDocument();
        expect(screen.queryByText('Altes Malz')).not.toBeInTheDocument();
        selectFormat('Brauhaus');
        selectFile(jsonFile('{"name":"Neu"}'));
        await waitFor(() => expect(screen.getByRole('button', {name: 'Importieren'})).toBeEnabled());

        rerender(<RecipeImportDialog open={false} onCancel={onCancel} onImport={jest.fn()} result={result} />);
        rerender(<RecipeImportDialog open onCancel={onCancel} onImport={jest.fn()} result={result} />);

        expect(screen.getByText('Rezept importieren')).toBeInTheDocument();
        expect(screen.queryByText('Altes Malz')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Importieren'})).toBeDisabled();
    });

    it('blocks a second retry while the first request is pending', async () => {
        const {onImport} = await startResolution([{ingredientType: 'HOP', sourceName: 'Hallertau', candidates: [{ingredientId: 'h-1', name: 'Hallertauer', matchType: 'FUZZY'}]}]);
        const retry = await screen.findByRole('button', {name: 'Import abschließen'});
        fireEvent.click(retry); fireEvent.click(retry);
        expect(onImport).toHaveBeenCalledTimes(2); // initial analysis plus exactly one retry
        expect(screen.getByRole('button', {name: /Import abschließen/})).toBeDisabled();
    });
});
