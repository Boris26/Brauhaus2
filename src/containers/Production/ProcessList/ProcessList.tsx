import React from "react";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './ProcessList.css';
import {Beer, FermentationSteps} from "../../../model/Beer";
import {RestExecutionMode} from "../../../enums/eRestExecutionMode";
import {ProcessMode, ProcessPhase} from "../../../model/brewingStatus.types";

export enum ProcessListEntryType {
    HEATING = "HEATING",
    PROCESS = "PROCESS",
    DISPLAY = "DISPLAY"
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
}

export interface ProcessListProps {
    selectedBeer: Beer;
    currentStepIndex: number; // 1-based PI-control currentStep.index
    currentStep?: ProcessListCurrentStep;
    onNextStep?: () => void;
    isNextStepDisabled?: boolean;
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

    render() {
        const { selectedBeer, onNextStep, isNextStepDisabled = false } = this.props;
        const steps = createProcessSteps(selectedBeer);
        const stepIndex = this.effectiveStepIndex;

        return (
            <div className="process-list">
                <h3 className="process-title">Process</h3>

                <SimpleBar
                    className="process-list-scroll"
                    scrollableNodeProps={{ ref: this.simpleBarRef }}
                >
                    <ul>
                        {steps.map((step, idx) => (
                            <li
                                key={step.name + idx}
                                ref={idx === stepIndex ? this.activeStepRef : undefined}
                                className={
                                    "process-step" + (idx === stepIndex ? " active" : "")
                                }
                            >
                                <span className="step-number">{idx + 1}.</span> {step.name}
                            </li>
                        ))}
                    </ul>
                </SimpleBar>

                {/* regulärer Next-Button aus Parent/Redux */}
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
        processSteps.push({ name: `Aufheizen für Einmaischen -> ${einmaischen.temperature}°C`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_IN });
        processSteps.push({ name: 'Einmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_IN });
        controlStepIndex++;
    }

    let lastRastIndex = -1;

    // Rasten
    fermentation.forEach((step: FermentationSteps) => {
        const isRastName = /^Rast\s*\d+$/i.test(step.type);
        const isConfirmationHold = (step.executionMode ?? RestExecutionMode.TIMED) === RestExecutionMode.CONFIRMATION_HOLD;
        if (isRastName || isConfirmationHold) {
            processSteps.push({ name: `Aufheizen für ${step.type} -> ${step.temperature}°C`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.RAST });
            processSteps.push({ name: step.type, entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.RAST });
            controlStepIndex++;
            lastRastIndex = processSteps.length - 1;
        }
    });

    // Jod-Probe nach letzter Rast
    if (lastRastIndex !== -1) {
        processSteps.splice(lastRastIndex + 1, 0, { name: 'Jod Probe', entryType: ProcessListEntryType.DISPLAY });
    }

    // Abmaischen
    const abmaischen = fermentation.find(step => step.type === 'Abmaischen');
    if (abmaischen) {
        processSteps.push({ name: `Aufheizen für Abmaischen -> ${abmaischen.temperature}°C`, entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.MASHING_OUT });
        processSteps.push({ name: 'Abmaischen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.MASHING_OUT });
        controlStepIndex++;
    }

    // Kochen
    processSteps.push({ name: 'Aufheizen auf Kochen', entryType: ProcessListEntryType.HEATING, controlStepIndex, phase: ProcessPhase.COOKING });
    processSteps.push({ name: 'Kochen', entryType: ProcessListEntryType.PROCESS, controlStepIndex, phase: ProcessPhase.COOKING });
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
