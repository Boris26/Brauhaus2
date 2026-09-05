import React, {useEffect, useMemo, useState} from 'react';
import {connect} from 'react-redux';
import {FinishedBrew} from '../../../model/FinishedBrew';
import {BrewStateGerman, eBrewState} from '../../../enums/eBrewState';
import {FermentationActions} from '../../../actions/fermentation.actions';
import {CreateFermentationMeasurement, FermentationAction, FermentationDetails, FermentationMeasurement} from '../../../model/Fermentation';
import {actionDueLabel, fermentationDay, isDeviceOnline, latestByDate, latestFermentationReadings} from '../../../utils/fermentation';
import BrewProcessChart from './BrewProcessChart';
import './FermentationDetails.css';

interface Props { brew: FinishedBrew; details?: FermentationDetails; activeBrews: FinishedBrew[]; loading: boolean; saving: boolean; completing: string[]; assigning: string[]; error?: string; load: (id: string) => void; save: (value: CreateFermentationMeasurement) => void; complete: (brewId: string, actionId: string) => void; assign: (deviceId: string, brewId: string) => void; }
const number = (value?: number | null, unit = '') => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('de-DE', {maximumFractionDigits: 1})}${unit}` : '–';
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('de-DE', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(value)) : '–';
const actionText = (action: FermentationAction) => [action.amount, action.unit, action.ingredientName, action.type?.toLowerCase()].filter(Boolean).join(' ');

const FermentationTrend: React.FC<{measurements: FermentationMeasurement[]}> = ({measurements}) => {
  const values = [...measurements]
    .filter(measurement => typeof measurement.plato === 'number' && Number.isFinite(measurement.plato) && Number.isFinite(Date.parse(measurement.measuredAt)))
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))
    .slice(-8);
  if (values.length < 2) return <p className="fermentation-empty">Für einen Verlauf werden mindestens zwei Plato-Messungen benötigt.</p>;
  const platoValues = values.map(value => value.plato as number);
  const minimum = Math.min(...platoValues); const maximum = Math.max(...platoValues); const range = Math.max(1, maximum - minimum);
  const points = platoValues.map((value, index) => `${index * 100 / (values.length - 1)},${38 - (value - minimum) * 32 / range}`).join(' ');
  return <div className="fermentation-trend"><svg viewBox="0 0 100 44" role="img" aria-label={`Plato-Verlauf von ${number(platoValues[0], ' °P')} auf ${number(platoValues.at(-1), ' °P')}`} preserveAspectRatio="none"><polyline points={points} /></svg><span>{number(platoValues[0], ' °P')}</span><span>{number(platoValues.at(-1), ' °P')}</span></div>;
};

export const FinishedBrewDetailsView: React.FC<Props> = props => {
  const [measurementPageOpen, setMeasurementPageOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [temperature, setTemperature] = useState(''); const [plato, setPlato] = useState(''); const [note, setNote] = useState(''); const [validation, setValidation] = useState('');
  useEffect(() => { props.load(props.brew.id); }, [props.brew.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (formOpen && !props.saving && !props.error) { setFormOpen(false); setTemperature(''); setPlato(''); setNote(''); } }, [props.saving]); // eslint-disable-line react-hooks/exhaustive-deps
  const details = props.details ?? {measurements: [], actions: [], devices: [], sensorMeasurements: []};
  const measurements = useMemo(() => [...details.measurements].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt)), [details.measurements]);
  const latestSensor = latestByDate(details.sensorMeasurements, value => value.measuredAt);
  const latestMeasurement = latestByDate(
    [...details.measurements, ...details.sensorMeasurements].filter(value => Number.isFinite(Date.parse(value.measuredAt))),
    value => value.measuredAt,
  );
  const readings = latestFermentationReadings(details.measurements, details.sensorMeasurements);
  const nextAction = [...details.actions].filter(action => action.state === 'PLANNED').sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
  const day = fermentationDay(details.phaseStartedAt || String(props.brew.startDate));
  const save = () => { if (!temperature && !plato) { setValidation('Mindestens Temperatur oder Plato ist erforderlich.'); return; } setValidation(''); props.save({finishedBeerId: props.brew.id, measuredAt: new Date(measuredAt).toISOString(), temperature: temperature === '' ? undefined : Number(temperature), plato: plato === '' ? undefined : Number(plato), note}); };
  let groupedData: any; try { groupedData = props.brew.brewValues && JSON.parse(props.brew.brewValues as string).groupedData; } catch (_) { groupedData = undefined; }

  if (measurementPageOpen) return <div className="finished-brew-details fermentation-details fermentation-measurements-page">
    <header className="fermentation-page-header"><div><button className="fermentation-back-button" onClick={() => setMeasurementPageOpen(false)}>← Übersicht</button><h3>Messdaten · {props.brew.name}</h3></div><button onClick={() => setFormOpen(true)}>Neue Messung</button></header>
    {props.loading && <p>Daten werden geladen …</p>}{props.error && <p className="fermentation-error">{props.error}</p>}
    {formOpen && <section className="fermentation-card"><div className="fermentation-form" role="dialog" aria-label="Neue Gärungsmessung"><label>Datum / Uhrzeit<input type="datetime-local" value={measuredAt} onChange={event => setMeasuredAt(event.target.value)} /></label><label>Temperatur °C<input type="number" step="0.1" value={temperature} onChange={event => setTemperature(event.target.value)} /></label><label>Plato °P<input type="number" step="0.1" value={plato} onChange={event => setPlato(event.target.value)} /></label><label>Notiz<textarea value={note} onChange={event => setNote(event.target.value)} /></label>{validation && <p className="fermentation-error">{validation}</p>}<div><button onClick={() => setFormOpen(false)} disabled={props.saving}>Abbrechen</button><button onClick={save} disabled={props.saving}>{props.saving ? 'Speichert …' : 'Speichern'}</button></div></div></section>}
    <div className="fermentation-measurements-grid"><section className="fermentation-card"><h4>Messverlauf</h4>{measurements.length === 0 ? <p>Keine Messwerte vorhanden.</p> : <ul className="fermentation-list">{measurements.map(measurement => <li key={measurement.id}><time>{date(measurement.measuredAt)}</time><strong>{[number(measurement.temperature, ' °C'), number(measurement.plato, ' °P')].join(' · ')}</strong>{measurement.note && <span>{measurement.note}</span>}</li>)}</ul>}</section>
      <section className="fermentation-card"><h4>Gärsensor-Messungen</h4>{details.sensorMeasurements.length === 0 ? <p>Keine Sensormesswerte vorhanden.</p> : <ul className="fermentation-list">{[...details.sensorMeasurements].sort((a,b) => Date.parse(b.measuredAt)-Date.parse(a.measuredAt)).map(sensor => <li key={sensor.id}><time>{date(sensor.measuredAt)}</time><strong>{number(sensor.beerTemperature, ' °C')} · Außen {number(sensor.ambientTemperature, ' °C')}</strong></li>)}</ul>}</section>
      <section className="fermentation-card"><h4>Gärungsaktionen</h4>{details.actions.length === 0 ? <p>Keine Aktionen vorhanden.</p> : <ul className="fermentation-list">{[...details.actions].sort((a,b) => Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt)).map(action => <li key={action.id}><time>{action.state === 'COMPLETED' ? `Erledigt ${date(action.completedAt || undefined)}` : actionDueLabel(action).label}</time><strong>{actionText(action)}</strong>{action.state === 'PLANNED' && <button disabled={props.completing.includes(action.id)} onClick={() => props.complete(props.brew.id, action.id)}>Erledigt</button>}</li>)}</ul>}</section></div>
    {groupedData && <section className="fermentation-card fermentation-analysis"><h4>Analyse des Brauprozesses</h4><BrewProcessChart groupedData={groupedData} /></section>}
  </div>;

  return <div className="finished-brew-details fermentation-details fermentation-dashboard">
    <header className="fermentation-dashboard-header"><div><h3>{props.brew.name}</h3><p className="fermentation-phase">{BrewStateGerman[props.brew.state]}{day ? ` · Tag ${day}` : ''}</p></div><button onClick={() => setMeasurementPageOpen(true)}>Messdaten öffnen</button></header>
    {props.loading && <p>Daten werden geladen …</p>}{props.error && <p className="fermentation-error">{props.error}</p>}
    <section className="fermentation-reading-grid" aria-label="Aktuelle Gärungswerte"><div><span>Biertemperatur</span><strong>{number(readings.beerTemperature, ' °C')}</strong></div><div><span>Außentemperatur</span><strong>{number(readings.ambientTemperature, ' °C')}</strong></div><div><span>Plato</span><strong>{number(readings.plato, ' °P')}</strong></div></section>
    <div className="fermentation-dashboard-grid">
      <section className="fermentation-card fermentation-status-card"><h4>Gärsensor</h4>{details.devices.length === 0 ? <p>Kein Sensor zugeordnet.</p> : details.devices.map(device => <div key={device.id} className="fermentation-device"><strong>{device.name}</strong><span className={isDeviceOnline(device.lastSeenAt) ? 'is-online' : 'is-offline'}>{isDeviceOnline(device.lastSeenAt) ? '● Online' : '● Offline'}</span>{!device.assignedFinishedBeerId && <div className="fermentation-assignment"><span>Bier zuordnen:</span>{props.activeBrews.map(brew => <button key={brew.id} disabled={props.assigning.includes(device.id)} onClick={() => props.assign(device.id, brew.id)}>{brew.name}</button>)}</div>}</div>)}</section>
      <section className="fermentation-card fermentation-status-card"><h4>Letzte Messung</h4><strong className="fermentation-prominent">{date(latestMeasurement?.measuredAt)}</strong><p>{latestSensor ? `Sensor zuletzt ${date(latestSensor.measuredAt)}` : 'Noch keine Sensormessung vorhanden.'}</p></section>
      <section className="fermentation-card fermentation-status-card"><h4>Nächste Aktion</h4>{nextAction ? <><strong className={`fermentation-prominent is-${actionDueLabel(nextAction).severity}`}>{actionDueLabel(nextAction).label}</strong><p>{actionText(nextAction)}</p><button disabled={props.completing.includes(nextAction.id)} onClick={() => props.complete(props.brew.id, nextAction.id)}>{props.completing.includes(nextAction.id) ? 'Wird gespeichert …' : 'Erledigt'}</button></> : <p>Keine Aktion geplant.</p>}</section>
      <section className="fermentation-card fermentation-trend-card"><h4>Gärungsverlauf</h4><FermentationTrend measurements={details.measurements} /></section>
    </div>
  </div>;
};
const mapState = (state: any, own: {brew: FinishedBrew}) => ({details: state.fermentationReducer.byBrewId[own.brew.id], activeBrews: (state.beerDataReducer.finishedBrews || []).filter((brew: FinishedBrew) => brew.active && brew.state !== eBrewState.FINISHED), loading: state.fermentationReducer.loadingIds.includes(own.brew.id), saving: state.fermentationReducer.savingMeasurementIds.includes(own.brew.id), completing: state.fermentationReducer.completingActionIds, assigning: state.fermentationReducer.assigningDeviceIds, error: state.fermentationReducer.errors[own.brew.id]});
const mapDispatch = (dispatch: any) => ({load: (id: string) => dispatch(FermentationActions.load(id)), save: (value: CreateFermentationMeasurement) => dispatch(FermentationActions.createMeasurement(value)), complete: (brewId: string, actionId: string) => dispatch(FermentationActions.completeAction(brewId, actionId)), assign: (deviceId: string, brewId: string) => dispatch(FermentationActions.assignDevice(deviceId, brewId))});
export default connect(mapState, mapDispatch)(FinishedBrewDetailsView);
