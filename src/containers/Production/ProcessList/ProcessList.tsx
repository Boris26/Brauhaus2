import React from "react";
import './ProcessList.css';
import {Beer, FermentationSteps} from "../../../model/Beer";
import {RestExecutionMode} from "../../../enums/eRestExecutionMode";
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from "../../../model/brewingStatus.types";
import {ProcedureType} from "../../../enums/eProcedureType";
import {TimeFormatter} from "../../../utils/TimeFormatter";
import {getConfirmationRequestViewModel} from "../../../utils/brewingStatus/selectors";
import {ControlConfirmationNotice, HopReminderNotice} from "../components/InlineProcessNotice";

export enum ProcessListEntryType {
    HEATING = "HEATING",
    PROCESS = "PROCESS",
    DISPLAY = "DISPLAY"
}

export enum ProcessListDurationUnit {
    MINUTES = "MINUTES",
    SECONDS = "SECONDS"
}

export interface ProcessStepDetail {
    temperature?: number;
    duration?: number;
    durationUnit?: ProcessListDurationUnit;
    confirmationRequired?: boolean;
}


export interface ProcessListCurrentStep {
    index?: number;
    phase?: ProcessPhase;
    mode?: ProcessMode;
    name?: string;
}

export interface ProcessListStep {
    name: string;
    entryType?: ProcessListEntryType;
    /**
     * 1-based index reported by the PI control in brewingStatus.currentStep.index.
     * Heating and execution rows can share the same control step index; the
     * currentStep.mode decides which visible row is active.
     */
    controlStepIndex?: number;
    phase?: ProcessPhase;
    detail?: ProcessStepDetail;
}

export interface ProcessListProps {
    selectedBeer: Beer;
    currentStepIndex: number; // 1-based PI-control currentStep.index
    currentStep?: ProcessListCurrentStep;
    onNextStep?: () => void;
    isNextStepDisabled?: boolean;
    brewingStatus?: BrewingStatus;
    remainingSeconds?: number;
    displayMode?: 'combined' | 'overview' | 'current';
    confirmationPending?: boolean;
    confirmationError?: string;
    onConfirmWaiting?: () => void;
    hopReminderName?: string;
    onCompleteHopReminder?: () => void;
    onStartBrewing?: () => void;
    isStartBrewingDisabled?: boolean;
    startBrewingWarning?: string;
}

interface ProcessListState {
    testStepIndex: number | null;   // interner Test-Index
}

export class ProcessList extends React.Component<ProcessListProps, ProcessListState> {
    activeStepRef: React.RefObject<HTMLLIElement>;
    simpleBarRef: React.RefObject<HTMLDivElement>;

    constructor(props: ProcessListProps) {
        super(props);

        this.state = {
            testStepIndex: null,
        };

        this.activeStepRef = React.createRef();
        this.simpleBarRef = React.createRef();
    }

    // Welcher UI-Array-Index soll wirklich verwendet werden? (Test oder echter)
    get effectiveStepIndex(): number {
        return this.state.testStepIndex ?? getActiveProcessStepIndex(createProcessSteps(this.props.selectedBeer), this.props.currentStepIndex, this.props.currentStep);
    }

    componentDidUpdate(prevProps: ProcessListProps, prevState: ProcessListState) {
        const prevIndex = prevState.testStepIndex ?? getActiveProcessStepIndex(createProcessSteps(prevProps.selectedBeer), prevProps.currentStepIndex, prevProps.currentStep);
        const newIndex = this.effectiveStepIndex;

        if (
            prevIndex !== newIndex &&
            this.activeStepRef.current &&
            this.simpleBarRef.current
        ) {
            setTimeout(() => {
                const scrollWrapper = this.simpleBarRef.current; // ⭐ direkt das Scroll-Element
                const activeNode = this.activeStepRef.current;

                if (scrollWrapper && activeNode) {
                    // Variante mit getBoundingClientRect: aktiven Step ganz nach oben
                    const containerRect = scrollWrapper.getBoundingClientRect();
                    const nodeRect = activeNode.getBoundingClientRect();

                    scrollWrapper.scrollTop += (nodeRect.top - containerRect.top);

                    // Alternative (falls dir lieber):
                    // scrollWrapper.scrollTop = activeNode.offsetTop - scrollWrapper.offsetTop;
                }
            }, 0);
        }
    }

