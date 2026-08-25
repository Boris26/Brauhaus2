import {ConfirmStates} from '../../enums/eConfirmStates';
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor, WaitingState} from '../../model/brewingStatus.types';

/**
 * Diese Selektoren kapseln alle UI-Entscheidungen.
 * Grundidee: Die UI soll nicht mehr auf alte Textfelder (StatusText etc.) reagieren,
 * sondern auf strukturierte Backend-Fakten (state/phase/mode/waitingFor).
 */
export const isProcessIdle = (aStatus?: BrewingStatus) => aStatus?.process.state === ProcessState.IDLE;
export const isProcessActive = (aStatus?: BrewingStatus) => aStatus?.process.state === ProcessState.ACTIVE;
export const isBrewingProcessActive = (aStatus?: BrewingStatus) => isProcessActive(aStatus);
export const isProcessFinished = (aStatus?: BrewingStatus) => aStatus?.process.state === ProcessState.FINISHED;
export const isProcessAborted = (aStatus?: BrewingStatus) => aStatus?.process.state === ProcessState.ABORTED;
export const isProcessInError = (aStatus?: BrewingStatus) => aStatus?.process.state === ProcessState.ERROR;
export const isStepWaiting = (aStatus?: BrewingStatus) => aStatus?.currentStep.mode === ProcessMode.WAITING;

export const confirmationTypeByWaitingState: Partial<Record<WaitingState, ConfirmStates>> = {
    [WaitingFor.IODINE_TEST]: ConfirmStates.IODINE,
    [WaitingFor.MASHING_IN_CONFIRMATION]: ConfirmStates.MASHUP,
    [WaitingFor.MASHING_OUT_CONFIRMATION]: ConfirmStates.MASHUP,
    [WaitingFor.BOILING_CONFIRMATION]: ConfirmStates.BOILING,
    [WaitingFor.COOKING_CONFIRMATION]: ConfirmStates.COOKING,
    [WaitingFor.DECOCTION_CONFIRMATION]: ConfirmStates.DECOCTION,
};

const warnedUnknownWaitingStates = new Set<string>();
const waitingStatesWithoutConfirmEndpoint = [WaitingFor.NONE, WaitingFor.USER_CONFIRMATION];

export const getConfirmationTypeForWaitingState = (aWaitingFor?: WaitingState): ConfirmStates | undefined => {
    if (!aWaitingFor || waitingStatesWithoutConfirmEndpoint.includes(aWaitingFor as WaitingFor)) {
        return undefined;
    }

    const confirmationType = confirmationTypeByWaitingState[aWaitingFor];
    if (confirmationType === undefined && !warnedUnknownWaitingStates.has(aWaitingFor)) {
        warnedUnknownWaitingStates.add(aWaitingFor);
        console.warn(`Unknown waitingFor value "${aWaitingFor}" has no concrete confirmation command; no Confirm endpoint will be called.`);
    }
    return confirmationType;
};

export const getConfirmationType = (aStatus?: BrewingStatus) => getConfirmationTypeForWaitingState(aStatus?.waiting.waitingFor);
export const hasConcreteConfirmation = (aStatus?: BrewingStatus) => getConfirmationType(aStatus) !== undefined;
export const shouldShowWaitingDialog = (aStatus?: BrewingStatus) => !!aStatus && isProcessActive(aStatus) && isStepWaiting(aStatus) && aStatus.waiting.canConfirm === true && hasConcreteConfirmation(aStatus);
export const shouldShowConfirmButton = (aStatus?: BrewingStatus) => shouldShowWaitingDialog(aStatus);
export const getConfirmButtonLabel = (aStatus?: BrewingStatus) => {
    switch (aStatus?.waiting.waitingFor) {
        case WaitingFor.IODINE_TEST: return 'Iodine bestätigen';
        case WaitingFor.MASHING_IN_CONFIRMATION: return 'Einmaischen bestätigen';
        case WaitingFor.MASHING_OUT_CONFIRMATION: return 'Abmaischen bestätigen';
        case WaitingFor.COOKING_CONFIRMATION: return 'Kochen bestätigen';
        case WaitingFor.BOILING_CONFIRMATION: return 'Siedepunkt bestätigen';
        case WaitingFor.DECOCTION_CONFIRMATION: return 'Dickmaische bestätigen';
        case WaitingFor.USER_CONFIRMATION: return 'Bestätigen';
        default: return 'Bestätigen';
    }
};

