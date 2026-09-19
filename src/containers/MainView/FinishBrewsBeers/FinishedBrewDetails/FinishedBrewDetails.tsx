import React, {useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import {FinishedBrew} from '../../../../model/FinishedBrew';
import {brewStateLabel, eBrewState} from '../../../../enums/eBrewState';
import {FermentationActions} from '../../../../actions/fermentation.actions';
import {BubbleActivity, BubbleActivityRange, CreateFermentationMeasurement, FermentationAction, FermentationDetails, FermentationGatewaySensorStatus, FermentationMeasurementRuntimeState} from '../../../../model/Fermentation';
import {actionAmountLabel, actionDueLabel, actionTriggerLabel, actionTypeLabel, assignedDeviceForBeer, canCompleteAction, contactStatus, contactTimeLabel, fermentationDay, freeFermentationDevices, isActionDue, isFermentationDeviceOnline, latestByDate, latestFermentationReadings} from '../../../../utils/fermentation';
import {fermentationActionRequestId} from '../../../../reducers/fermentationReducer';
import {TriggerType} from '../../../../model/FermentationRecipeAction';
import BrewProcessChart from '../BrewProcessChart/BrewProcessChart';
import FermentationMeasurementsChart, {FermentationChartRange} from '../FermentationMeasurements/FermentationMeasurementsChart/FermentationMeasurementsChart';
import BubbleActivityChart from '../FermentationMeasurements/BubbleActivityChart/BubbleActivityChart';
import ModalDialog, {DialogType} from '../../../../components/ModalDialog/ModalDialog';
import {ManualMeasurementDialogView} from '../../../../components/ManualMeasurementDialog/ManualMeasurementDialog';
import '../FermentationMeasurements/FermentationDetails.css';

interface Props { brew: FinishedBrew; details?: FermentationDetails; bubbleActivity: BubbleActivity[]; bubbleActivityRange: BubbleActivityRange; bubbleActivityLoading: boolean; bubbleActivityError?: string; loading: boolean; saving: boolean; completing: string[]; completeActionErrors: Record<string, string>; skipping: string[]; assigning: string[]; unassigning: string[]; updatingDeviceDisplayNames: string[]; deviceDisplayNameErrors: Record<string, string>; sensorsByDeviceUid: Record<string, FermentationGatewaySensorStatus>; assignmentError?: string; unassignmentError?: string; error?: string; load: (id: string) => void; loadBubbleActivity: (id: string, range: BubbleActivityRange) => void; save: (value: CreateFermentationMeasurement) => void; complete: (brewId: string, actionId: string) => void; dismissCompleteError: (brewId: string, actionId: string) => void; skip: (brewId: string, actionId: string) => void; assign: (deviceId: string, brewId: string) => void; unassign: (deviceId: string, brewId: string) => void; updateDeviceDisplayName: (deviceUid: string, brewId: string, displayName: string | null) => void; closeMeasurements?: () => void; }
const number = (value?: number | null, unit = '') => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('de-DE', {maximumFractionDigits: 1})}${unit}` : '–';
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('de-DE', {dateStyle: 'short', timeStyle: 'short'}).format(new Date(value)) : '–';
const actionText = (action: FermentationAction) => [action.name, actionAmountLabel(action.amount, action.unit)].filter(Boolean).join(' · ');
export const initialFermentationChartRange = (state: eBrewState): FermentationChartRange => state === eBrewState.FERMENTATION
  ? '6h'
  : state === eBrewState.MATURATION || state === eBrewState.FINISHED ? 'all' : '24h';
const FermentationMeasurementRuntime: React.FC<{state?: FermentationMeasurementRuntimeState}> = ({state}) => {
  if (!state) return <strong>–</strong>;
  const label = state === 'RUNNING' ? 'Aktiv' : state === 'PAUSED' ? 'Pause' : 'Bereit';
  return <strong className={`fermentation-runtime-status is-${state.toLowerCase()}`}><span className="status-dot" aria-hidden="true">●</span> {label}</strong>;
};

const ActionItem: React.FC<{action: FermentationAction; requestId: string; completing: string[]; skipping: string[]; complete: () => void; skip: () => void}> = ({action, requestId, completing, skipping, complete, skip}) => {
  const contact = contactStatus(action);
  const isCompleting = completing.includes(requestId);
  const isSkipping = skipping.includes(action.actionId);
  const disabled = isCompleting || isSkipping;
  const completeLabel = isCompleting ? 'Wird gespeichert …' : 'Zugabe erledigt';
  const skipLabel = isSkipping ? 'Wird übersprungen …' : 'Überspringen';
  const visibleStatus = action.status === 'COMPLETED' ? 'Erledigt' : action.status === 'SKIPPED' ? 'Übersprungen' : action.due ? 'Fällig · offen' : action.triggerType === TriggerType.MANUAL ? 'Offen' : 'Geplant';
  return <li className={action.status === 'COMPLETED' ? 'is-completed' : action.due ? 'is-due' : ''}><div className="fermentation-action-heading"><strong>{actionText(action) || 'Unbenannte Aktion'}</strong><span>{actionTypeLabel(action.sourceType)}</span></div><dl><div><dt>Auslöser</dt><dd>{actionTriggerLabel(action)}</dd></div>{contactTimeLabel(action) && <div><dt>Standzeit</dt><dd>{contactTimeLabel(action)}</dd></div>}<div><dt>Status</dt><dd><span className={`fermentation-action-status is-${action.status === 'COMPLETED' ? 'completed' : action.due ? 'due' : 'planned'}`}>{visibleStatus}</span></dd></div>{action.status === 'COMPLETED' && <div><dt>Bestätigt</dt><dd>{date(action.completedAt || undefined)}</dd></div>}{contact === 'running' && <div><dt>Kontakt</dt><dd>Standzeit läuft · endet {date(action.contactEndsAt || undefined)}</dd></div>}{contact === 'ended' && <div><dt>Kontakt</dt><dd>Standzeit beendet · {date(action.contactEndsAt || undefined)}</dd></div>}</dl><div className="fermentation-action-buttons">{canCompleteAction(action) && <button className="is-complete" aria-label={completeLabel} title={completeLabel} disabled={disabled} onClick={complete}><CheckIcon fontSize="small" /><span className="fermentation-action-button-label">{completeLabel}</span></button>}{action.status === 'PENDING' && <button className="is-skip" aria-label={skipLabel} title={skipLabel} disabled={disabled} onClick={skip}><SkipNextIcon fontSize="small" /><span className="fermentation-action-button-label">{skipLabel}</span></button>}</div></li>;
};

export const FinishedBrewDetailsView: React.FC<Props> = props => {
  const [formOpen, setFormOpen] = useState(false);
  const [completedActionsOpen, setCompletedActionsOpen] = useState(false);
  const [unassignConfirmationOpen, setUnassignConfirmationOpen] = useState(false);
  const [selectedDeviceUid, setSelectedDeviceUid] = useState('');
  const [editingDeviceName, setEditingDeviceName] = useState(false);
  const [deviceNameDraft, setDeviceNameDraft] = useState('');
  const [deviceNameError, setDeviceNameError] = useState('');
  const deviceNameInput = useRef<HTMLInputElement>(null);
  const assignmentWasPending = useRef(false);
  const displayNameWasPending = useRef(false);
  useEffect(() => { if (!props.details) props.load(props.brew.id); }, [props.brew.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCompletedActionsOpen(false); }, [props.brew.id]);
  const initialChartRange = initialFermentationChartRange(props.brew.state);
  useEffect(() => { props.loadBubbleActivity(props.brew.id, initialChartRange); }, [props.brew.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadedDetails = props.details ?? {measurements: [], actions: [], devices: []};
  const isInitialLoading = props.loading && !props.details;
  // Use the embedded batch snapshot until the dedicated endpoint supplies the
  // canonical runtime actions (including due and completion projections).
  const details = {...loadedDetails, actions: props.details ? loadedDetails.actions : (props.brew.fermentationActions ?? [])};
  const latestMeasurement = latestByDate(details.measurements.filter(value => Number.isFinite(Date.parse(value.measuredAt))), value => value.measuredAt);
  const readings = latestFermentationReadings(details.measurements);
  const dueActions = details.actions.filter(action => action.status === 'PENDING' && (isActionDue(action) || action.triggerType === TriggerType.MANUAL));
  const pendingActions = details.actions.filter(action => !dueActions.includes(action) && action.status !== 'COMPLETED' && action.status !== 'SKIPPED');
  const completedActions = details.actions.filter(action => action.status === 'COMPLETED');
  const assignedDevice = assignedDeviceForBeer(details.devices, props.brew.id);
  const freeDevices = freeFermentationDevices(details.devices);
  const assignedGatewayStatus = assignedDevice ? props.sensorsByDeviceUid[assignedDevice.deviceUid] : undefined;
  const sensorDisplayName = assignedDevice?.displayName
    ?? assignedDevice?.deviceName
    ?? assignedGatewayStatus?.deviceName
    ?? 'Gärsensor';
  const assignedOnline = assignedDevice ? isFermentationDeviceOnline(assignedDevice, assignedGatewayStatus) : false;
  const measurementRuntimeState = assignedOnline ? assignedGatewayStatus?.measurementState : undefined;
  const canCreateMeasurement = props.brew.state === eBrewState.FERMENTATION;
  const canManageAssignment = props.brew.state === eBrewState.WAITING_FOR_FERMENTATION || props.brew.state === eBrewState.FERMENTATION;
  const isAssigning = Boolean(selectedDeviceUid && props.assigning.includes(selectedDeviceUid));
  const isUnassigning = Boolean(assignedDevice && props.unassigning.includes(assignedDevice.deviceUid));
  const isUpdatingDisplayName = Boolean(assignedDevice && (props.updatingDeviceDisplayNames ?? []).includes(assignedDevice.deviceUid));
  const displayNameRequestError = assignedDevice ? (props.deviceDisplayNameErrors ?? {})[assignedDevice.deviceUid] : undefined;
  useEffect(() => { if (assignedDevice?.deviceUid === selectedDeviceUid) setSelectedDeviceUid(''); }, [assignedDevice?.deviceUid, selectedDeviceUid]);
  useEffect(() => {
    if (editingDeviceName) {
      deviceNameInput.current?.focus();
      deviceNameInput.current?.select();
    }
  }, [editingDeviceName]);
  useEffect(() => {
    if (isAssigning) assignmentWasPending.current = true;
    else if (assignmentWasPending.current) {
      assignmentWasPending.current = false;
      if (!props.assignmentError) setSelectedDeviceUid('');
    }
  }, [isAssigning, props.assignmentError]);
  useEffect(() => {
    if (isUpdatingDisplayName) displayNameWasPending.current = true;
    else if (displayNameWasPending.current) {
      displayNameWasPending.current = false;
      if (!displayNameRequestError) cancelDeviceNameEdit();
    }
  }, [isUpdatingDisplayName, displayNameRequestError]); // eslint-disable-line react-hooks/exhaustive-deps
  const day = fermentationDay(props.brew.fermentationStartedAt || undefined);
  const cancelDeviceNameEdit = () => { setEditingDeviceName(false); setDeviceNameError(''); };
  const saveDeviceName = () => {
    if (!assignedDevice) return;
    const name = deviceNameDraft.trim();
    if (!name) { setDeviceNameError('Bitte einen Sensornamen eingeben.'); return; }
    if (name.length > 255) { setDeviceNameError('Der Sensorname darf maximal 255 Zeichen lang sein.'); return; }
    if (name === sensorDisplayName.trim()) { cancelDeviceNameEdit(); return; }
    setDeviceNameError('');
    props.updateDeviceDisplayName(assignedDevice.deviceUid, props.brew.id, name);
  };
  const resetDeviceName = () => {
    if (!assignedDevice?.displayName || isUpdatingDisplayName) return;
    setDeviceNameError('');
    props.updateDeviceDisplayName(assignedDevice.deviceUid, props.brew.id, null);
  };
  const deviceNameEditor = assignedDevice && (editingDeviceName ? <>
    <div className="fermentation-device-name-edit"><input ref={deviceNameInput} aria-label="Sensor-Alias" maxLength={255} disabled={isUpdatingDisplayName} value={deviceNameDraft} onChange={event => { setDeviceNameDraft(event.target.value); setDeviceNameError(''); }} onKeyDown={event => { if (event.key === 'Enter') saveDeviceName(); else if (event.key === 'Escape') cancelDeviceNameEdit(); }} /><button type="button" disabled={isUpdatingDisplayName} aria-label="Sensor-Alias speichern" title="Sensor-Alias speichern" onClick={saveDeviceName}><CheckIcon fontSize="small" /></button><button type="button" disabled={isUpdatingDisplayName} aria-label="Bearbeiten abbrechen" title="Bearbeiten abbrechen" onClick={cancelDeviceNameEdit}><CloseIcon fontSize="small" /></button></div>
    {assignedDevice.displayName && <button className="fermentation-display-name-reset" type="button" disabled={isUpdatingDisplayName} onClick={resetDeviceName}>Technischen Namen verwenden</button>}
    {(deviceNameError || displayNameRequestError) && <small className="fermentation-error" role="alert">{deviceNameError || displayNameRequestError}</small>}
  </> : <div className="fermentation-device-name"><strong>{sensorDisplayName}</strong><button type="button" aria-label="Sensor-Alias bearbeiten" title="Sensor-Alias bearbeiten" onClick={() => { setDeviceNameDraft(assignedDevice.displayName ?? assignedDevice.deviceName ?? ''); setDeviceNameError(''); setEditingDeviceName(true); }}><EditIcon fontSize="small" /></button></div>);
  let groupedData: any; try { groupedData = props.brew.brewValues && JSON.parse(props.brew.brewValues as string).groupedData; } catch (_) { groupedData = undefined; }
  const completeErrorDialogs = Object.entries(props.completeActionErrors ?? {}).map(([requestId, message]) => requestId.startsWith(`${props.brew.id}/`) && <ModalDialog key={requestId} type={DialogType.ERROR} open header="Zugabe konnte nicht bestätigt werden" content={message || 'Bitte erneut versuchen.'} onConfirm={() => props.dismissCompleteError(props.brew.id, requestId.slice(props.brew.id.length + 1))} />);

  const relativeMeasurement = latestMeasurement && Number.isFinite(Date.parse(latestMeasurement.measuredAt))
      ? new Intl.RelativeTimeFormat('de-DE', {numeric: 'auto'}).format(-Math.max(0, Math.round((Date.now() - Date.parse(latestMeasurement.measuredAt)) / 60_000)), 'minute')
      : '–';
  const actionItems = (actions: FermentationAction[]) => <ul className="fermentation-action-list">{actions.map(action => <ActionItem key={action.actionId} action={action} requestId={fermentationActionRequestId(props.brew.id, action.actionId)} completing={props.completing} skipping={props.skipping} complete={() => props.complete(props.brew.id, action.actionId)} skip={() => props.skip(props.brew.id, action.actionId)} />)}</ul>;
  const actionGroup = (title: string, actions: FermentationAction[]) => actions.length > 0 && <section className="fermentation-plan-group"><h5>{title}</h5>{actionItems(actions)}</section>;
  const completedActionGroup = completedActions.length > 0 && <section className="fermentation-plan-group fermentation-plan-group-completed"><button type="button" className="fermentation-completed-toggle" aria-expanded={completedActionsOpen} aria-label={`Bereits durchgeführt (${completedActions.length})`} onClick={() => setCompletedActionsOpen(open => !open)}><span className="fermentation-completed-chevron" aria-hidden="true">{completedActionsOpen ? '▾' : '▸'}</span><span>Bereits durchgeführt</span><span className="fermentation-completed-count">{completedActions.length}</span></button>{completedActionsOpen && actionItems(completedActions)}</section>;
  return <div className="finished-brew-details fermentation-details fermentation-measurements-page">
      <header className="fermentation-page-header"><div><button className="fermentation-back-button" onClick={props.closeMeasurements}>← Fertige Biere</button><h3>Messdaten · {props.brew.name}</h3><p className="fermentation-phase">{brewStateLabel(props.brew.state)}{day ? ` · Gärtag ${day}` : ''}</p></div><button disabled={!canCreateMeasurement} title={canCreateMeasurement ? undefined : 'Messungen können nur während der Gärung erfasst werden.'} onClick={() => setFormOpen(true)}>Neue Messung</button></header>
      {isInitialLoading && <p role="status">Messdaten werden geladen …</p>}{props.error && <p className="fermentation-error" role="alert">Die Messdaten konnten nicht geladen werden.</p>}
      <ManualMeasurementDialogView open={formOpen} beerId={props.brew.id} onClose={() => setFormOpen(false)} brewState={props.brew.state} saving={props.saving} error={props.error} saveMeasurement={props.save} />

      <section aria-labelledby="current-state-title"><h4 id="current-state-title" className="fermentation-section-title">Aktueller Zustand</h4><div className="fermentation-current-grid">
        <div><span>Biertemperatur</span><strong>{number(readings.beerTemperature, ' °C')}</strong></div><div><span>Außentemperatur</span><strong>{number(readings.ambientTemperature, ' °C')}</strong></div><div><span>Plato</span><strong>{number(readings.plato, ' °P')}</strong></div><div className="fermentation-measurement-runtime"><span>Messung</span><FermentationMeasurementRuntime state={measurementRuntimeState} /></div><div><span>Letzte Messung</span><strong>{relativeMeasurement}</strong><small>{date(latestMeasurement?.measuredAt)}</small></div>
      </div></section>

      <ModalDialog type={DialogType.CONFIRM} open={unassignConfirmationOpen} header="Sensor trennen?" content={'Der Sensor wird von diesem Bier getrennt und die laufende Messsession beendet.\nBereits gespeicherte Messwerte bleiben erhalten.'} confirmLabel="Sensor trennen" showCancelButton onConfirm={() => { setUnassignConfirmationOpen(false); if (assignedDevice) props.unassign(assignedDevice.deviceUid, props.brew.id); }} onCancel={() => setUnassignConfirmationOpen(false)} actionsDisabled={isUnassigning} />

      <section className="fermentation-card fermentation-chart-card"><h4>Verlauf</h4><FermentationMeasurementsChart key={props.brew.id} measurements={details.measurements} actions={details.actions} initialRange={initialChartRange} /></section>
      <section className="fermentation-card fermentation-chart-card" aria-labelledby="bubble-activity-title"><div className="fermentation-chart-heading"><h4 id="bubble-activity-title">Gäraktivität</h4><div className="fermentation-range-selector" role="group" aria-label="Zeitraum der Gäraktivität">{([['6h', '6 h'], ['24h', '24 h'], ['7d', '7 Tage'], ['all', 'Alles']] as [BubbleActivityRange, string][]).map(([range, label]) => <button key={range} className={props.bubbleActivityRange === range ? 'is-selected' : ''} aria-pressed={props.bubbleActivityRange === range} disabled={props.bubbleActivityLoading && props.bubbleActivityRange === range} onClick={() => props.loadBubbleActivity(props.brew.id, range)}>{label}</button>)}</div></div>
        <div className={`fermentation-chart-content${props.bubbleActivity.length > 0 ? ' has-chart' : ''}`}>
          {props.bubbleActivity.length > 0 && <BubbleActivityChart activity={props.bubbleActivity} />}
          {props.bubbleActivityLoading && (props.bubbleActivity.length > 0
            ? <span className="fermentation-chart-loading" role="status">Aktualisiere …</span>
            : <p role="status">Gäraktivität wird geladen …</p>)}
          {props.bubbleActivityError && <p className="fermentation-error" role="alert">Die Gäraktivität konnte nicht geladen werden.</p>}
          {!props.bubbleActivityLoading && !props.bubbleActivityError && props.bubbleActivity.length === 0 && <p className="fermentation-empty">Noch keine Gäraktivität gemessen.</p>}
        </div>
      </section>
      <div className="fermentation-measurements-lower-grid">
        <div className="fermentation-measurements-main">
          <section className="fermentation-card fermentation-plan"><h4>Gärungsaktionen</h4>{details.actions.length === 0 ? <p className="fermentation-empty">Keine Gärungsaktionen geplant.</p> : <>{actionGroup('Jetzt fällig', dueActions)}{actionGroup('Als Nächstes', pendingActions)}{completedActionGroup}</>}</section>
        </div>
        <aside className="fermentation-measurements-sidebar">
          <section className="fermentation-card fermentation-sensor-card" aria-labelledby="fermentation-sensor-title"><h4 id="fermentation-sensor-title">Gärsensor</h4>
            {assignedDevice ? <div className="fermentation-assigned-device"><div>{deviceNameEditor}<span className={assignedOnline ? 'is-online' : 'is-offline'}>{assignedOnline ? '● Online' : '● Offline'}</span>{assignedDevice.activeAssignment?.assignedAt && <small>Zugeordnet seit: {date(assignedDevice.activeAssignment.assignedAt)}</small>}</div>{canManageAssignment && <button disabled={isUnassigning} onClick={() => setUnassignConfirmationOpen(true)}>{isUnassigning ? 'Wird getrennt …' : 'Sensor trennen'}</button>}</div> : <>
              <p>Kein Sensor zugeordnet.</p>{canManageAssignment && (freeDevices.length === 0 ? <p className="fermentation-empty">Kein freier Sensor verfügbar.</p> : <div className="fermentation-assignment-controls"><label>Sensor auswählen<select aria-label="Sensor auswählen" value={selectedDeviceUid} disabled={isAssigning} onChange={event => setSelectedDeviceUid(event.target.value)}><option value="">Bitte auswählen</option>{freeDevices.map(device => { const gateway = props.sensorsByDeviceUid[device.deviceUid]; const online = isFermentationDeviceOnline(device, gateway); return <option key={device.deviceUid} value={device.deviceUid}>{device.deviceName || gateway?.deviceName || 'Unbenannter Sensor'} · {online ? 'Online' : 'Offline'}</option>; })}</select></label><button disabled={!selectedDeviceUid || isAssigning} onClick={() => props.assign(selectedDeviceUid, props.brew.id)}>{isAssigning ? 'Wird zugewiesen …' : 'Sensor zuweisen'}</button></div>)}</>}
            {props.assignmentError && <p className="fermentation-error" role="alert">Der Sensor konnte nicht zugeordnet werden.<small>{props.assignmentError}</small></p>}{props.unassignmentError && <p className="fermentation-error" role="alert">Der Sensor konnte nicht getrennt werden.<small>{props.unassignmentError}</small></p>}
          </section>
        </aside>
      </div>
      {completeErrorDialogs}
      {groupedData && <section className="fermentation-card fermentation-analysis"><h4>Analyse des Brauprozesses</h4><BrewProcessChart groupedData={groupedData} /></section>}
  </div>;
};
const mapState = (state: any, own: {brew: FinishedBrew}) => { const bubble = state.fermentationReducer.bubbleActivityByBrewId[own.brew.id]; return {details: state.fermentationReducer.byBrewId[own.brew.id], bubbleActivity: bubble?.activity ?? [], bubbleActivityRange: bubble?.selectedRange ?? '24h', bubbleActivityLoading: bubble?.loading ?? false, bubbleActivityError: bubble?.error, loading: state.fermentationReducer.loadingIds.includes(own.brew.id), saving: state.fermentationReducer.savingMeasurementIds.includes(own.brew.id), completing: state.fermentationReducer.completingActionIds, completeActionErrors: state.fermentationReducer.completeActionErrors, skipping: state.fermentationReducer.skippingActionIds, assigning: state.fermentationReducer.assigningDeviceIds, unassigning: state.fermentationReducer.unassigningDeviceIds, updatingDeviceDisplayNames: state.fermentationReducer.updatingDeviceDisplayNameIds, deviceDisplayNameErrors: state.fermentationReducer.deviceDisplayNameErrors, sensorsByDeviceUid: state.fermentationReducer.sensorsByDeviceUid, assignmentError: state.fermentationReducer.assignmentErrors[own.brew.id], unassignmentError: state.fermentationReducer.unassignmentErrors[own.brew.id], error: state.fermentationReducer.errors[own.brew.id]}; };
const mapDispatch = (dispatch: any) => ({load: (id: string) => dispatch(FermentationActions.load(id)), loadBubbleActivity: (id: string, range: BubbleActivityRange) => dispatch(FermentationActions.loadBubbleActivity(id, range)), save: (value: CreateFermentationMeasurement) => dispatch(FermentationActions.createMeasurement(value)), complete: (brewId: string, actionId: string) => dispatch(FermentationActions.completeAction(brewId, actionId)), dismissCompleteError: (brewId: string, actionId: string) => dispatch(FermentationActions.dismissCompleteActionError(brewId, actionId)), skip: (brewId: string, actionId: string) => dispatch(FermentationActions.skipAction(brewId, actionId)), assign: (deviceId: string, brewId: string) => dispatch(FermentationActions.assignDevice(deviceId, brewId)), unassign: (deviceId: string, brewId: string) => dispatch(FermentationActions.unassignDevice(deviceId, brewId)), updateDeviceDisplayName: (deviceUid: string, brewId: string, displayName: string | null) => dispatch(FermentationActions.updateDeviceDisplayName(deviceUid, brewId, displayName))});
export default connect(mapState, mapDispatch)(FinishedBrewDetailsView);
