import React from 'react';
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from '@mui/material';
import {useDispatch, useSelector} from 'react-redux';
import {ProductionActions} from '../../actions/actions';
import type {RootState} from '../../reducers/rootReducer';

const minutes = (seconds?: number): number => Math.max(0, Math.round((Number.isFinite(seconds) ? seconds! : 0) / 60));

const BrewRecoveryDialog: React.FC = () => {
    const dispatch = useDispatch();
    const recoveryState = useSelector((state: RootState) => state.productionReducer.brewRecovery);
    const beers = useSelector((state: RootState) => state.beerDataReducer.beers);
    const envelope = recoveryState.recovery;
    const session = envelope?.brewSession;
    const step = envelope?.status.currentStep;
    const beer = session ? beers?.find((candidate) => candidate.id === session.beerId) : undefined;
    const pending = recoveryState.resumePending || recoveryState.discardPending;
    const updatedAt = envelope?.updatedAt && !Number.isNaN(Date.parse(envelope.updatedAt))
        ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'medium'}).format(new Date(envelope.updatedAt))
        : envelope?.updatedAt ?? 'Nicht verfügbar';

    return (
        <Dialog open={recoveryState.available} maxWidth="sm" fullWidth disableEscapeKeyDown>
            <DialogTitle>Unterbrochener Brauvorgang gefunden</DialogTitle>
            <DialogContent>
                {envelope ? <>
                    <Typography paragraph><strong>Bier:</strong> {beer?.name ?? session?.beerId ?? 'Nicht auflösbar'}</Typography>
                    <Typography paragraph><strong>Schritt:</strong> {step?.name ?? 'Nicht verfügbar'}</Typography>
                    <Typography paragraph>
                        <strong>Fortschritt:</strong><br/>
                        {minutes(step?.elapsedTime)} von {minutes(step?.duration)} Minuten abgeschlossen<br/>
                        {minutes(step?.remainingTime)} Minuten verbleibend
                    </Typography>
                    <Typography paragraph><strong>Letzter gespeicherter Stand:</strong><br/>{updatedAt}</Typography>
                </> : <Typography paragraph>Die Recovery-Daten konnten nicht gelesen werden.</Typography>}
                {recoveryState.error && <Alert severity="error">{recoveryState.error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button
                    color="error"
                    variant="outlined"
                    disabled={pending}
                    onClick={() => dispatch(ProductionActions.discardBrewRecovery())}
                >{recoveryState.discardPending ? 'Wird verworfen…' : 'Verwerfen'}</Button>
                <Button
                    color="primary"
                    variant="contained"
                    disabled={pending || !envelope}
                    onClick={() => dispatch(ProductionActions.resumeBrewRecovery())}
                >{recoveryState.resumePending ? 'Wird fortgesetzt…' : 'Fortsetzen'}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BrewRecoveryDialog;
