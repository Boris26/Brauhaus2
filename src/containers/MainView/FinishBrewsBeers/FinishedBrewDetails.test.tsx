import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewDetailsView} from './FinishedBrewDetails';
import {eBrewState} from '../../../enums/eBrewState';

const brew: any = {id: 'brew-1', name: 'West Coast IPA', startDate: '2026-09-01', fermentationStartedAt: '2026-09-01T12:00:00+02:00', liters: 20, originalwort: 13.2, residual_extract: null, note: '', active: true, state: eBrewState.FERMENTATION};
const base: any = {brew, details: {measurements: [], actions: [], devices: [], sensorMeasurements: []}, activeBrews: [brew], loading: false, saving: false, savingLifecycle: false, completing: [], assigning: [], load: jest.fn(), save: jest.fn(), complete: jest.fn(), transition: jest.fn(), assign: jest.fn()};

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
        {id: 'm1', finishedBeerId: 'brew-1', measuredAt: '2026-09-02T18:00:00Z', temperature: 18.1, plato: 7.2},
        {id: 'm2', finishedBeerId: 'brew-1', measuredAt: '2026-09-04T18:00:00Z', plato: 4.2},
      ],
      actions: [{id: 'a', finishedBeerId: 'brew-1', scheduledAt: '2099-09-06', state: 'PENDING', due: true, type: 'HINZUFÜGEN', ingredientName: 'Citra', amount: 80, unit: 'g'}],
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
    expect(screen.getByText('Messverlauf')).toBeInTheDocument();
    expect(screen.getByText('Gärsensor-Messungen')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Neue Messung')); fireEvent.click(screen.getByText('Speichern'));
    expect(screen.getByText('Mindestens Temperatur oder Plato ist erforderlich.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Datum / Uhrzeit'), {target: {value: '2026-09-04T18:30'}});
    fireEvent.change(screen.getByLabelText('Temperatur °C'), {target: {value: '18.3'}});
    fireEvent.click(screen.getByText('Speichern'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({finishedBeerId: 'brew-1', temperature: 18.3, plato: undefined, measuredAt: expect.stringContaining('2026-09-04')}));
    fireEvent.click(screen.getByText('← Bier-Detailansicht'));
    expect(closeMeasurements).toHaveBeenCalledTimes(1);
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
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {id: 'manual', finishedBeerId: brew.id, state: 'PENDING', due: false, triggerType: 'MANUAL', type: 'ZUGABE'},
      {id: 'skipped', finishedBeerId: brew.id, state: 'SKIPPED', due: true, triggerType: 'MANUAL', type: 'ZUGABE'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} viewMode="measurements" />);
    expect(screen.getAllByText('Als ausgeführt bestätigen')).toHaveLength(1);
    fireEvent.click(screen.getByText('Als ausgeführt bestätigen'));
    expect(complete).toHaveBeenCalledWith(brew.id, 'manual');
  });
  it('does not infer fermentationStartedAt or a fermentation day from legacy startDate', () => {
    render(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationStartedAt: undefined, startDate: '2020-01-01'}} />);
    expect(screen.getByText(/Gärbeginn:/)).toHaveTextContent('Gärbeginn: –');
    expect(screen.queryByText(/Gärtag/)).not.toBeInTheDocument();
  });
});
