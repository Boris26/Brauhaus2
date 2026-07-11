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

export interface CurrentProcessStep {
    index?: number;
    phase?: ProcessPhase;
    mode?: ProcessMode;
    name?: string;
}

export interface ProcessStep {
    name: string;
    /**
     * 1-based index reported by the PI control in brewingStatus.currentStep.index.
     * Heating and process rows for the same recipe step can share this index;
     * entryType/phase then decide which UI row is active for the current mode.
     */
    controlStepIndex?: number;
    phase?: ProcessPhase;
    entryType: ProcessListEntryType;
}

export interface ProcessListProps {
    selectedBeer: Beer;
    currentStep: CurrentProcessStep;
    onNextStep?: () => void;
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
        return this.state.testStepIndex ?? getActiveProcessStepIndex(createProcessSteps(this.props.selectedBeer), this.props.currentStep);
    }

    componentDidUpdate(prevProps: ProcessListProps, prevState: ProcessListState) {
        const prevIndex = prevState.testStepIndex ?? getActiveProcessStepIndex(createProcessSteps(prevProps.selectedBeer), prevProps.currentStep);
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
            const baseIndex = prev.testStepIndex ?? getActiveProcessStepIndex(steps, this.props.currentStep);
            const next = baseIndex + 1;
            return { testStepIndex: next >= steps.length ? 0 : next };
        });
    };

    render() {
        const { selectedBeer, onNextStep } = this.props;
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
                                title="Nächster Prozessschritt"
                            >
                                Nächster Schritt
                            </button>
                        </div>
                    </>
                )}

                {/* Test-Button zum Durchsteppen */}
                <div className="test-step-btn-container">
                    <button
                        className="testStepBtn"
                        onClick={this.stepTestForward}
                        title="Test: Schritt weiterschalten (nur UI)"
                    >
                        Test: Step++
                    </button>
                </div>
            </div>
        );
    }
}


// -------------------------------------------------------
// PROCESS STEPS GENERATION
// -------------------------------------------------------

export function createProcessSteps(selectedBeer: Beer): ProcessStep[] {
    let processSteps: ProcessStep[] = [];
    if (!selectedBeer || !Array.isArray(selectedBeer.fermentation)) {
        return processSteps;
    }

    const fermentation = selectedBeer.fermentation;
    let controlStepIndex = 1;

    // Einmaischen
    const einmaischen = fermentation.find(step => step.type === 'Einmaischen');
    if (einmaischen) {
        processSteps.push({ name: `Aufheizen für Einmaischen -> ${einmaischen.temperature}°C`, entryType: ProcessListEntryType.HEATING });
        processSteps.push({ name: 'Einmaischen', controlStepIndex: controlStepIndex++, phase: ProcessPhase.MASHING_IN, entryType: ProcessListEntryType.PROCESS });
    }

    let lastRastIndex = -1;

    // Rasten
    fermentation.forEach((step: FermentationSteps) => {
        const isRastName = /^Rast\s*\d+$/i.test(step.type);
        const isConfirmationHold = (step.executionMode ?? RestExecutionMode.TIMED) === RestExecutionMode.CONFIRMATION_HOLD;
        if (isRastName || isConfirmationHold) {
            processSteps.push({ name: `Aufheizen für ${step.type} -> ${step.temperature}°C`, controlStepIndex, phase: ProcessPhase.RAST, entryType: ProcessListEntryType.HEATING });
            processSteps.push({ name: step.type, controlStepIndex: controlStepIndex++, phase: ProcessPhase.RAST, entryType: ProcessListEntryType.PROCESS });
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
        processSteps.push({ name: `Aufheizen für Abmaischen -> ${abmaischen.temperature}°C`, entryType: ProcessListEntryType.HEATING });
        processSteps.push({ name: 'Abmaischen', controlStepIndex: controlStepIndex++, phase: ProcessPhase.MASHING_OUT, entryType: ProcessListEntryType.PROCESS });
    }

    // Kochen
    processSteps.push({ name: 'Aufheizen auf Kochen', entryType: ProcessListEntryType.HEATING });
    processSteps.push({ name: 'Kochen', controlStepIndex: controlStepIndex++, phase: ProcessPhase.COOKING, entryType: ProcessListEntryType.PROCESS });

    return processSteps;
}

export function getActiveProcessStepIndex(processSteps: ProcessStep[], currentStep: CurrentProcessStep): number {
    const currentControlStepIndex = currentStep.index;
    if (typeof currentControlStepIndex !== 'number') {
        return 0;
    }

    const expectedEntryType =
        currentStep.phase === ProcessPhase.RAST && currentStep.mode === ProcessMode.HEATING
            ? ProcessListEntryType.HEATING
            : ProcessListEntryType.PROCESS;

    const activeIndex = processSteps.findIndex(step =>
        step.controlStepIndex === currentControlStepIndex &&
        step.entryType === expectedEntryType &&
        (!step.phase || !currentStep.phase || step.phase === currentStep.phase)
    );

    if (activeIndex >= 0) {
        return activeIndex;
    }

    const fallbackIndex = processSteps.findIndex(step =>
        step.controlStepIndex === currentControlStepIndex &&
        step.entryType === ProcessListEntryType.PROCESS
    );

    return fallbackIndex >= 0 ? fallbackIndex : 0;
}