    // Test-Step erhöhen (wrap-around)
    stepTestForward = () => {
        const steps = createProcessSteps(this.props.selectedBeer);

        this.setState(prev => {
            const baseIndex = prev.testStepIndex ?? getActiveProcessStepIndex(steps, this.props.currentStepIndex, this.props.currentStep);
            const next = baseIndex + 1;
            return { testStepIndex: next >= steps.length ? 0 : next };
        });
    };

    renderStepDetails(step: ProcessListStep): React.ReactNode {
        const details: string[] = [];
        if (typeof step.detail?.temperature === 'number' && Number.isFinite(step.detail.temperature) && step.detail.temperature > 0) {
            details.push(`${step.detail.temperature} °C`);
        }
        if (typeof step.detail?.duration === 'number' && Number.isFinite(step.detail.duration) && step.detail.duration > 0) {
            const durationMinutes = step.detail.durationUnit === ProcessListDurationUnit.SECONDS
                ? step.detail.duration / 60
                : step.detail.duration;
            details.push(`${Math.round(durationMinutes)} min`);
        }
        if (step.detail?.confirmationRequired) {
            details.push('Bestätigung erforderlich');
        }

        return details.length > 0 ? <span className="process-step-meta">{details.join(' · ')}</span> : null;
    }

    getCurrentStepTitle(activeStep: ProcessListStep | undefined): string {
        return activeStep?.name ?? this.props.currentStep?.name ?? 'Kein aktiver Prozessschritt';
    }

    getCurrentStepMeta(activeStep: ProcessListStep | undefined, isProcessStarted: boolean): React.ReactNode {
        const {brewingStatus} = this.props;
        const targetTemperature = brewingStatus?.temperature?.target ?? this.getRelatedRastTemperature(activeStep) ?? activeStep?.detail?.temperature;
        const metaItems: React.ReactNode[] = [];

        if (!isProcessStarted) {
            metaItems.push(<span key="ready" className="current-step-time">Bereit zum Start</span>);
            return <div className="current-step-meta">{metaItems}</div>;
        }

        if (typeof targetTemperature === 'number' && Number.isFinite(targetTemperature) && targetTemperature > 0) {
            const isDecoction = brewingStatus?.currentStep?.phase === ProcessPhase.DECOCTION;
            metaItems.push(
                <span key="temperature" className="current-step-temperature">
                    {isDecoction && <small>Hauptmaische · gehaltene Rasttemperatur</small>}
                    {targetTemperature} °C
                </span>
            );
        }

        return <div className="current-step-meta">{metaItems}</div>;
    }

    getRelatedRastTemperature(activeStep: ProcessListStep | undefined): number | undefined {
        if (this.props.brewingStatus?.currentStep?.phase !== ProcessPhase.DECOCTION) return undefined;
        const decoctionName = this.props.brewingStatus.currentStep.name ?? activeStep?.name;
        const decoction = this.props.selectedBeer.fermentation.find((step) => step.procedureType === ProcedureType.DECOCTION && step.type === decoctionName);
        if (!decoction?.relatedRastId) return undefined;
        return this.props.selectedBeer.fermentation.find((step) => step.stepId === decoction.relatedRastId && step.procedureType !== ProcedureType.DECOCTION)?.temperature;
    }

    isHeatingStatus(): boolean {
        return this.props.brewingStatus?.currentStep?.mode === ProcessMode.HEATING;
    }

    isWaitingStatus(): boolean {
        const waitingFor = this.props.brewingStatus?.waiting?.waitingFor;
        return this.props.brewingStatus?.currentStep?.mode === ProcessMode.WAITING || (waitingFor !== undefined && waitingFor !== WaitingFor.NONE);
    }

    isTimedStatus(): boolean {
        const duration = Number(this.props.brewingStatus?.currentStep?.duration);
        return this.props.brewingStatus?.process?.state === ProcessState.ACTIVE
            && this.props.brewingStatus.currentStep?.mode === ProcessMode.TIMER_RUNNING
            && Number.isFinite(duration)
            && duration > 0;
    }

    formatTemperature(value: number): string {
        return value.toLocaleString('de-DE', {maximumFractionDigits: 1});
    }

    renderTemperatureProgress(): React.ReactNode {
        const currentTemperature = Number(this.props.brewingStatus?.temperature?.current);
        const targetTemperature = Number(this.props.brewingStatus?.temperature?.target);
        if (!Number.isFinite(currentTemperature) || currentTemperature <= 0 || !Number.isFinite(targetTemperature) || targetTemperature <= 0) {
            return null;
        }

        return <span className="current-step-status-detail">{this.formatTemperature(currentTemperature)} °C von {this.formatTemperature(targetTemperature)} °C</span>;
    }