export interface ConfirmationRequestViewModel {
    waitingFor: WaitingState;
    title: string;
    message: string;
    buttonLabel?: string;
    confirmState?: ConfirmStates;
    canConfirm: boolean;
    requiresAction: boolean;
}

const confirmationCopyByWaitingState: Partial<Record<WaitingState, Pick<ConfirmationRequestViewModel, 'title' | 'message' | 'buttonLabel'>>> = {
    [WaitingFor.MASHING_IN_CONFIRMATION]: {
        title: 'Einmaischen bestätigen',
        message: 'Bitte das Einmaischen abschließen und anschließend bestätigen.',
        buttonLabel: 'Einmaischen abgeschlossen',
    },
    [WaitingFor.IODINE_TEST]: {
        title: 'Jodprobe durchführen',
        message: 'Bitte die Jodprobe durchführen und das Ergebnis anschließend bestätigen.',
        buttonLabel: 'Jodprobe abgeschlossen',
    },
    [WaitingFor.DECOCTION_CONFIRMATION]: {
        title: 'Dekoktion',
        message: 'Die Dekoktion läuft. Die Hauptmaische wird weiterhin auf der Temperatur der zugehörigen Rast gehalten.',
        buttonLabel: 'Dekoktion abgeschlossen',
    },
    [WaitingFor.MASHING_OUT_CONFIRMATION]: {
        title: 'Abmaischen bestätigen',
        message: 'Bitte Abmaischen und Nachguss abschließen und anschließend bestätigen.',
        buttonLabel: 'Abmaischen abgeschlossen',
    },
    [WaitingFor.COOKING_CONFIRMATION]: {
        title: 'Kochen bestätigen',
        message: 'Bestätigung für den Kochvorgang erforderlich.',
        buttonLabel: 'Kochen bestätigen',
    },
    [WaitingFor.BOILING_CONFIRMATION]: {
        title: 'Siedepunkt bestätigen',
        message: 'Bitte bestätigen, dass der Siedepunkt erreicht ist.',
        buttonLabel: 'Siedepunkt bestätigen',
    },
};

