import React from 'react';
import {ConfirmationRequestViewModel} from '../../../utils/brewingStatus/selectors';
import {WaitingFor} from '../../../model/brewingStatus.types';
import './InlineProcessNotice.css';

interface ControlConfirmationNoticeProps {
    request: ConfirmationRequestViewModel;
    pending: boolean;
    onConfirm?: () => void;
    heldMashTemperature?: number;
    errorMessage?: string;
}

const compactCopyByWaitingState: Partial<Record<WaitingFor, {title: string; buttonLabel?: string}>> = {
    [WaitingFor.MASHING_IN_CONFIRMATION]: {title: 'Einmaischen abschließen'},
    [WaitingFor.IODINE_TEST]: {title: 'Jodprobe durchführen'},
    [WaitingFor.DECOCTION_CONFIRMATION]: {title: 'Dekoktion abschließen'},
    [WaitingFor.MASHING_OUT_CONFIRMATION]: {title: 'Abmaischen abschließen'},
    [WaitingFor.COOKING_CONFIRMATION]: {title: 'Kochen bestätigen'},
    [WaitingFor.BOILING_CONFIRMATION]: {title: 'Siedepunkt bestätigen', buttonLabel: 'Siedepunkt erreicht'},
};

export const ControlConfirmationNotice: React.FC<ControlConfirmationNoticeProps> = ({request, pending, onConfirm, heldMashTemperature, errorMessage}) => (
    <section className="inline-process-notice inline-process-notice--action" aria-label="Aktion erforderlich" aria-live="polite">
        <div className="inline-process-notice__content">
            <div className="inline-process-notice__heading">
                <span className="inline-process-notice__alert" aria-hidden="true">!</span>
                <span className="inline-process-notice__eyebrow">Aktion erforderlich</span>
            </div>
            <div className="inline-process-notice__action-row">
                <h5>{compactCopyByWaitingState[request.waitingFor as WaitingFor]?.title ?? request.title}</h5>
                {request.canConfirm && request.confirmState && onConfirm && (
                    <button type="button" className="inline-process-notice__button" disabled={pending} onClick={onConfirm}>
                        {pending ? 'Wird verarbeitet …' : (compactCopyByWaitingState[request.waitingFor as WaitingFor]?.buttonLabel ?? request.buttonLabel)}
                    </button>
                )}
            </div>
            {request.waitingFor === WaitingFor.DECOCTION_CONFIRMATION && typeof heldMashTemperature === 'number' && (
                <p className="inline-process-notice__detail">Hauptmaische wird weiterhin auf {heldMashTemperature.toLocaleString('de-DE', {maximumFractionDigits: 1})} °C gehalten.</p>
            )}
            {!request.canConfirm && <p className="inline-process-notice__detail">{request.message}</p>}
            {errorMessage && <p className="inline-process-notice__detail" role="alert">Bestätigung fehlgeschlagen: {errorMessage}</p>}
        </div>
    </section>
);

interface HopReminderNoticeProps {
    hopName: string;
    onDone: () => void;
}

export const HopReminderNotice: React.FC<HopReminderNoticeProps> = ({hopName, onDone}) => (
    <section className="inline-process-notice inline-process-notice--reminder" aria-label="Hopfengabe" aria-live="polite">
        <span className="inline-process-notice__eyebrow">Hopfengabe</span>
        <h5>{hopName} zugeben</h5>
        <p>Der Kochprozess läuft weiter.</p>
        <button type="button" className="inline-process-notice__button inline-process-notice__button--secondary" onClick={onDone}>Erledigt</button>
    </section>
);
