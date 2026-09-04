import React, {useEffect, useMemo, useState} from 'react';
import {connect} from 'react-redux';
import {FinishedBrew} from '../../../model/FinishedBrew';
import {BrewStateGerman, eBrewState} from '../../../enums/eBrewState';
import {FermentationActions} from '../../../actions/fermentation.actions';
import {CreateFermentationMeasurement, FermentationDetails} from '../../../model/Fermentation';
import {approximateAlcohol, attenuation, bubbleRate, fermentationDay, isDeviceOnline, latestByDate, missingPlatoDays, temperatureDelta, actionDueLabel} from '../../../utils/fermentation';
import BrewProcessChart from './BrewProcessChart';
import './FermentationDetails.css';

interface Props { brew: FinishedBrew; details?: FermentationDetails; activeBrews: FinishedBrew[]; loading: boolean; saving: boolean; completing: string[]; assigning: string[]; error?: string; load: (id: string) => void; save: (value: CreateFermentationMeasurement) => void; complete: (brewId: string, actionId: string) => void; assign: (deviceId: string, brewId: string) => void; }
const number = (value?: number | null, unit = '') => typeof value === 'number' ? `${value.toLocaleString('de-DE', {maximumFractionDigits: 1})}${unit}` : '–';
const date = (value?: string) => value ? new Intl.DateTimeFormat('de-DE', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(value)) : '–';
const actionText = (action: any) => [action.amount, action.unit, action.ingredientName, action.type?.toLowerCase()].filter(Boolean).join(' ');

