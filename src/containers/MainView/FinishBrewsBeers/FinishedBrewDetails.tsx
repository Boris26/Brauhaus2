import React, {useEffect, useMemo, useState} from 'react';
import {connect} from 'react-redux';
import {FinishedBrew} from '../../../model/FinishedBrew';
import {brewStateLabel, BrewStateTransitions, eBrewState} from '../../../enums/eBrewState';
import {FermentationActions} from '../../../actions/fermentation.actions';
import {ApplicationActions, BeerActions} from '../../../actions/actions';
import {CreateFermentationMeasurement, FermentationAction, FermentationDetails, FermentationMeasurement} from '../../../model/Fermentation';
import {actionDueLabel, actionTriggerLabel, canCompleteAction, contactStatus, contactTimeLabel, fermentationDay, isActionDue, isDeviceOnline, latestByDate, latestFermentationReadings} from '../../../utils/fermentation';
import {transitionFinishedBrew} from '../../../utils/brewLifecycle';
import {FermentationTriggerType} from '../../../model/FermentationRecipeAction';
import BrewProcessChart from './BrewProcessChart';
import FermentationMeasurementsChart from './FermentationMeasurementsChart';
import './FermentationDetails.css';

interface Props { brew: FinishedBrew; details?: FermentationDetails; activeBrews: FinishedBrew[]; loading: boolean; saving: boolean; savingLifecycle: boolean; completing: string[]; skipping: string[]; assigning: string[]; error?: string; lifecycleError?: string; viewMode?: 'dashboard' | 'measurements'; load: (id: string) => void; save: (value: CreateFermentationMeasurement) => void; complete: (brewId: string, actionId: string) => void; skip: (brewId: string, actionId: string) => void; transition: (brew: FinishedBrew) => void; assign: (deviceId: string, brewId: string) => void; openMeasurements?: (id: string) => void; closeMeasurements?: () => void; }
const number = (value?: number | null, unit = '') => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('de-DE', {maximumFractionDigits: 1})}${unit}` : '–';
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('de-DE', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(value)) : '–';
const actionText = (action: FermentationAction) => [action.amount, action.unit, action.name, action.sourceType?.toLowerCase()].filter(Boolean).join(' ');

const ActionItem: React.FC<{action: FermentationAction; completing: string[]; skipping: string[]; complete: () => void; skip: () => void}> = ({action, completing, skipping, complete, skip}) => {
  const contact = contactStatus(action);
  return <li><time>{action.status === 'COMPLETED' ? `Erledigt ${date(action.completedAt || undefined)}` : actionDueLabel(action).label}</time><strong>{actionText(action)}</strong><span>Zugabe: {actionTriggerLabel(action)}</span>{contactTimeLabel(action) && <span>Kontaktzeit: {contactTimeLabel(action)}</span>}{contact === 'running' && <span>Kontaktzeit läuft{action.contactEndsAt ? ` · endet ${date(action.contactEndsAt)}` : ''}</span>}{contact === 'ended' && <span className="fermentation-error">Kontaktzeit beendet{action.contactEndsAt ? ` · ${date(action.contactEndsAt)}` : ''}</span>}<div>{canCompleteAction(action) && <button disabled={completing.includes(action.actionId) || skipping.includes(action.actionId)} onClick={complete}>{completing.includes(action.actionId) ? 'Wird gespeichert …' : 'Als ausgeführt bestätigen'}</button>}{action.status === 'PENDING' && <button disabled={completing.includes(action.actionId) || skipping.includes(action.actionId)} onClick={skip}>{skipping.includes(action.actionId) ? 'Wird übersprungen …' : 'Überspringen'}</button>}</div></li>;
};

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
  const nextAction = [...details.actions].filter(action => action.status === 'PENDING').sort((a, b) => Number(isActionDue(b)) - Number(isActionDue(a)))[0];
  const dueActions = details.actions.filter(action => action.status === 'PENDING' && (isActionDue(action) || action.triggerType === FermentationTriggerType.MANUAL));
  const pendingActions = details.actions.filter(action => !dueActions.includes(action) && action.status !== 'COMPLETED' && action.status !== 'SKIPPED');
  const completedActions = details.actions.filter(action => action.status === 'COMPLETED');
  const day = fermentationDay(props.brew.fermentationStartedAt || undefined);
  const save = () => { if (!temperature && !plato) { setValidation('Mindestens Temperatur oder Plato ist erforderlich.'); return; } setValidation(''); props.save({finishedBeerId: props.brew.id, measuredAt: new Date(measuredAt).toISOString(), temperature: temperature === '' ? undefined : Number(temperature), plato: plato === '' ? undefined : Number(plato), note}); };
  let groupedData: any; try { groupedData = props.brew.brewValues && JSON.parse(props.brew.brewValues as string).groupedData; } catch (_) { groupedData = undefined; }

  if (props.viewMode === 'measurements') return <div className="finished-brew-details fermentation-details fermentation-measurements-page">
    <header className="fermentation-page-header"><div><button className="fermentation-back-button" onClick={props.closeMeasurements}>← Bier-Detailansicht</button><h3>Messdaten · {props.brew.name}</h3><p className="fermentation-phase">{brewStateLabel(props.brew.state)}{day ? ` · Gärtag ${day}` : ''}</p></div><button onClick={() => setFormOpen(true)}>Neue Messung</button></header>
    {props.loading && <p role="status">Messdaten werden geladen …</p>}{props.error && <p className="fermentation-error" role="alert">Die Messdaten konnten nicht geladen werden.</p>}
    {formOpen && <section className="fermentation-card"><div className="fermentation-form" role="dialog" aria-label="Neue Gärungsmessung"><label>Datum / Uhrzeit<input type="datetime-local" value={measuredAt} onChange={event => setMeasuredAt(event.target.value)} /></label><label>Temperatur °C<input type="number" step="0.1" value={temperature} onChange={event => setTemperature(event.target.value)} /></label><label>Plato °P<input type="number" step="0.1" value={plato} onChange={event => setPlato(event.target.value)} /></label><label>Notiz<textarea value={note} onChange={event => setNote(event.target.value)} /></label>{validation && <p className="fermentation-error">{validation}</p>}<div><button onClick={() => setFormOpen(false)} disabled={props.saving}>Abbrechen</button><button onClick={save} disabled={props.saving}>{props.saving ? 'Speichert …' : 'Speichern'}</button></div></div></section>}
    <section className="fermentation-card"><h4>Temperatur- und Plato-Verlauf</h4><FermentationMeasurementsChart measurements={details.measurements} sensorMeasurements={details.sensorMeasurements} /></section>
    <div className="fermentation-measurements-grid"><section className="fermentation-card"><h4>Messverlauf</h4>{measurements.length === 0 ? <p>Keine Messwerte vorhanden.</p> : <ul className="fermentation-list">{measurements.map(measurement => <li key={measurement.id}><time>{date(measurement.measuredAt)}</time><strong>{[number(measurement.temperature, ' °C'), number(measurement.plato, ' °P')].join(' · ')}</strong>{measurement.note && <span>{measurement.note}</span>}</li>)}</ul>}</section>
      <section className="fermentation-card"><h4>Gärsensor-Messungen</h4>{details.sensorMeasurements.length === 0 ? <p>Keine Sensormesswerte vorhanden.</p> : <ul className="fermentation-list">{[...details.sensorMeasurements].sort((a,b) => Date.parse(b.measuredAt)-Date.parse(a.measuredAt)).map(sensor => <li key={sensor.id}><time>{date(sensor.measuredAt)}</time><strong>{number(sensor.beerTemperature, ' °C')} · Außen {number(sensor.ambientTemperature, ' °C')}</strong></li>)}</ul>}</section>
      <section className="fermentation-card"><h4>Gärungsaktionen</h4>{details.actions.length === 0 ? <p>Keine Aktionen vorhanden.</p> : <>{dueActions.length > 0 && <><h5>Fällig</h5><ul className="fermentation-list">{dueActions.map(action => <ActionItem key={action.actionId} action={action} completing={props.completing} skipping={props.skipping} complete={() => props.complete(props.brew.id, action.actionId)} skip={() => props.skip(props.brew.id, action.actionId)} />)}</ul></>}{pendingActions.length > 0 && <><h5>Anstehend</h5><ul className="fermentation-list">{pendingActions.map(action => <ActionItem key={action.actionId} action={action} completing={props.completing} skipping={props.skipping} complete={() => props.complete(props.brew.id, action.actionId)} skip={() => props.skip(props.brew.id, action.actionId)} />)}</ul></>}{completedActions.length > 0 && <><h5>Erledigt</h5><ul className="fermentation-list">{completedActions.map(action => <ActionItem key={action.actionId} action={action} completing={props.completing} skipping={props.skipping} complete={() => props.complete(props.brew.id, action.actionId)} skip={() => props.skip(props.brew.id, action.actionId)} />)}</ul></>}</>}</section></div>
    {groupedData && <section className="fermentation-card fermentation-analysis"><h4>Analyse des Brauprozesses</h4><BrewProcessChart groupedData={groupedData} /></section>}
  </div>;

  return <div className="finished-brew-details fermentation-details fermentation-dashboard">
    <header className="fermentation-dashboard-header"><div><h3>{props.brew.name}</h3><p className="fermentation-phase">{brewStateLabel(props.brew.state)}{day ? ` · Gärtag ${day}` : ''}</p><p>Gärbeginn: {date(props.brew.fermentationStartedAt || undefined)}</p></div><button onClick={() => props.openMeasurements?.(props.brew.id)}>Messdaten öffnen</button></header>
    {props.loading && <p role="status">Messdaten werden geladen …</p>}{props.error && <p className="fermentation-error" role="alert">Die Messdaten konnten nicht geladen werden.</p>}
    <section className="fermentation-card fermentation-lifecycle"><h4>Lifecycle</h4><div>{BrewStateTransitions[props.brew.state]?.includes(eBrewState.MATURATION) && <button disabled={props.savingLifecycle} onClick={() => props.transition(transitionFinishedBrew(props.brew, eBrewState.MATURATION))}>Reifung starten</button>}{BrewStateTransitions[props.brew.state]?.includes(eBrewState.FINISHED) && <button disabled={props.savingLifecycle} onClick={() => props.transition(transitionFinishedBrew(props.brew, eBrewState.FINISHED))}>Bier fertigstellen</button>}</div>{props.savingLifecycle && <p role="status">Status wird gespeichert …</p>}{props.lifecycleError && <p role="alert" className="fermentation-error">{props.lifecycleError}</p>}</section>
    <section className="fermentation-reading-grid" aria-label="Aktuelle Gärungswerte"><div><span>Biertemperatur</span><strong>{number(readings.beerTemperature, ' °C')}</strong></div><div><span>Außentemperatur</span><strong>{number(readings.ambientTemperature, ' °C')}</strong></div><div><span>Plato</span><strong>{number(readings.plato, ' °P')}</strong></div></section>
    <div className="fermentation-dashboard-grid">
      <section className="fermentation-card fermentation-status-card"><h4>Gärsensor</h4>{details.devices.length === 0 ? <p>Kein Sensor zugeordnet.</p> : details.devices.map(device => <div key={device.id} className="fermentation-device"><strong>{device.name}</strong><span className={isDeviceOnline(device.lastSeenAt) ? 'is-online' : 'is-offline'}>{isDeviceOnline(device.lastSeenAt) ? '● Online' : '● Offline'}</span>{!device.assignedFinishedBeerId && <div className="fermentation-assignment"><span>Bier zuordnen:</span>{props.activeBrews.map(brew => <button key={brew.id} disabled={props.assigning.includes(device.id)} onClick={() => props.assign(device.id, brew.id)}>{brew.name}</button>)}</div>}</div>)}</section>
      <section className="fermentation-card fermentation-status-card"><h4>Letzte Messung</h4><strong className="fermentation-prominent">{date(latestMeasurement?.measuredAt)}</strong><p>{latestSensor ? `Sensor zuletzt ${date(latestSensor.measuredAt)}` : 'Noch keine Sensormessung vorhanden.'}</p></section>
      <section className="fermentation-card fermentation-status-card"><h4>Nächste Aktion</h4>{nextAction ? <><strong className={`fermentation-prominent is-${actionDueLabel(nextAction).severity}`}>{actionDueLabel(nextAction).label}</strong><p>{actionText(nextAction)}</p><p>Zugabe: {actionTriggerLabel(nextAction)}</p>{canCompleteAction(nextAction) && <button disabled={props.completing.includes(nextAction.id)} onClick={() => props.complete(props.brew.id, nextAction.id)}>{props.completing.includes(nextAction.id) ? 'Wird gespeichert …' : 'Als ausgeführt bestätigen'}</button>}</> : <p>Keine Aktion geplant.</p>}</section>
      <section className="fermentation-card fermentation-trend-card"><h4>Gärungsverlauf</h4><FermentationTrend measurements={details.measurements} /></section>
    </div>
  </div>;
};
const mapState = (state: any, own: {brew: FinishedBrew}) => ({details: state.fermentationReducer.byBrewId[own.brew.id], activeBrews: (state.beerDataReducer.finishedBrews || []).filter((brew: FinishedBrew) => brew.active && brew.state !== eBrewState.FINISHED), loading: state.fermentationReducer.loadingIds.includes(own.brew.id), saving: state.fermentationReducer.savingMeasurementIds.includes(own.brew.id), savingLifecycle: state.beerDataReducer.savingFinishedBrewIds.includes(own.brew.id), lifecycleError: state.beerDataReducer.finishedBrewUpdateErrors[own.brew.id], completing: state.fermentationReducer.completingActionIds, skipping: state.fermentationReducer.skippingActionIds, assigning: state.fermentationReducer.assigningDeviceIds, error: state.fermentationReducer.errors[own.brew.id]});
const mapDispatch = (dispatch: any) => ({load: (id: string) => dispatch(FermentationActions.load(id)), save: (value: CreateFermentationMeasurement) => dispatch(FermentationActions.createMeasurement(value)), complete: (brewId: string, actionId: string) => dispatch(FermentationActions.completeAction(brewId, actionId)), skip: (brewId: string, actionId: string) => dispatch(FermentationActions.skipAction(brewId, actionId)), transition: (brew: FinishedBrew) => dispatch(BeerActions.updateActiveBeer(brew)), assign: (deviceId: string, brewId: string) => dispatch(FermentationActions.assignDevice(deviceId, brewId)), openMeasurements: (id: string) => dispatch(ApplicationActions.openMeasurementData(id))});
export default connect(mapState, mapDispatch)(FinishedBrewDetailsView);
