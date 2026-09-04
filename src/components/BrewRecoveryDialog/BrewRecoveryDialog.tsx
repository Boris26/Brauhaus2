import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from '@mui/material';
import {useDispatch, useSelector} from 'react-redux';
import {BeerActions, ProductionActions} from '../../actions/actions';
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
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const requestedBeerId = useRef<string | undefined>(undefined);
    const updatedAt = envelope?.updatedAt && !Number.isNaN(Date.parse(envelope.updatedAt))
        ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'medium'}).format(new Date(envelope.updatedAt))
        : envelope?.updatedAt ?? 'Nicht verfügbar';

    useEffect(() => {
        if (!recoveryState.available) setConfirmDiscard(false);
    }, [recoveryState.available]);

    useEffect(() => {
        if (session?.beerId && !beer && requestedBeerId.current !== session.beerId) {
            requestedBeerId.current = session.beerId;
            dispatch(BeerActions.getBeers(true));
        }
    }, [beer, beers, dispatch, session?.beerId]);

    return (
        <Dialog open={recoveryState.available} maxWidth="sm" fullWidth disableEscapeKeyDown>
            <DialogTitle>{confirmDiscard ? 'Brauvorgang wirklich verwerfen?' : 'Unterbrochener Brauvorgang gefunden'}</DialogTitle>
            <DialogContent>
                {confirmDiscard ? <Typography paragraph>
                    Der gespeicherte Fortschritt dieses unterbrochenen Brauvorgangs wird gelöscht und kann anschließend nicht mehr fortgesetzt werden.
                </Typography> : envelope ? <>
                    <Typography paragraph>Der letzte Brauvorgang wurde nicht regulär beendet.</Typography>
                    <Typography paragraph><strong>Bier:</strong> {beer?.name ?? session?.beerId ?? 'Nicht auflösbar'}</Typography>
                    <Typography paragraph><strong>Schritt:</strong> {step?.name ?? 'Nicht verfügbar'}</Typography>
                    <Typography paragraph>
                        <strong>Fortschritt:</strong><br/>
                        {minutes(step?.elapsedTime)} von {minutes(step?.duration)} Minuten abgeschlossen<br/>
                        {minutes(step?.remainingTime)} Minuten verbleibend
                    </Typography>
                    <Typography paragraph><strong>Letzter gespeicherter Stand:</strong><br/>{updatedAt}</Typography>
                </> : <Typography paragraph>Die Recovery-Daten konnten nicht gelesen werden.</Typography>}
                {recoveryState.error && <Alert severity="error">
                    <strong>{recoveryState.errorOperation === 'discard'
                        ? 'Der gespeicherte Brauvorgang konnte nicht verworfen werden.'
                        : 'Der Brauvorgang konnte nicht wiederhergestellt werden.'}</strong>
                    <Typography variant="body2">{recoveryState.error}</Typography>
                </Alert>}
            </DialogContent>
            <DialogActions>
                {confirmDiscard ? <>
                    <Button disabled={pending} onClick={() => setConfirmDiscard(false)}>Zurück</Button>
                    <Button color="error" variant="contained" disabled={pending}
                            onClick={() => dispatch(ProductionActions.discardBrewRecovery())}>
                        {recoveryState.discardPending ? 'Brauvorgang wird verworfen …' : 'Endgültig verwerfen'}
                    </Button>
                </> : <>
                    <Button color="error" variant="outlined" disabled={pending}
                            onClick={() => setConfirmDiscard(true)}>Brauvorgang verwerfen</Button>
                    <Button color="primary" variant="contained" disabled={pending || !envelope}
                            onClick={() => dispatch(ProductionActions.resumeBrewRecovery())}>
                        {recoveryState.resumePending ? 'Brauvorgang wird wiederhergestellt …' : 'Brauvorgang fortsetzen'}
                    </Button>
                </>}
            </DialogActions>
        </Dialog>
    );
};

export default BrewRecoveryDialog;