export const FinishedBrewDetailsView: React.FC<Props> = props => {
  const [formOpen, setFormOpen] = useState(false);
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [temperature, setTemperature] = useState(''); const [plato, setPlato] = useState(''); const [note, setNote] = useState(''); const [validation, setValidation] = useState('');
  useEffect(() => { props.load(props.brew.id); }, [props.brew.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (formOpen && !props.saving && !props.error) { setFormOpen(false); setTemperature(''); setPlato(''); setNote(''); } }, [props.saving]); // eslint-disable-line react-hooks/exhaustive-deps
  const details = props.details ?? {measurements: [], actions: [], devices: [], sensorMeasurements: []};
  const measurements = useMemo(() => [...details.measurements].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt)), [details.measurements]);
  const latest = measurements[0]; const sensor = latestByDate(details.sensorMeasurements, x => x.measuredAt);
  const delta = temperatureDelta(sensor); const bubbles = bubbleRate(sensor); const noPlato = missingPlatoDays(measurements);
  const save = () => { if (!temperature && !plato) { setValidation('Mindestens Temperatur oder Plato ist erforderlich.'); return; } setValidation(''); props.save({finishedBeerId: props.brew.id, measuredAt: new Date(measuredAt).toISOString(), temperature: temperature === '' ? undefined : Number(temperature), plato: plato === '' ? undefined : Number(plato), note}); };
  let groupedData: any; try { groupedData = props.brew.brewValues && JSON.parse(props.brew.brewValues as string).groupedData; } catch (_) { groupedData = undefined; }
  const residual = latest?.plato ?? props.brew.residual_extract; const attenuationValue = typeof residual === 'number' ? attenuation(props.brew.originalwort, residual) : undefined; const alcohol = typeof residual === 'number' ? approximateAlcohol(props.brew.originalwort, residual) : undefined;
  return <div className="finished-brew-details fermentation-details">
    <h3>{props.brew.name}</h3><p className="fermentation-phase">{BrewStateGerman[props.brew.state]}{fermentationDay(details.phaseStartedAt || String(props.brew.startDate)) ? ` · Tag ${fermentationDay(details.phaseStartedAt || String(props.brew.startDate))}` : ''}</p>
    <section className="fermentation-card"><div className="fermentation-heading"><h4>Gärungsverlauf</h4><button onClick={() => setFormOpen(true)}>Neue Messung</button></div>
      {props.loading && <p>Daten werden geladen …</p>}{props.error && <p className="fermentation-error">{props.error}</p>}
      <div className="fermentation-latest"><span>Letzte Messung</span><strong>{number(latest?.temperature, ' °C')}</strong><strong>{number(latest?.plato, ' °P')}</strong><small>{date(latest?.measuredAt)}</small></div>
      {noPlato !== undefined && noPlato >= 3 && <p className="fermentation-notice">Seit {noPlato} Tagen keine Plato-Messung.</p>}
      {formOpen && <div className="fermentation-form" role="dialog" aria-label="Neue Gärungsmessung"><label>Datum / Uhrzeit<input type="datetime-local" value={measuredAt} onChange={e => setMeasuredAt(e.target.value)} /></label><label>Temperatur °C<input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} /></label><label>Plato °P<input type="number" step="0.1" value={plato} onChange={e => setPlato(e.target.value)} /></label><label>Notiz<textarea value={note} onChange={e => setNote(e.target.value)} /></label>{validation && <p className="fermentation-error">{validation}</p>}<div><button onClick={() => setFormOpen(false)} disabled={props.saving}>Abbrechen</button><button onClick={save} disabled={props.saving}>{props.saving ? 'Speichert …' : 'Speichern'}</button></div></div>}
      <h5>Manuelle Messungen</h5>{measurements.length === 0 ? <p>Keine Messwerte vorhanden.</p> : <ul className="fermentation-list">{measurements.map(m => <li key={m.id}><time>{date(m.measuredAt)}</time><strong>{[number(m.temperature, ' °C'), number(m.plato, ' °P')].join(' · ')}</strong>{m.note && <span>{m.note}</span>}</li>)}</ul>}
      {typeof residual === 'number' && <dl className="fermentation-metrics"><div><dt>Stammwürze</dt><dd>{number(props.brew.originalwort, ' °P')}</dd></div><div><dt>Restextrakt</dt><dd>{number(residual, ' °P')}</dd></div><div><dt>Scheinbarer Vergärungsgrad</dt><dd>ca. {number(attenuationValue, ' %')}</dd></div><div><dt>Alkohol</dt><dd>ca. {number(alcohol, ' % vol')}</dd></div></dl>}
    </section>
    <section className="fermentation-card"><h4>Gärsensor</h4>{details.devices.length === 0 ? <p>Kein Sensor zugeordnet.</p> : details.devices.map(device => <div key={device.id} className="fermentation-device"><strong>{device.name}</strong><span className={isDeviceOnline(device.lastSeenAt) ? 'is-online' : 'is-offline'}>{isDeviceOnline(device.lastSeenAt) ? '● Online' : `Keine aktuellen Daten · zuletzt ${date(device.lastSeenAt || undefined)}`}</span>{!device.assignedFinishedBeerId && <div><p>Welches Bier wird überwacht?</p>{props.activeBrews.map(brew => <button key={brew.id} disabled={props.assigning.includes(device.id)} onClick={() => props.assign(device.id, brew.id)}>{brew.name}</button>)}</div>}</div>)}
      {sensor && <dl className="fermentation-sensor-values"><div><dt>Bier</dt><dd>{number(sensor.beerTemperature, ' °C')}</dd></div><div><dt>Umgebung</dt><dd>{number(sensor.ambientTemperature, ' °C')}</dd></div><div><dt>Δ Temperatur</dt><dd>{typeof delta === 'number' && delta >= 0 ? '+' : ''}{number(delta, ' °C')}</dd></div><div><dt>Aktivität</dt><dd>{number(bubbles, ' Blubbs/min')}</dd></div></dl>}
    </section>
    <section className="fermentation-card"><h4>Gärungsaktionen</h4>{details.actions.length === 0 ? <p>Keine Aktionen geplant.</p> : <ul className="fermentation-list">{[...details.actions].sort((a,b) => Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt)).map(action => { const due = actionDueLabel(action); return <li key={action.id} className={`is-${due.severity}`}><time>{action.state === 'COMPLETED' ? `Erledigt ${date(action.completedAt || undefined)}` : due.label}</time><strong>{actionText(action)}</strong>{action.state === 'PLANNED' && <button disabled={props.completing.includes(action.id)} onClick={() => props.complete(props.brew.id, action.id)}>{props.completing.includes(action.id) ? 'Wird gespeichert …' : 'Erledigt'}</button>}{action.state === 'ACTIVE' && <span>Aktiv{action.removeAt ? ` · Entfernen: ${date(action.removeAt)}` : ''}</span>}</li>;})}</ul>}</section>
    {groupedData && <section className="fermentation-card"><h4>Temperaturverlauf des Brauprozesses</h4><BrewProcessChart groupedData={groupedData} /></section>}
  </div>;
};
const mapState = (state: any, own: {brew: FinishedBrew}) => ({details: state.fermentationReducer.byBrewId[own.brew.id], activeBrews: (state.beerDataReducer.finishedBrews || []).filter((b: FinishedBrew) => b.active && b.state !== eBrewState.FINISHED), loading: state.fermentationReducer.loadingIds.includes(own.brew.id), saving: state.fermentationReducer.savingMeasurementIds.includes(own.brew.id), completing: state.fermentationReducer.completingActionIds, assigning: state.fermentationReducer.assigningDeviceIds, error: state.fermentationReducer.errors[own.brew.id]});
const mapDispatch = (dispatch: any) => ({load: (id: string) => dispatch(FermentationActions.load(id)), save: (value: CreateFermentationMeasurement) => dispatch(FermentationActions.createMeasurement(value)), complete: (brewId: string, actionId: string) => dispatch(FermentationActions.completeAction(brewId, actionId)), assign: (deviceId: string, brewId: string) => dispatch(FermentationActions.assignDevice(deviceId, brewId))});
export default connect(mapState, mapDispatch)(FinishedBrewDetailsView);
