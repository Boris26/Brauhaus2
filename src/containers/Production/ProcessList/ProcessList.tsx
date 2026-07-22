import React from "react";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './ProcessList.css';
import {Beer, FermentationSteps} from "../../../model/Beer";
import {RestExecutionMode} from "../../../enums/eRestExecutionMode";
import {BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor} from "../../../model/brewingStatus.types";
import {TimeFormatter} from "../../../utils/TimeFormatter";

export enum ProcessListEntryType {
    HEATING = "HEATING",
    PROCESS = "PROCESS",
    DISPLAY = "DISPLAY"
}

export interface ProcessStepDetail {
    temperature?: number;
    duration?: number;
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
            details.push(`${Math.round(step.detail.duration / 60)} min`);
        }
        if (step.detail?.confirmationRequired) {
            details.push('Bestätigung erforderlich');
        }

        return details.length > 0 ? <span className="process-step-meta">{details.join(' · ')}</span> : null;
    }

    getCurrentStepTitle(activeStep: ProcessListStep | undefined): string {
        return activeStep?.name ?? this.props.currentStep?.name ?? 'Kein aktiver Prozessschritt';
    }

    getCurrentStepMeta(activeStep: ProcessListStep | undefined): React.ReactNode {
        const {brewingStatus, remainingSeconds} = this.props;
        const targetTemperature = brewingStatus?.temperature?.target ?? activeStep?.detail?.temperature;
        const isFinished = brewingStatus?.process?.state === ProcessState.FINISHED;
        const hasDuration = typeof brewingStatus?.currentStep?.duration === 'number' && brewingStatus.currentStep.duration > 0;
        const isWaiting = brewingStatus?.currentStep?.mode === ProcessMode.WAITING || (brewingStatus?.waiting?.waitingFor !== undefined && brewingStatus.waiting.waitingFor !== WaitingFor.NONE);
        const metaItems: React.ReactNode[] = [];

        if (typeof targetTemperature === 'number' && Number.isFinite(targetTemperature) && targetTemperature > 0) {
            metaItems.push(<span key="temperature" className="current-step-temperature">{targetTemperature} °C</span>);
        }

        if (isFinished) {
            metaItems.push(<span key="remaining" className="current-step-time">Restzeit {TimeFormatter.formatSecondsToHMS(0)}</span>);
        } else if (isWaiting) {
            metaItems.push(<span key="waiting" className="current-step-time">Wartet auf Bestätigung</span>);
        } else if (hasDuration && typeof remainingSeconds === 'number') {
            metaItems.push(<span key="remaining" className="current-step-time">Restzeit {TimeFormatter.formatSecondsToHMS(remainingSeconds)}</span>);
        } else {
            metaItems.push(<span key="no-duration" className="current-step-time">Keine feste Dauer</span>);
        }

        return <div className="current-step-meta">{metaItems}</div>;
    }

    render() {
        const { selectedBeer, onNextStep, isNextStepDisabled = false, brewingStatus } = this.props;
        const steps = createProcessSteps(selectedBeer);
        const isIdle = brewingStatus === undefined || brewingStatus.process?.state === ProcessState.IDLE || steps.length === 0;
        const stepIndex = isIdle ? -1 : this.effectiveStepIndex;
        const activeStep = stepIndex >= 0 ? steps[stepIndex] : undefined;
        const upcomingSteps = stepIndex >= 0 ? steps.slice(stepIndex + 1) : [];
        const progressLabel = stepIndex >= 0 ? `${stepIndex + 1} / ${steps.length}` : '';

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

                {isIdle ? (
                    <div className="process-empty-state">Noch kein Brauvorgang gestartet.</div>
                ) : (
                    <>
                        <section className="current-process-step" aria-label="Aktueller Prozessschritt">
                            <div>
                                <h4>{this.getCurrentStepTitle(activeStep)}</h4>
                                <span className="current-step-badge">Aktiver Schritt</span>
                            </div>
                            {this.getCurrentStepMeta(activeStep)}
                        </section>

                        <section className="upcoming-process" aria-label="Weiterer Ablauf">
                            <h4>Weiterer Ablauf</h4>
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
                                title="Nächster Prozessschritt"
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

    let lastRastIndex = -1;

    // Rasten
    fermentation.forEach((step: FermentationSteps) => {
        const isRastName = /^Rast\s*\d+$/i.test(step.type);
        const isConfirmationHold = (step.executionMode ?? RestExecutionMode.TIMED) === RestExecutionMode.CONFIRMATION_HOLD;
        if (isRastName || isConfirmationHold) {
            processSteps.push({ name: `Aufheizen für ${step.type}`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.RAST, detail: {temperature: step.temperature} });
            processSteps.push({ name: step.type, entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.RAST, detail: {temperature: step.temperature, duration: step.time, confirmationRequired: isConfirmationHold} });
            controlStepIndex++;
            lastRastIndex = processSteps.length - 1;
        }
    });

    // Jod-Probe nach letzter Rast
    if (lastRastIndex !== -1) {
        processSteps.splice(lastRastIndex + 1, 0, { name: 'Jod Probe', entryType: ProcessListEntryType.DISPLAY, detail: {confirmationRequired: true} });
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
    processSteps.push({ name: 'Kochen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.COOKING, detail: {temperature: selectedBeer.cookingTemperatur, duration: selectedBeer.cookingTime * 60} });
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