    getRemainingTimeText(): string | undefined {
        const {remainingSeconds} = this.props;
        if (!this.isTimedStatus() || typeof remainingSeconds !== 'number') {
            return undefined;
        }
        return TimeFormatter.formatSecondsToHMS(Math.max(0, remainingSeconds));
    }

    renderStatusSection(isProcessStarted: boolean): React.ReactNode {
        if (!isProcessStarted) {
            return <div className="current-step-status current-step-status--reserved" aria-label="Statusbereich" />;
        }
        if (this.props.brewingStatus?.process?.state === ProcessState.FINISHED) {
            return (
                <div className="current-step-status" aria-label="Statusbereich">
                    <span className="current-step-status-label">Status</span>
                    <span className="current-step-status-value">Brauvorgang abgeschlossen</span>
                </div>
            );
        }
        if (this.isHeatingStatus()) {
            const statusText = this.props.brewingStatus?.heating?.followsDecoction === true
                ? 'Hauptmaische wird nach der Dekoktion aufgeheizt'
                : 'Zieltemperatur wird erreicht';
            return (
                <div className="current-step-status" aria-label="Statusbereich">
                    <span className="current-step-status-label">Status</span>
                    <span className="current-step-status-value">{statusText}</span>
                    {this.renderTemperatureProgress()}
                </div>
            );
        }
        if (this.isWaitingStatus()) {
            return (
                <div className="current-step-status" aria-label="Statusbereich">
                    <span className="current-step-status-label">Status</span>
                    <span className="current-step-status-value">Wartet auf Bestätigung</span>
                </div>
            );
        }
        if (!this.isTimedStatus()) {
            return (
                <div className="current-step-status" aria-label="Statusbereich">
                    <span className="current-step-status-label">Status</span>
                    <span className="current-step-status-value">Schritt wird ausgeführt</span>
                </div>
            );
        }

        const progressPercent = this.getStepProgressPercent();
        const remainingTimeText = this.getRemainingTimeText();
        if (progressPercent === undefined || remainingTimeText === undefined) {
            return (
                <div className="current-step-status" aria-label="Statusbereich">
                    <span className="current-step-status-label">Status</span>
                    <span className="current-step-status-value">Schritt wird ausgeführt</span>
                </div>
            );
        }

        return (
            <div className="current-step-status" aria-label="Statusbereich">
                <div className="current-step-progress" aria-label={`Fortschritt ${progressPercent}%`}>
                    <div className="current-step-progress-header">
                        <span>Fortschritt</span>
                        <span>{progressPercent} %</span>
                    </div>
                    <div className="current-step-progress-track">
                        <div className="current-step-progress-fill" style={{width: `${progressPercent}%`}} />
                    </div>
                </div>
                <div className="current-step-remaining" aria-label="Restzeit">
                    <span className="current-step-remaining-label">Restzeit</span>
                    <span className="current-step-remaining-value">{remainingTimeText}</span>
                </div>
            </div>
        );
    }

    renderInlineNotice(): React.ReactNode {
        const confirmationRequest = getConfirmationRequestViewModel(this.props.brewingStatus);
        if (confirmationRequest) {
            const heldMashTemperature = this.props.brewingStatus?.currentStep?.phase === ProcessPhase.DECOCTION
                ? this.props.brewingStatus?.temperature?.target ?? this.getRelatedRastTemperature(undefined)
                : undefined;
            return <ControlConfirmationNotice request={confirmationRequest} pending={this.props.confirmationPending === true} onConfirm={this.props.onConfirmWaiting} heldMashTemperature={heldMashTemperature} errorMessage={this.props.confirmationError} />;
        }
        if (this.props.hopReminderName && this.props.onCompleteHopReminder) {
            return <HopReminderNotice hopName={this.props.hopReminderName} onDone={this.props.onCompleteHopReminder} />;
        }
        return null;
    }


