import {fireEvent, render, screen, within} from '@testing-library/react';
import {FinishedBrewDetailsView} from './FinishedBrewDetails';
import {eBrewState} from '../../../enums/eBrewState';

const brew: any = {id: 'brew-1', name: 'West Coast IPA', startDate: '2026-09-01', fermentationStartedAt: '2026-09-01T12:00:00+02:00', liters: 20, originalwort: 13.2, residual_extract: null, note: '', active: true, state: eBrewState.FERMENTATION};
const base: any = {brew, details: {measurements: [], actions: [], devices: [], sensorMeasurements: []}, bubbleActivity: [], bubbleActivityRange: '24h', bubbleActivityLoading: false, activeBrews: [brew], loading: false, saving: false, savingLifecycle: false, startingFermentation: false, completing: [], completeActionErrors: {}, dismissCompleteError: jest.fn(), skipping: [], assigning: [], unassigning: [], updatingDeviceDisplayNames: [], deviceDisplayNameErrors: {}, sensorsByDeviceUid: {}, load: jest.fn(), loadBubbleActivity: jest.fn(), save: jest.fn(), complete: jest.fn(), skip: jest.fn(), transition: jest.fn(), startFermentation: jest.fn(), assign: jest.fn(), unassign: jest.fn(), updateDeviceDisplayName: jest.fn()};

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
      devices: [{deviceUid: 'd', deviceName: 'FERM-01', lastSeenAt: new Date().toISOString(), activeAssignment: {beerId: 'brew-1'}}],
      sensorMeasurements: [{id: 's', deviceId: 'd', measuredAt: '2026-09-03T18:00:00Z', beerTemperature: 18.3, ambientTemperature: 17.6}],
    };
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} assign={assign} />);

    expect(screen.getByText('18,3 °C')).toBeInTheDocument();
    expect(screen.getByText('17,6 °C')).toBeInTheDocument();
    expect(screen.getByText('4,2 °P')).toBeInTheDocument();
    expect(screen.getByText('FERM-01')).toBeInTheDocument();
    expect(screen.getByText('● Online')).toBeInTheDocument();
    expect(screen.getByRole('img', {name: /Plato-Verlauf/})).toBeInTheDocument();
    fireEvent.click(screen.getByText('Zugabe erledigt')); expect(complete).toHaveBeenCalledWith('brew-1', 'a');
    expect(assign).not.toHaveBeenCalled();
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

  it('keeps the measurement dashboard content in the compact lower grid', () => {
    const details: any = {
      measurements: [
        {id: 'm1', finishedBeerId: 'brew-1', measuredAt: '2026-09-02T18:00:00Z', beerTemperatureC: 18.1, ambientTemperatureC: 17.4, plato: 7.2, source: 'MANUAL'},
        {id: 'm2', finishedBeerId: 'brew-1', measuredAt: '2026-09-04T18:00:00Z', beerTemperatureC: 18.3, ambientTemperatureC: 17.6, plato: 4.2, source: 'SENSOR'},
      ],
      actions: [{actionId: 'a', status: 'PENDING', due: true, sourceType: 'DRY_HOP', name: 'Citra', amount: 80, unit: 'GRAMS'}],
      devices: [{deviceUid: 'mine', deviceName: 'Sensor Keller', activeAssignment: {beerId: 'brew-1'}}],
      sensorMeasurements: [],
    };
    const bubbleActivity: any[] = [{deviceId: 'mine', sequence: 1, bubbleCount: 4, windowSeconds: 60, averagePressureDeltaPa: 2, windowEndedAt: '2026-09-04T18:00:00Z'}];
    const {container} = render(<FinishedBrewDetailsView {...base} brew={{...brew, brewValues: JSON.stringify({groupedData: {}})}} details={details} bubbleActivity={bubbleActivity} viewMode="measurements" />);

    const currentValues = container.querySelector('.fermentation-current-grid') as HTMLElement;
    expect(currentValues.children).toHaveLength(5);
    expect(screen.getByRole('img', {name: 'Zeitlicher Verlauf von Temperatur und Plato'})).toBeInTheDocument();
    expect(screen.getByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/})).toBeInTheDocument();

    const lowerGrid = container.querySelector('.fermentation-measurements-lower-grid') as HTMLElement;
    expect(lowerGrid).toBeInTheDocument();
    expect(lowerGrid.querySelector('.fermentation-measurements-main')).toContainElement(screen.getByRole('heading', {name: 'Letzte Messung'}).parentElement);
    expect(lowerGrid.querySelector('.fermentation-measurements-main')).toContainElement(screen.getByRole('heading', {name: 'Gärungsaktionen'}).parentElement);
    expect(lowerGrid.querySelector('.fermentation-measurements-main details')).toHaveTextContent('Messhistorie (2)');
    expect(lowerGrid.querySelector('.fermentation-measurements-sidebar')).toContainElement(screen.getByRole('heading', {name: 'Gärsensor'}).parentElement);
    expect(screen.getByRole('heading', {name: 'Analyse des Brauprozesses'})).toBeInTheDocument();
  });

  it('reserves the current-state field for measurement runtime while keeping sensor availability below', () => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid: 'mine', deviceName: 'Sensor Keller', activeAssignment: {beerId: 'brew-1'}},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" sensorsByDeviceUid={{mine: {deviceUid: 'mine', status: 'ASSIGNED', beerId: 'brew-1', updatedAt: new Date().toISOString()}}} />);

    const currentState = screen.getByRole('heading', {name: 'Aktueller Zustand'}).parentElement as HTMLElement;
    const runtime = currentState.querySelector('.fermentation-measurement-runtime') as HTMLElement;
    expect(within(currentState).queryByText('Sensor')).not.toBeInTheDocument();
    expect(within(runtime).getByText('Messung')).toBeInTheDocument();
    expect(within(runtime).getByText('–')).toBeInTheDocument();

    const sensorSection = screen.getByRole('heading', {name: 'Gärsensor'}).parentElement as HTMLElement;
    expect(within(sensorSection).getByText('● Online')).toBeInTheDocument();
  });

  it.each([
    ['RUNNING', 'Aktiv', 'is-running'],
    ['PAUSED', 'Pause', 'is-paused'],
    ['IDLE', 'Bereit', 'is-idle'],
  ])('shows assigned %s measurement runtime independently from online status', (measurementState, label, cssClass) => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid: 'mine', deviceName: 'Sensor Keller', activeAssignment: {beerId: 'brew-1'}},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" sensorsByDeviceUid={{mine: {deviceUid: 'mine', status: 'ASSIGNED', beerId: 'brew-1', measurementState, updatedAt: new Date().toISOString()}}} />);

    const runtime = screen.getByText('Messung').parentElement as HTMLElement;
    expect(within(runtime).getByText(label)).toHaveClass('fermentation-runtime-status', cssClass);
    expect(within(runtime).queryByText(label)?.classList.contains('is-running')).toBe(measurementState === 'RUNNING');
    expect(screen.getByText('● Online')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Sensor trennen'})).toBeInTheDocument();
  });

  it('hides runtime from an offline assigned sensor and from another sensor', () => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid: 'mine', deviceName: 'Sensor Keller', activeAssignment: {beerId: 'brew-1'}},
    ]};
    const {rerender} = render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" sensorsByDeviceUid={{mine: {deviceUid: 'mine', status: 'DISCONNECTED', measurementState: 'RUNNING', updatedAt: ''}}} />);
    expect(screen.getByText('Messung').nextSibling).toHaveTextContent('–');
    expect(screen.getByText('● Offline')).toBeInTheDocument();

    rerender(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" sensorsByDeviceUid={{other: {deviceUid: 'other', status: 'ASSIGNED', beerId: 'brew-1', measurementState: 'RUNNING', updatedAt: ''}}} />);
    expect(screen.getByText('Messung').nextSibling).toHaveTextContent('–');
    expect(screen.queryByText('Aktiv')).not.toBeInTheDocument();
  });

  it('uses backend assignments, offers only free devices and dispatches assignment', () => {
    const assign = jest.fn();
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid: 'other', deviceName: 'Sensor Fremdbier', activeAssignment: {beerId: 'brew-2'}, lastSeenAt: new Date().toISOString()},
      {deviceUid: 'free', deviceName: 'Sensor Keller', activeAssignment: null},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" assign={assign} sensorsByDeviceUid={{other: {deviceUid: 'other', status: 'ASSIGNED', beerId: 'brew-1', updatedAt: new Date().toISOString()}, free: {deviceUid: 'free', status: 'REGISTERED', updatedAt: new Date().toISOString()}}} />);
    expect(screen.getByText('Kein Sensor zugeordnet.')).toBeInTheDocument();
    expect(screen.getByText('Messung').nextSibling).toHaveTextContent('–');
    expect(screen.getByRole('option', {name: 'Sensor Keller · Online'})).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: /Sensor Fremdbier/})).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sensor auswählen'), {target: {value: 'free'}});
    fireEvent.click(screen.getByRole('button', {name: 'Sensor zuweisen'}));
    expect(assign).toHaveBeenCalledWith('free', 'brew-1');
  });

  it('shows only the assigned sensor online status and confirms separation', () => {
    const unassign = jest.fn();
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid: 'mine', deviceName: 'Sensor Keller', activeAssignment: {beerId: 'brew-1', assignedAt: '2026-09-13T15:20:00Z'}},
      {deviceUid: 'free', deviceName: 'Freier Sensor', activeAssignment: null},
    ]};
    const {rerender} = render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" unassign={unassign} sensorsByDeviceUid={{mine: {deviceUid: 'mine', status: 'DISCONNECTED', updatedAt: ''}, free: {deviceUid: 'free', status: 'REGISTERED', updatedAt: ''}}} />);
    expect(screen.getAllByText('● Offline').length).toBeGreaterThan(0);
    expect(screen.queryByText('● Online')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Sensor trennen'}));
    expect(screen.getByText('Bereits gespeicherte Messwerte bleiben erhalten.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
    expect(unassign).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Sensor trennen'}));
    fireEvent.click(screen.getAllByRole('button', {name: 'Sensor trennen'})[1]);
    expect(unassign).toHaveBeenCalledWith('mine', 'brew-1');
    rerender(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" unassign={unassign} unassigning={['mine']} />);
    expect(screen.getByRole('button', {name: 'Wird getrennt …'})).toBeDisabled();
  });

  it('edits and resets the sensor alias inline without exposing its device UID', () => {
    const updateDeviceDisplayName = jest.fn();
    const deviceUid = '307528d6-76af-4616-a0c1-568e471ff77e';
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [
      {deviceUid, deviceName: 'FERM-1FF77E', displayName: 'Gärtank Garage', activeAssignment: {beerId: 'brew-1', assignedAt: '2026-09-13T15:20:00Z'}},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" updateDeviceDisplayName={updateDeviceDisplayName} sensorsByDeviceUid={{[deviceUid]: {deviceUid, status: 'ASSIGNED', beerId: 'brew-1', updatedAt: new Date().toISOString()}}} />);

    expect(screen.getByText('Gärtank Garage')).toBeInTheDocument();
    expect(screen.queryByText('FERM-1FF77E')).not.toBeInTheDocument();
    expect(screen.queryByText(deviceUid)).not.toBeInTheDocument();
    expect(screen.getByText('● Online')).toBeInTheDocument();
    expect(screen.getByText(/Zugeordnet seit:/)).toBeInTheDocument();
    const edit = screen.getByRole('button', {name: 'Sensor-Alias bearbeiten'});
    expect(edit).toHaveAttribute('title', 'Sensor-Alias bearbeiten');

    fireEvent.click(edit);
    const input = screen.getByRole('textbox', {name: 'Sensor-Alias'});
    expect(input).toHaveValue('Gärtank Garage');
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, {key: 'Escape'});
    expect(screen.queryByRole('textbox', {name: 'Sensor-Alias'})).not.toBeInTheDocument();
    expect(updateDeviceDisplayName).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'Sensor-Alias bearbeiten'}));
    fireEvent.change(screen.getByRole('textbox', {name: 'Sensor-Alias'}), {target: {value: '   '}});
    fireEvent.keyDown(screen.getByRole('textbox', {name: 'Sensor-Alias'}), {key: 'Enter'});
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte einen Sensornamen eingeben.');
    expect(updateDeviceDisplayName).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', {name: 'Sensor-Alias'}), {target: {value: ' Gärtank Garage '}});
    fireEvent.click(screen.getByRole('button', {name: 'Sensor-Alias speichern'}));
    expect(updateDeviceDisplayName).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', {name: 'Sensor-Alias'})).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Sensor-Alias bearbeiten'}));
    fireEvent.change(screen.getByRole('textbox', {name: 'Sensor-Alias'}), {target: {value: ' Sensor Keller '}});
    fireEvent.click(screen.getByRole('button', {name: 'Sensor-Alias speichern'}));
    expect(updateDeviceDisplayName).toHaveBeenCalledWith(deviceUid, 'brew-1', 'Sensor Keller');
    fireEvent.click(screen.getByRole('button', {name: 'Technischen Namen verwenden'}));
    expect(updateDeviceDisplayName).toHaveBeenLastCalledWith(deviceUid, 'brew-1', null);
  });

  it('prefills the technical name when no alias exists and keeps editing open on save errors', () => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [{deviceUid: 'mine', deviceName: 'FERM-01', displayName: null, activeAssignment: {beerId: 'brew-1'}}]};
    const {rerender} = render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" />);
    fireEvent.click(screen.getByRole('button', {name: 'Sensor-Alias bearbeiten'}));
    expect(screen.getByRole('textbox', {name: 'Sensor-Alias'})).toHaveValue('FERM-01');
    rerender(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" deviceDisplayNameErrors={{mine: 'Sensor-Alias konnte nicht gespeichert werden.'}} />);
    expect(screen.getByRole('textbox', {name: 'Sensor-Alias'})).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Sensor-Alias konnte nicht gespeichert werden.');
  });

  it.each([eBrewState.MATURATION, eBrewState.FINISHED])('does not offer new assignments in %s', state => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [{deviceUid: 'free', deviceName: 'Frei', activeAssignment: null}]};
    render(<FinishedBrewDetailsView {...base} brew={{...brew, state}} details={details} viewMode="measurements" />);
    expect(screen.queryByLabelText('Sensor auswählen')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Sensor zuweisen'})).not.toBeInTheDocument();
  });

  it('reports when no free sensor is available and preserves request-specific errors', () => {
    const details: any = {measurements: [], actions: [], sensorMeasurements: [], devices: [{deviceUid: 'other', deviceName: 'Belegt', activeAssignment: {beerId: 'brew-2'}}]};
    render(<FinishedBrewDetailsView {...base} details={details} viewMode="measurements" assignmentError="HTTP 409" />);
    expect(screen.getByText('Kein freier Sensor verfügbar.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Der Sensor konnte nicht zugeordnet werden.HTTP 409');
  });

  it('shows the initial bubble activity loading state without a chart', () => {
    const loadBubbleActivity = jest.fn();
    render(<FinishedBrewDetailsView {...base} viewMode="measurements" loadBubbleActivity={loadBubbleActivity} bubbleActivityLoading />);
    expect(loadBubbleActivity).toHaveBeenCalledWith('brew-1', '24h');
    expect(screen.getByText('Gäraktivität wird geladen …')).toBeInTheDocument();
    expect(screen.queryByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/})).not.toBeInTheDocument();
  });

  it('keeps existing bubble activity mounted while loading another range', () => {
    const loadBubbleActivity = jest.fn();
    const activity: any[] = [{deviceId: 'sensor', sequence: 1, bubbleCount: 4, windowSeconds: 60, windowEndedAt: '2026-09-04T18:00:00Z'}];
    const {rerender} = render(<FinishedBrewDetailsView {...base} viewMode="measurements" loadBubbleActivity={loadBubbleActivity} bubbleActivity={activity} />);
    const chart = screen.getByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/});

    fireEvent.click(screen.getByText('6 h'));
    expect(loadBubbleActivity).toHaveBeenCalledWith('brew-1', '6h');
    rerender(<FinishedBrewDetailsView {...base} viewMode="measurements" loadBubbleActivity={loadBubbleActivity} bubbleActivity={activity} bubbleActivityRange="6h" bubbleActivityLoading />);
    expect(screen.getByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/})).toBe(chart);
    expect(screen.getByRole('status')).toHaveTextContent('Aktualisiere …');

    for (const [label, range] of [['7 Tage', '7d'], ['Alles', 'all']]) {
      fireEvent.click(screen.getByText(label)); expect(loadBubbleActivity).toHaveBeenCalledWith('brew-1', range);
    }
  });

  it('shows existing bubble activity without a loading hint after loading', () => {
    const activity: any[] = [{deviceId: 'sensor', sequence: 1, bubbleCount: 4, windowSeconds: 60, windowEndedAt: '2026-09-04T18:00:00Z'}];
    render(<FinishedBrewDetailsView {...base} viewMode="measurements" bubbleActivity={activity} />);
    expect(screen.getByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/})).toBeInTheDocument();
    expect(screen.queryByText('Aktualisiere …')).not.toBeInTheDocument();
  });

  it('keeps existing bubble activity visible next to a refresh error', () => {
    const activity: any[] = [{deviceId: 'sensor', sequence: 1, bubbleCount: 4, windowSeconds: 60, windowEndedAt: '2026-09-04T18:00:00Z'}];
    render(<FinishedBrewDetailsView {...base} viewMode="measurements" bubbleActivity={activity} bubbleActivityError="HTTP 500" />);
    expect(screen.getByRole('img', {name: /Zeitlicher Verlauf der Gäraktivität/})).toBeInTheDocument();
    expect(screen.getByText('Die Gäraktivität konnte nicht geladen werden.')).toBeInTheDocument();
  });

  it('shows an empty bubble activity state after a successful empty load', () => {
    render(<FinishedBrewDetailsView {...base} viewMode="measurements" />);
    expect(screen.getByText('Noch keine Gäraktivität gemessen.')).toBeInTheDocument();
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
    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.WAITING_FOR_FERMENTATION, fermentationStartedAt: null}} transition={transition} />);
    expect(screen.getByText(/Wartet auf Gärstart/)).toBeInTheDocument();
    expect(screen.queryByText('Reifung starten')).not.toBeInTheDocument();
    expect(screen.queryByText('Bier fertigstellen')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Gärung starten'})).toBeInTheDocument();
  });

  it.each([eBrewState.FERMENTATION, eBrewState.MATURATION, eBrewState.FINISHED])('does not offer fermentation start in %s', state => {
    render(<FinishedBrewDetailsView {...base} brew={{...brew, state}} />);
    expect(screen.queryByRole('button', {name: 'Gärung starten'})).not.toBeInTheDocument();
  });

  it('confirms fermentation start and does not dispatch when cancelled', () => {
    const startFermentation = jest.fn();
    render(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.WAITING_FOR_FERMENTATION, fermentationStartedAt: null}} startFermentation={startFermentation} />);
    fireEvent.click(screen.getByRole('button', {name: 'Gärung starten'}));
    expect(screen.getByText('Die Gärung sollte erst gestartet werden, wenn die Würze auf Anstelltemperatur abgekühlt und die Hefe zugegeben wurde.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
    expect(startFermentation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Gärung starten'}));
    fireEvent.click(screen.getAllByRole('button', {name: 'Gärung starten'})[1]);
    expect(startFermentation).toHaveBeenCalledWith('brew-1');
  });

  it('allows MANUAL + PENDING without due and never offers skipped actions', () => {
    const complete = jest.fn();
    const skip = jest.fn();
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'manual', status: 'PENDING', due: false, triggerType: 'MANUAL', sourceType: 'ZUGABE'},
      {actionId: 'skipped', status: 'SKIPPED', due: true, triggerType: 'MANUAL', sourceType: 'ZUGABE'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} complete={complete} skip={skip} viewMode="measurements" />);
    expect(screen.getAllByText('Zugabe erledigt')).toHaveLength(1);
    fireEvent.click(screen.getByText('Zugabe erledigt'));
    expect(complete).toHaveBeenCalledWith(brew.id, 'manual');
    expect(screen.getAllByText('Überspringen')).toHaveLength(1);
    fireEvent.click(screen.getByText('Überspringen'));
    expect(skip).toHaveBeenCalledWith(brew.id, 'manual');
  });
  it('disables only the action whose completion request is pending', () => {
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'first', status: 'PENDING', due: true, triggerType: 'TIME_OFFSET', triggerValue: 4, triggerUnit: 'DAYS', sourceType: 'DRY_HOP', name: 'Cascade', amount: 50, unit: 'GRAMS'},
      {actionId: 'second', status: 'PENDING', due: true, triggerType: 'MANUAL', sourceType: 'ADDITIONAL_INGREDIENT', name: 'Orange', amount: 35, unit: 'GRAMS'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} completing={['brew-1/first']} viewMode="measurements" />);
    const buttons = screen.getAllByRole('button', {name: /Zugabe erledigt|Wird gespeichert/});
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });
  it('keeps a failed action open and uses the existing error dialog', () => {
    const dismissCompleteError = jest.fn();
    const details: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'failed', status: 'PENDING', due: true, triggerType: 'PLATO_THRESHOLD', triggerValue: 5, triggerUnit: 'PLATO', sourceType: 'DRY_HOP', name: 'Cascade', amount: 50, unit: 'GRAMS'},
    ]};
    render(<FinishedBrewDetailsView {...base} details={details} completeActionErrors={{'brew-1/failed': 'HTTP 409'}} dismissCompleteError={dismissCompleteError} viewMode="measurements" />);
    expect(screen.getByRole('button', {name: 'Zugabe erledigt'})).toBeEnabled();
    expect(screen.getByText('Zugabe konnte nicht bestätigt werden')).toBeInTheDocument();
    expect(screen.getByText('HTTP 409')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Ok'}));
    expect(dismissCompleteError).toHaveBeenCalledWith('brew-1', 'failed');
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
    expect(screen.getByText(/Standzeit (läuft|beendet)/)).toBeInTheDocument();
    expect(screen.getByText('Erledigt')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: 'Zugabe erledigt'})).toHaveLength(0);
  });
  it('does not infer fermentationStartedAt or a fermentation day from legacy startDate', () => {
    render(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationStartedAt: undefined, startDate: '2020-01-01'}} />);
    expect(screen.getByText(/Gärbeginn:/)).toHaveTextContent('Gärbeginn: –');
    expect(screen.queryByText(/Gärtag/)).not.toBeInTheDocument();
  });

  it('uses the FinishedBeer action snapshot, including an explicitly empty array', () => {
    const endpointDetails: any = {measurements: [], devices: [], sensorMeasurements: [], actions: [
      {actionId: 'old', status: 'PENDING', sourceType: 'DRY_HOP', name: 'Altes Rezept', amount: 10, unit: 'GRAMS'},
    ]};
    const snapshot: any[] = [{actionId: 'snapshot', status: 'PENDING', sourceType: 'DRY_HOP', name: 'Sud-Snapshot', amount: 30, unit: 'GRAMS'}];
    const {rerender} = render(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationActions: snapshot}} details={undefined} viewMode="measurements" />);
    expect(screen.getByText('Sud-Snapshot · 30 g')).toBeInTheDocument();

    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationActions: snapshot}} details={endpointDetails} viewMode="measurements" />);
    expect(screen.getByText('Altes Rezept · 10 g')).toBeInTheDocument();
    expect(screen.queryByText(/Sud-Snapshot/)).not.toBeInTheDocument();

    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, fermentationActions: snapshot}} details={{...endpointDetails, actions: []}} viewMode="measurements" />);
    expect(screen.getByText('Keine Gärungsaktionen geplant.')).toBeInTheDocument();
  });
});
