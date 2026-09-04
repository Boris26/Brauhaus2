import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, LinearProgress, Typography} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {useDispatch, useSelector} from 'react-redux';
import {BeerActions, ProductionActions} from '../../actions/actions';
import type {RootState} from '../../reducers/rootReducer';
import AppDialog from '../AppDialog/AppDialog';
import './BrewRecoveryDialog.css';

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
        ? new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}).format(new Date(envelope.updatedAt)).replace(',', ' ·')
        : envelope?.updatedAt ?? 'Nicht verfügbar';
    const elapsedMinutes = minutes(step?.elapsedTime);
    const durationMinutes = minutes(step?.duration);
    const remainingMinutes = minutes(step?.remainingTime);
    const progress = step?.duration && step.duration > 0 ? Math.min(100, Math.max(0, (Number(step.elapsedTime) || 0) / step.duration * 100)) : 0;

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
        <AppDialog open={recoveryState.available} variant={confirmDiscard ? 'confirm' : 'recovery'} disableClose
            title={confirmDiscard ? 'Brauvorgang wirklich verwerfen?' : 'Unterbrochener Brauvorgang gefunden'}
            description={!confirmDiscard ? 'Der letzte Brauvorgang wurde nicht regulär beendet.' : undefined}
            actions={confirmDiscard ? <>
                <Button disabled={pending} onClick={() => setConfirmDiscard(false)}>Abbrechen</Button>
                <Button color="error" variant="outlined" disabled={pending} startIcon={<DeleteOutlineRoundedIcon/>}
                        onClick={() => dispatch(ProductionActions.discardBrewRecovery())}>
                    {recoveryState.discardPending ? 'Brauvorgang wird verworfen …' : 'Brauvorgang verwerfen'}
                </Button>
            </> : <>
                <Button color="error" variant="outlined" disabled={pending} startIcon={<DeleteOutlineRoundedIcon/>}
                        onClick={() => setConfirmDiscard(true)}>Brauvorgang verwerfen</Button>
                <Button color="primary" variant="contained" disabled={pending || !envelope} startIcon={<PlayArrowRoundedIcon/>}
                        onClick={() => dispatch(ProductionActions.resumeBrewRecovery())}>
                    {recoveryState.resumePending ? 'Brauvorgang wird wiederhergestellt …' : 'Brauvorgang fortsetzen'}
                </Button>
            </>}>
                {confirmDiscard ? <Typography paragraph>
                    Der gespeicherte Fortschritt dieses unterbrochenen Brauvorgangs wird gelöscht und kann anschließend nicht mehr fortgesetzt werden.
                </Typography> : envelope ? <>
                    <section className="recovery-dialog__brew">
                        <h3>{beer?.name ?? session?.beerId ?? 'Nicht auflösbar'}</h3>
                        <p>{step?.name ?? 'Nicht verfügbar'}</p>
                    </section>
                    <section className="recovery-dialog__progress" aria-label="Fortschritt">
                        <div className="recovery-dialog__label-row"><span>Fortschritt</span><strong>{elapsedMinutes} / {durationMinutes} Minuten</strong></div>
                        <LinearProgress variant="determinate" value={progress} aria-label={`${Math.round(progress)} Prozent abgeschlossen`}/>
                        <p>Noch etwa {remainingMinutes} Minuten</p>
                    </section>
                    <section className="recovery-dialog__timestamp"><span>Letzter gespeicherter Stand</span><strong>{updatedAt}</strong></section>
                </> : <Typography paragraph>Die Recovery-Daten konnten nicht gelesen werden.</Typography>}
                {recoveryState.error && <Alert severity="error">
                    <strong>{recoveryState.errorOperation === 'discard'
                        ? 'Der gespeicherte Brauvorgang konnte nicht verworfen werden.'
                        : 'Der Brauvorgang konnte nicht wiederhergestellt werden.'}</strong>
                    <Typography variant="body2">{recoveryState.error}</Typography>
                </Alert>}
        </AppDialog>
    );
};

export default BrewRecoveryDialog;
