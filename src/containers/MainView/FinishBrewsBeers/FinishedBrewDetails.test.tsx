import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewDetailsView} from './FinishedBrewDetails';
import {eBrewState} from '../../../enums/eBrewState';

const brew: any = {id: 'brew-1', name: 'West Coast IPA', startDate: '2026-09-01', fermentationStartedAt: '2026-09-01T12:00:00+02:00', liters: 20, originalwort: 13.2, residual_extract: null, note: '', active: true, state: eBrewState.FERMENTATION};
const base: any = {brew, details: {measurements: [], actions: [], devices: [], sensorMeasurements: []}, bubbleActivity: [], bubbleActivityRange: '24h', bubbleActivityLoading: false, activeBrews: [brew], loading: false, saving: false, savingLifecycle: false, completing: [], skipping: [], assigning: [], load: jest.fn(), loadBubbleActivity: jest.fn(), save: jest.fn(), complete: jest.fn(), skip: jest.fn(), transition: jest.fn(), assign: jest.fn()};

describe('fermentation details dashboard', () => {
  it('shows the compact current-state dashboard with neutral missing values', () => {
    render(<FinishedBrewDetailsView {...base} />);

    expect(screen.getByText('West Coast IPA')).toBeInTheDocument();
    expect(screen.getByText(/Gärung · Gärtag/)).toBeInTheDocument();
    expect(screen.getByText('Reifung starten')).toBeInTheDocument();
    expect(screen.getByText('Bier fertigstellen')).toBeInTheDocument();
    expect(screen.getByText('Biertemperatur')).toBeInTheDocument();
    expect(screen.getByText('Außentemperatur')).toBeInTheDocument();
    expect(screen.getByText('Plato')).toBeInTheDocument();
    expect(screen.getAllByText('–')).toHaveLength(3);
    expect(screen.getByText('Kein Sensor zugeordnet.')).toBeInTheDocument();
    expect(screen.getByText('Keine Aktion geplant.')).toBeInTheDocument();
    expect(screen.queryByText('Messverlauf')).not.toBeInTheDocument();
  });

  it('uses current readings, sensor status, latest measurement, next action and a compact trend', () => {
    const complete = jest.fn(); const assign = jest.fn();
    const details: any = {
      measurements: [
        {id: 'm1', finishedBeerId: 'brew-1', measuredAt: '2026-09-02T18:00:00Z', beerTemperatureC: 18.1, plato: 7.2, source: 'MANUAL'},
        {id: 'm2', finishedBeerId: 'brew-1', measuredAt: '2026-09-04T18:00:00Z', beerTemperatureC: 18.3, ambientTemperatureC: 17.6, plato: 4.2, source: 'SENSOR'},
      ],
      actions: [{actionId: 'a', status: 'PENDING', due: true, sourceType: 'HINZUFÜGEN', name: 'Citra', amount: 80, unit: 'g'}],
      devices: [{id: 'd', name: 'FERM-01', lastSeenAt: new Date().toISOString()}],
      sensorMeasurements: [{id: 's', deviceId: 'd', measuredAt: '2026-09-03T18:00:00Z', beerTemperature: 18.3, ambientTemperature: 17.6}],
    };
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} assign={assign} />);

    expect(screen.getByText('18,3 °C')).toBeInTheDocument();
    expect(screen.getByText('17,6 °C')).toBeInTheDocument();
    expect(screen.getByText('4,2 °P')).toBeInTheDocument();
    expect(screen.getByText('FERM-01')).toBeInTheDocument();
    expect(screen.getByText('● Online')).toBeInTheDocument();
    expect(screen.getByRole('img', {name: /Plato-Verlauf/})).toBeInTheDocument();
    fireEvent.click(screen.getByText('Als ausgeführt bestätigen')); expect(complete).toHaveBeenCalledWith('brew-1', 'a');
    fireEvent.click(screen.getByText('West Coast IPA', {selector: 'button'})); expect(assign).toHaveBeenCalledWith('d', 'brew-1');
  });

  it('moves full histories and measurement entry to the separate measurements view', () => {
    const save = jest.fn(); const closeMeasurements = jest.fn();
    render(<FinishedBrewDetailsView {...base} save={save} viewMode="measurements" closeMeasurements={closeMeasurements} />);

    expect(screen.getByText('Messdaten · West Coast IPA')).toBeInTheDocument();
    expect(screen.getByText('Aktueller Zustand')).toBeInTheDocument();
    expect(screen.getByText('Verlauf')).toBeInTheDocument();
    expect(screen.getByText('Gäraktivität')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Gäraktivität gemessen.')).toBeInTheDocument();
    expect(screen.queryByText('Messhistorie')).not.toBeInTheDocument();
    expect(screen.queryByText('Gärsensor-Messungen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Neue Messung')); fireEvent.click(screen.getByText('Speichern'));
    expect(screen.getByText('Mindestens eine Temperatur oder Plato ist erforderlich.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Datum / Uhrzeit'), {target: {value: '2026-09-04T18:30'}});
    fireEvent.change(screen.getByLabelText('Biertemperatur °C'), {target: {value: '18.3'}});
    fireEvent.click(screen.getByText('Speichern'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({finishedBeerId: 'brew-1', beerTemperatureC: 18.3, ambientTemperatureC: undefined, plato: undefined, measuredAt: expect.stringContaining('2026-09-04')}));
    fireEvent.change(screen.getByLabelText('Biertemperatur °C'), {target: {value: ''}});
    fireEvent.change(screen.getByLabelText('Außentemperatur °C'), {target: {value: '17.2'}});
    fireEvent.click(screen.getByText('Speichern'));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({beerTemperatureC: undefined, ambientTemperatureC: 17.2, plato: undefined}));
    fireEvent.click(screen.getByText('← Fertige Biere'));
    expect(closeMeasurements).toHaveBeenCalledTimes(1);
  });

  it('loads bubble activity ranges and keeps its loading and error states local', () => {
    const loadBubbleActivity = jest.fn();
    const {rerender} = render(<FinishedBrewDetailsView {...base} viewMode="measurements" loadBubbleActivity={loadBubbleActivity} bubbleActivityLoading />);
    expect(loadBubbleActivity).toHaveBeenCalledWith('brew-1', '24h');
    expect(screen.getByText('Gäraktivität wird geladen …')).toBeInTheDocument();
    for (const [label, range] of [['6 h', '6h'], ['7 Tage', '7d'], ['Alles', 'all']]) {
      fireEvent.click(screen.getByText(label)); expect(loadBubbleActivity).toHaveBeenCalledWith('brew-1', range);
    }
    rerender(<FinishedBrewDetailsView {...base} viewMode="measurements" loadBubbleActivity={loadBubbleActivity} bubbleActivityError="HTTP 500" />);
    expect(screen.getByText('Die Gäraktivität konnte nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Verlauf')).toBeInTheDocument();
  });

  it('navigates from the compact beer detail to its measurement route', () => {
    const openMeasurements = jest.fn();
    render(<FinishedBrewDetailsView {...base} openMeasurements={openMeasurements} />);

    fireEvent.click(screen.getByText('Messdaten öffnen'));
    expect(openMeasurements).toHaveBeenCalledWith('brew-1');
  });

  it('offers only centrally allowed lifecycle transitions', () => {
    const transition = jest.fn();
    const {rerender} = render(<FinishedBrewDetailsView {...base} transition={transition} />);
    fireEvent.click(screen.getByText('Reifung starten'));
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({state: eBrewState.MATURATION}));
    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.MATURATION}} transition={transition} />);
    expect(screen.queryByText('Reifung starten')).not.toBeInTheDocument();
    expect(screen.getByText('Bier fertigstellen')).toBeInTheDocument();
    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.FINISHED, active: false}} transition={transition} />);
    expect(screen.queryByText('Reifung starten')).not.toBeInTheDocument();
    expect(screen.queryByText('Bier fertigstellen')).not.toBeInTheDocument();
  });

  it('allows MANUAL + PENDING without due and never offers skipped actions', () => {
    const complete = jest.fn();
    const skip = jest.fn();
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'manual', status: 'PENDING', due: false, triggerType: 'MANUAL', sourceType: 'ZUGABE'},
      {actionId: 'skipped', status: 'SKIPPED', due: true, triggerType: 'MANUAL', sourceType: 'ZUGABE'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} skip={skip} viewMode="measurements" />);
    expect(screen.getAllByText('Als zugegeben markieren')).toHaveLength(1);
    fireEvent.click(screen.getByText('Als zugegeben markieren'));
    expect(complete).toHaveBeenCalledWith(brew.id, 'manual');
    expect(screen.getAllByText('Überspringen')).toHaveLength(1);
    fireEvent.click(screen.getByText('Überspringen'));
    expect(skip).toHaveBeenCalledWith(brew.id, 'manual');
  });
  it('shows localized pending and completed fermentation actions with backend timestamps', () => {
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'hop', status: 'PENDING', due: false, triggerType: 'TIME_OFFSET', triggerValue: 4, triggerUnit: 'DAYS', sourceType: 'DRY_HOP', name: 'Citra', amount: 50, unit: 'GRAMS', contactTime: 72, contactTimeUnit: 'HOURS'},
      {actionId: 'spice', status: 'COMPLETED', triggerType: 'PLATO_THRESHOLD', triggerValue: 5, triggerUnit: 'PLATO', sourceType: 'ADDITIONAL_INGREDIENT', name: 'Koriandersamen', amount: 1, unit: 'PIECES', completedAt: '2026-09-11T10:22:00Z', contactEndsAt: '2026-09-14T10:22:00Z'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" />);
    expect(screen.getByText('Citra · 50 g')).toBeInTheDocument();
    expect(screen.getByText('Hopfen')).toBeInTheDocument();
    expect(screen.getByText('4 Tage nach Gärbeginn')).toBeInTheDocument();
    expect(screen.getByText('3 Tage')).toBeInTheDocument();
    expect(screen.getByText('Koriandersamen · 1 Stück')).toBeInTheDocument();
    expect(screen.getByText('Zutat')).toBeInTheDocument();
    expect(screen.getByText('bei ≤ 5 °P')).toBeInTheDocument();
    expect(screen.getByText(/11\.09\.26, 10:22/)).toBeInTheDocument();
    expect(screen.getByText(/Kontaktzeit (läuft|beendet)/)).toBeInTheDocument();
  });
  it('does not infer fermentationStartedAt or a fermentation day from legacy startDate', () => {
    render(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationStartedAt: undefined, startDate: '2020-01-01'}} />);
    expect(screen.getByText(/Gärbeginn:/)).toHaveTextContent('Gärbeginn: –');
    expect(screen.queryByText(/Gärtag/)).not.toBeInTheDocument();
  });
});
