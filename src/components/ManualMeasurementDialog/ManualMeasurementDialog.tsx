import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, CircularProgress, TextField} from '@mui/material';
import {connect} from 'react-redux';
import AppDialog from '../AppDialog/AppDialog';
import {FermentationActions} from '../../actions/fermentation.actions';
import {eBrewState} from '../../enums/eBrewState';
import {CreateFermentationMeasurement} from '../../model/Fermentation';
import './ManualMeasurementDialog.css';

export interface ManualMeasurementDialogProps { open: boolean; beerId: string; onClose: () => void; }
interface StateProps { brewState?: eBrewState; saving: boolean; error?: string; }
interface DispatchProps { saveMeasurement: (measurement: CreateFermentationMeasurement) => void; }
type Props = ManualMeasurementDialogProps & StateProps & DispatchProps;

const localDateTime = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const ManualMeasurementDialogView: React.FC<Props> = ({open, beerId, onClose, brewState, saving, error, saveMeasurement}) => {
  const [measuredAt, setMeasuredAt] = useState('');
  const [beerTemperature, setBeerTemperature] = useState('');
  const [ambientTemperature, setAmbientTemperature] = useState('');
  const [plato, setPlato] = useState('');
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState('');
  const wasSaving = useRef(false);

  useEffect(() => {
    if (!open) return;
    setMeasuredAt(localDateTime());
    setBeerTemperature(''); setAmbientTemperature(''); setPlato(''); setNote(''); setValidation('');
    wasSaving.current = false;
  }, [open, beerId]);

  useEffect(() => {
    if (saving) wasSaving.current = true;
    else if (open && wasSaving.current) {
      wasSaving.current = false;
      if (!error) onClose();
    }
  }, [saving, error, onClose, open]);

  const submit = () => {
    if (saving) return;
    if (brewState !== eBrewState.FERMENTATION) { setValidation('Manuelle Messungen können nur während der aktiven Gärung gespeichert werden.'); return; }
    if (!beerTemperature && !ambientTemperature && !plato) { setValidation('Mindestens eine Temperatur oder Plato ist erforderlich.'); return; }
    const timestamp = new Date(measuredAt);
    if (!measuredAt || Number.isNaN(timestamp.getTime())) { setValidation('Bitte ein gültiges Datum mit Uhrzeit eingeben.'); return; }
    setValidation('');
    saveMeasurement({finishedBeerId: beerId, measuredAt: timestamp.toISOString(), beerTemperatureC: beerTemperature === '' ? undefined : Number(beerTemperature), ambientTemperatureC: ambientTemperature === '' ? undefined : Number(ambientTemperature), plato: plato === '' ? undefined : Number(plato), note});
  };

  const unavailable = brewState !== eBrewState.FERMENTATION;
  return <AppDialog open={open} onClose={onClose} disableClose={saving} title="Manuelle Gärungsmessung" maxWidth="xs" className="manual-measurement-dialog" icon={null}
    actions={<><Button onClick={onClose} disabled={saving}>Abbrechen</Button><Button variant="contained" onClick={submit} disabled={saving || unavailable}>{saving ? <><CircularProgress size={18} sx={{mr: 1}}/>Speichert …</> : 'Speichern'}</Button></>}>
    {unavailable && <Alert severity="warning">Manuelle Messungen sind nur während der aktiven Gärung möglich.</Alert>}
    {error && <Alert severity="error">Die Messung konnte nicht gespeichert werden. Bitte erneut versuchen.</Alert>}
    {validation && <Alert severity="error">{validation}</Alert>}
    <div className="manual-measurement-dialog__form">
      <TextField label="Datum / Uhrzeit" type="datetime-local" value={measuredAt} onChange={event => setMeasuredAt(event.target.value)} disabled={saving} InputLabelProps={{shrink: true}} />
      <TextField label="Biertemperatur °C" type="number" value={beerTemperature} onChange={event => setBeerTemperature(event.target.value)} disabled={saving} inputProps={{step: 0.1}} InputLabelProps={{shrink: true}} />
      <TextField label="Außentemperatur °C" type="number" value={ambientTemperature} onChange={event => setAmbientTemperature(event.target.value)} disabled={saving} inputProps={{step: 0.1}} InputLabelProps={{shrink: true}} />
      <TextField label="Plato °P" type="number" value={plato} onChange={event => setPlato(event.target.value)} disabled={saving} inputProps={{step: 0.1}} InputLabelProps={{shrink: true}} />
      <TextField className="manual-measurement-dialog__note" label="Notiz" multiline minRows={2} value={note} onChange={event => setNote(event.target.value)} disabled={saving} InputLabelProps={{shrink: true}} />
    </div>
  </AppDialog>;
};

const mapState = (state: any, ownProps: ManualMeasurementDialogProps): StateProps => ({
  brewState: state.beerDataReducer.finishedBrews?.find((brew: any) => brew.id === ownProps.beerId)?.state,
  saving: state.fermentationReducer.savingMeasurementIds.includes(ownProps.beerId),
  error: state.fermentationReducer.errors[ownProps.beerId],
});
const mapDispatch = (dispatch: any): DispatchProps => ({saveMeasurement: measurement => dispatch(FermentationActions.createMeasurement(measurement))});
export default connect(mapState, mapDispatch)(ManualMeasurementDialogView);