/** Zentrales, darstellungsfertiges Modell für blockierende und unbekannte Wartezustände. */
export const getConfirmationRequestViewModel = (aStatus?: BrewingStatus): ConfirmationRequestViewModel | undefined => {
    if (!aStatus || !isProcessActive(aStatus) || !isStepWaiting(aStatus)) return undefined;

    const waitingFor = aStatus.waiting.waitingFor;
    const confirmState = getConfirmationTypeForWaitingState(waitingFor);
    const copy = confirmationCopyByWaitingState[waitingFor];
    const canConfirm = aStatus.waiting.canConfirm === true && confirmState !== undefined;

    return {
        waitingFor,
        title: copy?.title ?? 'Wartet auf Benutzeraktion',
        message: copy?.message ?? 'Der Brauprozess wartet auf eine Benutzeraktion. Für diesen Zustand ist keine Bestätigung in der UI verfügbar.',
        buttonLabel: canConfirm ? (copy?.buttonLabel ?? getConfirmButtonLabel(aStatus)) : undefined,
        confirmState,
        canConfirm,
        requiresAction: true,
    };
};
/** WAITING ist ein Prozess-Blocker. HOLDING ist dagegen nur Temperaturhalten und kein Blocker. */
export const getBrewingStatusLabel = (aStatus?: BrewingStatus) => {
    if (!aStatus) return 'Bereit / kein Brauvorgang aktiv';
    if (isProcessInError(aStatus)) return 'Fehler im Prozess';
    if (isProcessAborted(aStatus)) return 'Brauvorgang abgebrochen';
    if (isProcessFinished(aStatus)) return 'Brauvorgang abgeschlossen';
    if (isProcessIdle(aStatus)) return 'Bereit / kein Brauvorgang aktiv';
    const aPhase = aStatus.currentStep.phase; const aMode = aStatus.currentStep.mode; const aWaitingFor = aStatus.waiting.waitingFor;
    if (aMode === ProcessMode.WAITING && aPhase === ProcessPhase.MASHING_IN && aWaitingFor === WaitingFor.MASHING_IN_CONFIRMATION) return 'Einmaischen: bitte bestätigen';
    if (aMode === ProcessMode.WAITING && aPhase === ProcessPhase.RAST && aWaitingFor === WaitingFor.IODINE_TEST) return 'Warten auf Iodine-Test';
    if (aMode === ProcessMode.WAITING && aPhase === ProcessPhase.DECOCTION && aWaitingFor === WaitingFor.DECOCTION_CONFIRMATION) return 'Dekoktion: bitte bestätigen';
    if (aMode === ProcessMode.WAITING && aPhase === ProcessPhase.MASHING_OUT && aWaitingFor === WaitingFor.MASHING_OUT_CONFIRMATION) return 'Abmaischen und Nachguss abgeschlossen?';
    if (aMode === ProcessMode.WAITING && aPhase === ProcessPhase.COOKING && aWaitingFor === WaitingFor.BOILING_CONFIRMATION) return 'Warten auf Siedepunkt-Bestätigung';
    if (aMode === ProcessMode.WAITING && aWaitingFor === WaitingFor.COOKING_CONFIRMATION) return 'Bestätigung für den Kochvorgang erforderlich';
    if (aPhase === ProcessPhase.MASHING_IN && aMode === ProcessMode.HEATING) return 'Einmaischen: Aufheizen läuft';
    if (aPhase === ProcessPhase.RAST && aMode === ProcessMode.HEATING) return 'Rast: Aufheizen auf Solltemperatur';
    if (aPhase === ProcessPhase.RAST && aMode === ProcessMode.HOLDING) return 'Rasttemperatur wird gehalten';
    if (aPhase === ProcessPhase.RAST && aMode === ProcessMode.TIMER_RUNNING) return 'Rast läuft';
    if (aPhase === ProcessPhase.DECOCTION) return 'Dekoktion';
    if (aPhase === ProcessPhase.COOKING && aMode === ProcessMode.HEATING) return 'Kochen: Aufheizen';
    if (aPhase === ProcessPhase.COOKING && aMode === ProcessMode.TIMER_RUNNING) return 'Kochen läuft';
    return 'Brauprozess aktiv';
};
export const shouldShowCountdown = (aStatus?: BrewingStatus) => aStatus?.currentStep.mode === ProcessMode.TIMER_RUNNING;
export const getCountdownValue = (aStatus?: BrewingStatus) => aStatus?.currentStep.remainingTime ?? 0;
export const shouldShowTemperatureStatus = (aStatus?: BrewingStatus) => !!aStatus && isProcessActive(aStatus) && [ProcessMode.HEATING, ProcessMode.HOLDING, ProcessMode.TIMER_RUNNING, ProcessMode.WAITING].includes(aStatus.currentStep.mode);
export const getCurrentStepIdentity = (aStatus?: BrewingStatus) => `${aStatus?.currentStep.index ?? -1}|${aStatus?.currentStep.phase ?? ProcessPhase.NONE}|${aStatus?.currentStep.mode ?? ProcessMode.NONE}|${aStatus?.currentStep.name ?? ''}`;
export const getStatusChangeKey = (aStatus?: BrewingStatus) => `${aStatus?.process.state ?? ProcessState.IDLE}|${getCurrentStepIdentity(aStatus)}|${aStatus?.waiting.waitingFor ?? WaitingFor.NONE}`;
