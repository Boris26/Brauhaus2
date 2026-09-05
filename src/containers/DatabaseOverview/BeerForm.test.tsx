import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {BeerForm} from './BeerForm';
import {HopUsage} from '../../enums/eHopUsage';
import {HopTimeUnit} from '../../enums/eHopTimeUnit';
import {ProcedureType} from '../../enums/eProcedureType';
import {RestExecutionMode} from '../../enums/eRestExecutionMode';
import {Beer} from '../../model/Beer';
import {FermentationTriggerType, FermentationTriggerUnit} from '../../model/FermentationRecipeAction';

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
    fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));
    fireEvent.change(screen.getByLabelText('Kochzeit im Brauprozess'), {target: {value: '60'}});
    fireEvent.change(within(screen.getByText('Einmaischen').closest('tr')!).getByRole('spinbutton'), {target: {value: '57'}});
    fireEvent.change(within(screen.getByText('Abmaischen').closest('tr')!).getByRole('spinbutton'), {target: {value: '78'}});

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

it('synchronizes one form-state action per local field change', () => {
    const saveBeerFormState = jest.fn();
    renderBeerForm({saveBeerFormState});
    fireEvent.change(screen.getByLabelText(/Name:/), {target: {value: 'Helles'}});
    expect(saveBeerFormState).toHaveBeenCalledTimes(1);
    expect(saveBeerFormState).toHaveBeenLastCalledWith(expect.objectContaining({name: 'Helles'}));
});

const expectProcedureTypeOptions = (select: HTMLElement) => {
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
        text: option.textContent,
    }))).toEqual([
        {value: ProcedureType.RAST, label: 'Rast', text: 'Rast'},
        {value: ProcedureType.DECOCTION, label: 'Dekoktion', text: 'Dekoktion'},
    ]);
};

