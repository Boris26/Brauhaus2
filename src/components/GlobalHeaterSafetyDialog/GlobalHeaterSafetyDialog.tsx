import React, {useEffect, useMemo, useState} from 'react';
import ModalDialog, {DialogType} from '../ModalDialog/ModalDialog';
import {HeaterSafetyRepository} from '../../repositorys/HeaterSafetyRepository';
import {heaterStuckOnAlarmDisplay} from '../../utils/brewingStatus/alarmDisplay';
import {formatTemperature} from '../../utils/temperatureSensor';

export const GlobalHeaterSafetyDialogOwnedContext = React.createContext(false);

export interface GlobalHeaterSafetyDialogProps {
    open: boolean;
    temperature?: number | null;
    heatingRunning?: boolean;
}

const formatResetError = (error: unknown): string => {
    const data = (error as any)?.response?.data;
    const message = data?.error?.message ?? data?.error ?? data?.message ?? data?.detail;
    return typeof message === 'string' && message.trim()
        ? message
        : 'Sicherheitsalarm konnte nicht zurückgesetzt werden.';
};

export const GlobalHeaterSafetyDialog: React.FC<GlobalHeaterSafetyDialogProps> = ({open, temperature, heatingRunning}) => {
    const [resetting, setResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setResetting(false);
            setResetError(null);
        }
    }, [open]);

    const content = useMemo(() => {
        const heaterState = heatingRunning === true ? 'EIN' : heatingRunning === false ? 'AUS' : 'Nicht verfügbar';
        return [
            heaterStuckOnAlarmDisplay.message,
            `Aktuelle Temperatur: ${formatTemperature(temperature)}`,
            `Heizung laut Steuerung: ${heaterState}`,
            resetError ? `Reset fehlgeschlagen: ${resetError}` : null,
        ].filter(Boolean).join('\n\n');
    }, [heatingRunning, resetError, temperature]);

    const resetSafety = async (): Promise<void> => {
        if (resetting) return;
        setResetting(true);
        setResetError(null);
        try {
            await HeaterSafetyRepository.reset();
            // Visibility remains controlled by the global alarm snapshot. The
            // dialog disappears only after the controller clears HEATER_STUCK_ON.
        } catch (error) {
            setResetError(formatResetError(error));
        } finally {
            setResetting(false);
        }
    };

    return (
        <ModalDialog
            onConfirm={() => { void resetSafety(); }}
            type={DialogType.ERROR}
            open={open}
            content={content}
            header={heaterStuckOnAlarmDisplay.title}
            confirmLabel={resetting ? 'Wird zurückgesetzt…' : 'Sicherheitsalarm zurücksetzen'}
            confirmColor="error"
            confirmVariant="contained"
            actionsDisabled={resetting}
            disableClose
        />
    );
};

export default GlobalHeaterSafetyDialog;
