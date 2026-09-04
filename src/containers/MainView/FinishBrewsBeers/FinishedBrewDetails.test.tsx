import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewDetailsView} from './FinishedBrewDetails';
import {eBrewState} from '../../../enums/eBrewState';

const brew: any = {id: 'brew-1', name: 'West Coast IPA', startDate: '2026-09-01', liters: 20, originalwort: 13.2, residual_extract: null, note: '', active: true, state: eBrewState.FERMENTATION};
const base: any = {brew, details: {measurements: [], actions: [], devices: [], sensorMeasurements: []}, activeBrews: [brew], loading: false, saving: false, completing: [], assigning: [], load: jest.fn(), save: jest.fn(), complete: jest.fn(), assign: jest.fn()};

describe('fermentation details', () => {
  it('shows the empty state and validates at least one manual value', () => {
    render(<FinishedBrewDetailsView {...base} />);
    expect(screen.getByText('Keine Messwerte vorhanden.')).toBeInTheDocument(); expect(screen.getByText('Kein Sensor zugeordnet.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Neue Messung')); fireEvent.click(screen.getByText('Speichern'));
    expect(screen.getByText('Mindestens Temperatur oder Plato ist erforderlich.')).toBeInTheDocument(); expect(base.save).not.toHaveBeenCalled();
  });
  it('submits temperature-only data with the selected finished beer and editable date', () => {
    const save = jest.fn(); render(<FinishedBrewDetailsView {...base} save={save} />); fireEvent.click(screen.getByText('Neue Messung'));
    fireEvent.change(screen.getByLabelText('Datum / Uhrzeit'), {target: {value: '2026-09-04T18:30'}}); fireEvent.change(screen.getByLabelText('Temperatur °C'), {target: {value: '18.3'}}); fireEvent.click(screen.getByText('Speichern'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({finishedBeerId: 'brew-1', temperature: 18.3, plato: undefined, measuredAt: expect.stringContaining('2026-09-04')}));
  });
  it('renders measurements, generic actions, sensor values and assignment choices', () => {
    const complete = jest.fn(); const assign = jest.fn();
    const details: any = {measurements: [{id: 'm', finishedBeerId: 'brew-1', measuredAt: '2026-09-04T18:00:00Z', plato: 4.2}], actions: [{id: 'a', finishedBeerId: 'brew-1', scheduledAt: '2026-09-04', state: 'PLANNED', type: 'HINZUFÜGEN', ingredientName: 'Citra', amount: 80, unit: 'g'}], devices: [{id: 'd', name: 'FERM-01', lastSeenAt: '2026-09-04T17:55:00Z'}], sensorMeasurements: [{id: 's', deviceId: 'd', measuredAt: '2026-09-04T18:00:00Z', beerTemperature: 18.3, ambientTemperature: 17.6, bubbleCount: 17, windowSeconds: 300}]};
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} assign={assign} />);
    expect(screen.getByText(/4,2 °P/)).toBeInTheDocument(); expect(screen.getByText('FERM-01')).toBeInTheDocument(); expect(screen.getByText(/3,4 Blubbs\/min/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Erledigt')); expect(complete).toHaveBeenCalledWith('brew-1', 'a'); fireEvent.click(screen.getByText('West Coast IPA')); expect(assign).toHaveBeenCalledWith('d', 'brew-1');
  });
});