describe('BeerForm accordions', () => {
    it('shows only usage-specific hop time units and defaults invalid units after usage changes', () => {
        renderBeerForm({beerFormState: {hopsDTO: [{
            id: 'h1', name: 'Hallertauer Mittelfrüh', quantity: 10, time: 3,
            usage: HopUsage.DRY_HOP, timeUnit: HopTimeUnit.DAYS,
        }]}});
        fireEvent.click(screen.getByRole('button', {name: /Hopfen/}));

        const hopRow = screen.getByDisplayValue('Hallertauer Mittelfrüh').closest('tr')!;
        const usageSelect = within(hopRow).getByDisplayValue('Hopfen stopfen');
        const unitSelect = within(hopRow).getByDisplayValue('Tage');
        expect(within(unitSelect).getAllByRole('option').map((option) => option.textContent)).toEqual([
            'Keine Einheit', 'Stunden', 'Tage',
        ]);

        fireEvent.change(usageSelect, {target: {value: HopUsage.WHIRLPOOL}});

        expect(within(hopRow).getByDisplayValue('Whirlpool')).toBeInTheDocument();
        expect(within(hopRow).getByDisplayValue('Minuten')).toBeInTheDocument();
        expect(within(unitSelect).getAllByRole('option').map((option) => option.textContent)).toEqual([
            'Keine Einheit', 'Minuten', 'Stunden',
        ]);
    });

    it('always renders fixed steps and no time inputs for mash-in and mash-out', () => {
        renderBeerForm({beerFormState: {fermentationSteps: []}});
        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));

        for (const type of ['Einmaischen', 'Abmaischen', 'Kochen']) {
            expect(screen.getByText(type)).toBeInTheDocument();
        }
        const mashInRow = screen.getByText('Einmaischen').closest('tr')!;
        const mashOutRow = screen.getByText('Abmaischen').closest('tr')!;
        expect(within(mashInRow).getAllByText('–')).toHaveLength(2);
        expect(within(mashOutRow).getAllByText('–')).toHaveLength(2);
        expect(within(mashInRow).getAllByRole('spinbutton')).toHaveLength(1);
        expect(within(mashOutRow).getAllByRole('spinbutton')).toHaveLength(1);
    });

    it('shows cooking values only in the brew process and keeps temperature read-only', () => {
        renderBeerForm();
        expect(screen.queryByLabelText(/Kochtemperatur:/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Kochzeit \(min\):/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));
        const cookingRow = screen.getByText('Kochen').closest('tr')!;
        expect(within(cookingRow).getByLabelText('Kochtemperatur im Brauprozess')).toHaveValue(100);
        expect(within(cookingRow).getByLabelText('Kochtemperatur im Brauprozess')).toHaveAttribute('readonly');
        expect(within(cookingRow).getByLabelText('Kochzeit im Brauprozess')).not.toHaveAttribute('readonly');
    });

    it('preserves an existing cooking temperature while showing it read-only in the mash plan', () => {
        const existingBeer: React.ComponentProps<typeof BeerForm>['beers'][number] = {
            id: 'beer-99', name: 'Alt', type: 'Ale', color: 'amber', alcohol: 5, originalwort: 12, bitterness: 30, description: '', rating: 3,
            mashVolume: 18, spargeVolume: 8, cookingTime: 60, cookingTemperatur: 99,
            fermentation: [{type: 'Einmaischen', temperature: 65}, {type: 'Abmaischen', temperature: 78}, {type: 'Kochen', temperature: 100, time: 60}],
            malts: [], wortBoiling: {totalTime: 60, hops: []},
            fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: []},
        };
        renderBeerForm({beers: [existingBeer]});

        fireEvent.change(screen.getByLabelText(/Bier auswählen/), {target: {value: 'beer-99'}});
        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));

        expect(screen.queryByLabelText(/Kochtemperatur:/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('Kochtemperatur im Brauprozess')).toHaveValue(99);
    });

    it('reset keeps one copy of every fixed step after configurable mash steps were added', () => {
        renderBeerForm();
        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));
        fireEvent.click(screen.getByRole('button', {name: /Rast hinzufügen/}));
        fireEvent.click(screen.getByRole('button', {name: /Abbrechen \/ Zurücksetzen/}));
        fireEvent.click(screen.getByRole('button', {name: /Abbrechen \/ Zurücksetzen/}));

        expect(screen.getAllByText('Einmaischen')).toHaveLength(1);
        expect(screen.getAllByText('Abmaischen')).toHaveLength(1);
        expect(screen.getAllByText('Kochen')).toHaveLength(1);
        expect(screen.queryByLabelText(/Typ/)).not.toBeInTheDocument();
    });

    it('opens basic and brewing data initially while keeping table sections collapsed', () => {
        renderBeerForm();

        expect(screen.getByRole('button', {name: /Grunddaten/})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Brauwasser/})).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', {name: /Brauprozess/})).toHaveAttribute('aria-expanded', 'false');
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
            cookingTemperatur: 100,
            fermentationSteps: expect.arrayContaining([expect.objectContaining({type: 'Kochen', temperature: 100, time: 60})]),
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

    it('round-trips a complete dry-hop action without confusing master and action ids', () => {
        const existingBeer: Beer = {
            id: 'beer-1', name: 'IPA', type: 'Ale', color: 'amber', alcohol: 6, originalwort: 14, bitterness: 50, description: '', rating: 4,
            mashVolume: 20, spargeVolume: 10, cookingTime: 60, cookingTemperatur: 100,
            fermentation: [{type: 'Einmaischen', temperature: 57}, {type: 'Abmaischen', temperature: 78}, {type: 'Kochen', temperature: 100, time: 60}],
            malts: [{id: 'm1', name: 'Pilsner Malz', description: '', EBC: 4, quantity: 4000}],
            wortBoiling: {totalTime: 60, hops: [{id: 'h1', actionId: 'recipe-action-uuid', name: 'Hallertauer Mittelfrüh', description: '', alpha: 4, quantity: 80, usage: HopUsage.DRY_HOP, triggerType: FermentationTriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: FermentationTriggerUnit.PLATO, contactTime: 3, contactTimeUnit: FermentationTriggerUnit.DAYS}]},
            fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: [{id: 'y1', name: 'SafAle US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 1}]},
            additionalIngredients: [],
        };
        const {props} = renderBeerForm({beers: [existingBeer]});
        fireEvent.change(screen.getByLabelText(/Bier auswählen/), {target: {value: existingBeer.id}});
        fireEvent.click(screen.getByRole('button', {name: /Rezept speichern/}));
        const submittedHop = (props.onSubmitBeer as jest.Mock).mock.calls[0][0].wortBoiling.hops[0];
        expect(submittedHop).toMatchObject({id: 'h1', actionId: 'recipe-action-uuid', triggerType: FermentationTriggerType.PLATO_THRESHOLD, triggerValue: 5, triggerUnit: FermentationTriggerUnit.PLATO, contactTime: 3, contactTimeUnit: FermentationTriggerUnit.DAYS});
        expect(submittedHop.id).not.toBe(submittedHop.actionId);
        expect(submittedHop).not.toHaveProperty('triggerOffset');
        expect(submittedHop).not.toHaveProperty('triggerPlato');
    });

    it('restores saved fixed steps when cancelling edits to an existing recipe', () => {
        const existingBeer: React.ComponentProps<typeof BeerForm>['beers'][number] = {
            id: 'beer-1', name: 'Alt', type: 'Ale', color: 'amber', alcohol: 5, originalwort: 12, bitterness: 30, description: '', rating: 3,
            mashVolume: 18, spargeVolume: 8, cookingTime: 60, cookingTemperatur: 99,
            fermentation: [{type: 'Einmaischen', temperature: 57}, {type: 'Abmaischen', temperature: 78}, {type: 'Kochen', temperature: 99, time: 60}],
            malts: [], wortBoiling: {totalTime: 60, hops: []},
            fermentationMaturation: {fermentationTemperature: 18, carbonation: 5, yeast: []},
        };
        renderBeerForm({beers: [existingBeer]});
        fireEvent.change(screen.getByLabelText(/Bier auswählen/), {target: {value: 'beer-1'}});
        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));
        fireEvent.change(within(screen.getByText('Einmaischen').closest('tr')!).getByRole('spinbutton'), {target: {value: '65'}});

        fireEvent.click(screen.getByRole('button', {name: /Abbrechen \/ Zurücksetzen/}));

        expect(within(screen.getByText('Einmaischen').closest('tr')!).getByRole('spinbutton')).toHaveValue(57);
        expect(screen.getAllByText('Einmaischen')).toHaveLength(1);
        expect(screen.getAllByText('Abmaischen')).toHaveLength(1);
        expect(screen.getAllByText('Kochen')).toHaveLength(1);
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

    it('shows and clears the decoction assignment error immediately after procedure type changes', () => {
        renderBeerForm({beerFormState: {fermentationSteps: [
            {type: 'Rast 1', temperature: 65, time: 10, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.TIMED},
            {type: 'Rast 2', temperature: 68, time: 10, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.TIMED},
        ]}});
        fireEvent.click(screen.getByRole('button', {name: /Brauprozess/}));

        fireEvent.change(screen.getByLabelText('Typ 2'), {target: {value: ProcedureType.DECOCTION}});
        expect(screen.getByText('Bitte ordne der Dekoktion eine Rast zu.')).toBeInTheDocument();
        expect(screen.getByLabelText('Zugehörige Rast 2')).toHaveAttribute('aria-invalid', 'true');

        fireEvent.change(screen.getByLabelText('Typ 2'), {target: {value: ProcedureType.RAST}});
        expect(screen.queryByText('Bitte ordne der Dekoktion eine Rast zu.')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Typ 2')).toHaveAttribute('aria-invalid', 'false');
    });

    it('blocks saving when a decoction has no assigned rast', () => {
        const {props} = renderBeerForm({beerFormState: {fermentationSteps: [
            {type: 'Dekoktion', procedureType: ProcedureType.DECOCTION, executionMode: RestExecutionMode.CONFIRMATION_HOLD},
            {type: 'Rast 1', temperature: 65, time: 10, procedureType: ProcedureType.RAST, executionMode: RestExecutionMode.TIMED},
        ]}});
        fillValidRecipe();

        fireEvent.click(screen.getByRole('button', {name: /Rezept speichern/}));

        expect(screen.getByText(/Bitte prüfe den Brauprozess: Bitte ordne der Dekoktion eine Rast zu/)).toBeInTheDocument();
        expect(props.onSubmitBeer).not.toHaveBeenCalled();
    });
    it('shows the concise success message for an import without metadata', () => {
        renderBeerForm({importResult: {
            recipe: {id: 'beer-1', name: 'Import'} as Beer,
            warnings: [],
            ingredientMappings: [],
            createdMasterData: [],
            replayed: false,
        }});

        expect(screen.getByText('Rezept erfolgreich importiert.')).toBeInTheDocument();
    });

    it('does not include warnings, mappings or created master data in the success message', () => {
        renderBeerForm({importResult: {
            recipe: {id: 'beer-1', name: 'Import'} as Beer,
            warnings: [{code: 'SOURCE_INFORMATION_IGNORED', message: 'Eine Quellenangabe wurde ignoriert.'}],
            ingredientMappings: [{sourceName: 'Pilsner Malt', resolvedName: 'Pilsener Malz', ingredientId: 'm1', ingredientType: 'MALT', matchType: 'ALIAS'}],
            createdMasterData: [{ingredientId: 'h1', ingredientType: 'HOP', name: 'Hopfen XYZ'}],
            replayed: true,
        }});

        expect(screen.getByText('Rezept erfolgreich importiert.')).toBeInTheDocument();
        expect(screen.queryByText(/Pilsner Malt/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Hopfen XYZ/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Eine Quellenangabe wurde ignoriert/)).not.toBeInTheDocument();
    });

});