    getStepProgressPercent(): number | undefined {
        const {brewingStatus, remainingSeconds} = this.props;
        const duration = Number(brewingStatus?.currentStep?.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            return undefined;
        }

        const elapsedFromRemaining = typeof remainingSeconds === 'number'
            ? duration - remainingSeconds
            : Number(brewingStatus?.currentStep?.elapsedTime);
        if (!Number.isFinite(elapsedFromRemaining)) {
            return undefined;
        }

        return Math.min(100, Math.max(0, Math.round(elapsedFromRemaining * 100 / duration)));
    }

    render() {
        const { selectedBeer, onNextStep, isNextStepDisabled = false, brewingStatus, displayMode = 'combined' } = this.props;
        const steps = createProcessSteps(selectedBeer);
        const hasRecipeProcess = steps.length > 0;
        const isProcessStarted = brewingStatus !== undefined && brewingStatus.process?.state !== ProcessState.IDLE;
        const stepIndex = isProcessStarted && hasRecipeProcess ? this.effectiveStepIndex : -1;
        const activeStep = stepIndex >= 0 ? steps[stepIndex] : undefined;
        const upcomingSteps = stepIndex >= 0 ? steps.slice(stepIndex + 1) : steps;
        const progressLabel = stepIndex >= 0 ? `${stepIndex + 1} / ${steps.length}` : '';
        const confirmationRequest = getConfirmationRequestViewModel(brewingStatus);

        const currentStepCard = hasRecipeProcess ? (
            <>
                <div className="current-process-label">{isProcessStarted ? 'Aktiver Schritt' : 'Brauprozess'}</div>
                <section className={`current-process-step${confirmationRequest ? ' current-process-step--action-required' : ''}`} aria-label="Aktueller Prozessschritt">
                    {!isProcessStarted ? (
                        <div className="process-start-state">
                            <h4>Brauprozess</h4>
                            <button className="startBtn" type="button" disabled={this.props.isStartBrewingDisabled} onClick={this.props.onStartBrewing}>Brauvorgang starten</button>
                            {this.props.startBrewingWarning && <p className="sensorStartWarning" role="alert">{this.props.startBrewingWarning}</p>}
                        </div>
                    ) : (
                        <>
                            <div className="current-step-heading">
                                <div><h4>{this.getCurrentStepTitle(activeStep)}</h4></div>
                                {this.getCurrentStepMeta(activeStep, true)}
                            </div>
                            {!confirmationRequest && this.renderStatusSection(true)}
                            {this.renderInlineNotice()}
                        </>
                    )}
                </section>
            </>
        ) : <div className="process-empty-state">Kein Bier für den Brauvorgang ausgewählt.</div>;

        if (displayMode === 'current') {
            return <div className="current-step-panel">{currentStepCard}</div>;
        }

        return (
            <div className="process-list">
                <div className="process-card-header">
                    <h3 className="process-title">Prozess</h3>
                    {progressLabel && <span className="process-progress-count">{progressLabel}</span>}
                </div>

                <ul className="process-list-legacy" aria-hidden="true">
                    {steps.map((step, idx) => (
                        <li
                            key={`legacy-${step.name}-${idx}`}
                            ref={idx === stepIndex ? this.activeStepRef : undefined}
                            className={"process-step" + (idx === stepIndex ? " active" : "")}
                        >
                            <span className="step-number">{idx + 1}.</span> {step.name}
                        </li>
                    ))}
                </ul>

                {!hasRecipeProcess ? (
                    <div className="process-empty-state">Kein Bier für den Brauvorgang ausgewählt.</div>
                ) : (
                    <>
                        {displayMode === 'combined' && currentStepCard}

                        <section className="upcoming-process" aria-label="Ablauf">
                            <h4>Ablauf</h4>
                            <div className="upcoming-process-scroll">
                                {upcomingSteps.length > 0 ? (
                                    <ul>
                                        {upcomingSteps.map((step, idx) => (
                                            <li key={`${step.name}-${idx}`} className="upcoming-process-step">
                                                <span className="upcoming-step-marker" aria-hidden="true" />
                                                <span className="upcoming-step-content">
                                                    <span className="upcoming-step-name">{step.name}</span>
                                                    {this.renderStepDetails(step)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="process-complete-state">Keine weiteren Schritte.</p>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {onNextStep && (
                    <>
                        <hr className="next-step-separator" />
                        <div className="next-step-btn-container">
                            <button
                                className="nextStepBtn"
                                onClick={onNextStep}
                                disabled={isNextStepDisabled}
                                aria-disabled={isNextStepDisabled}
                                title={isNextStepDisabled ? "Nächster Prozessschritt ist nicht verfügbar" : "Nächster Prozessschritt"}
                            >
                                Nächster Schritt
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }
}


// -------------------------------------------------------
// PROCESS STEPS GENERATION
// -------------------------------------------------------

export function createProcessSteps(selectedBeer: Beer): ProcessListStep[] {
    let processSteps: ProcessListStep[] = [];
    if (!selectedBeer || !Array.isArray(selectedBeer.fermentation)) {
        return processSteps;
    }

    const fermentation = selectedBeer.fermentation;
    let controlStepIndex = 1;

    // Einmaischen
    const einmaischen = fermentation.find(step => step.type === 'Einmaischen');
    if (einmaischen) {
        processSteps.push({ name: `Aufheizen für Einmaischen`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_IN, detail: {temperature: einmaischen.temperature} });
        processSteps.push({ name: 'Einmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_IN, detail: {temperature: einmaischen.temperature, confirmationRequired: true} });
        controlStepIndex++;
    }

    let lastMashStepIndex = -1;

    // Sequenzielle Maischeschritte (Rasten und Dekoktionen)
    fermentation.forEach((step: FermentationSteps) => {
        const isConfirmationHold = (step.executionMode ?? RestExecutionMode.TIMED) === RestExecutionMode.CONFIRMATION_HOLD;
        const procedureType = step.procedureType ?? (isConfirmationHold ? ProcedureType.DECOCTION : ProcedureType.RAST);
        const isFixedStep = ['Einmaischen', 'Abmaischen', 'Kochen'].includes(step.type);
        if (!isFixedStep) {
            const phase = procedureType === ProcedureType.DECOCTION ? ProcessPhase.DECOCTION : ProcessPhase.RAST;
            if (procedureType === ProcedureType.RAST) processSteps.push({ name: `Aufheizen für ${step.type}`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase, detail: {temperature: step.temperature} });
            processSteps.push({ name: step.type || (phase === ProcessPhase.DECOCTION ? 'Dekoktion' : 'Rast'), entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase, detail: {temperature: step.temperature, duration: step.time, durationUnit: ProcessListDurationUnit.MINUTES, confirmationRequired: procedureType === ProcedureType.DECOCTION} });
            controlStepIndex++;
            lastMashStepIndex = processSteps.length - 1;
        }
    });

    // Jod-Probe nach letztem Maischeschritt (Rast oder Dekoktion)
    if (lastMashStepIndex !== -1) {
        processSteps.splice(lastMashStepIndex + 1, 0, { name: 'Jod Probe', entryType: ProcessListEntryType.DISPLAY, detail: {confirmationRequired: true} });
    }

    // Abmaischen
    const abmaischen = fermentation.find(step => step.type === 'Abmaischen');
    if (abmaischen) {
        processSteps.push({ name: `Aufheizen für Abmaischen`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_OUT, detail: {temperature: abmaischen.temperature} });
        processSteps.push({ name: 'Abmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_OUT, detail: {temperature: abmaischen.temperature, confirmationRequired: true} });
        controlStepIndex++;
    }

    // Kochen
    processSteps.push({ name: 'Aufheizen auf Kochen', entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.COOKING, detail: {temperature: selectedBeer.cookingTemperatur} });
    processSteps.push({ name: 'Kochen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.COOKING, detail: {temperature: selectedBeer.cookingTemperatur, duration: selectedBeer.cookingTime * 60, durationUnit: ProcessListDurationUnit.SECONDS} });
    controlStepIndex++;

    return processSteps;
}

export function getActiveProcessStepIndex(processSteps: ProcessListStep[], currentControlStepIndex: number, currentStep?: ProcessListCurrentStep): number {
    const controlStepIndex = currentStep?.index ?? currentControlStepIndex;
    const requestedEntryType = currentStep?.mode === ProcessMode.HEATING
        ? ProcessListEntryType.HEATING
        : ProcessListEntryType.PROCESS;

    const activeIndex = processSteps.findIndex(step =>
        step.controlStepIndex === controlStepIndex &&
        step.entryType === requestedEntryType &&
        (currentStep?.phase === undefined || step.phase === undefined || step.phase === currentStep.phase)
    );

    if (activeIndex >= 0) {
        return activeIndex;
    }

    const fallbackIndex = processSteps.findIndex(step => step.controlStepIndex === controlStepIndex);
    return fallbackIndex >= 0 ? fallbackIndex : 0;
}
