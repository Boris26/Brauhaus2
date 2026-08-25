import React from 'react';
import {ConfirmationRequestViewModel} from '../../../utils/brewingStatus/selectors';
import './InlineProcessNotice.css';

interface ControlConfirmationNoticeProps {
    request: ConfirmationRequestViewModel;
    pending: boolean;
    onConfirm?: () => void;
}

export const ControlConfirmationNotice: React.FC<ControlConfirmationNoticeProps> = ({request, pending, onConfirm}) => (
    <section className="inline-process-notice inline-process-notice--action" aria-label="Aktion erforderlich" aria-live="polite">
        <span className="inline-process-notice__eyebrow">Aktion erforderlich</span>
        <h5>{request.title}</h5>
        <p>{pending ? 'Bestätigung wird verarbeitet …' : request.message}</p>
        {request.canConfirm && request.confirmState && onConfirm && (
            <button type="button" className="inline-process-notice__button" disabled={pending} onClick={onConfirm}>
                {pending ? 'Wird verarbeitet …' : request.buttonLabel}
            </button>
        )}
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
