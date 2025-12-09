import React from "react";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './ProcessList.css';
import {Beer, FermentationSteps} from "../../../model/Beer";

export interface ProcessStep {
    name: string;
}

interface ProcessListProps {
    selectedBeer: Beer;
    currentStepIndex: number; // 0-based
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

    // Welcher Index soll wirklich verwendet werden? (Test oder echter)
    get effectiveStepIndex(): number {
        return this.state.testStepIndex ?? this.props.currentStepIndex;
    }

    componentDidUpdate(prevProps: ProcessListProps, prevState: ProcessListState) {
        const prevIndex = prevState.testStepIndex ?? prevProps.currentStepIndex;
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
            const baseIndex = prev.testStepIndex ?? this.props.currentStepIndex;
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

    // Einmaischen
    const einmaischen = fermentation.find(step => step.type === 'Einmaischen');
    if (einmaischen) {
        processSteps.push({ name: `Aufheizen für Einmaischen -> ${einmaischen.temperature}°C` });
        processSteps.push({ name: 'Einmaischen' });
    }

    let lastRastIndex = -1;

    // Rasten
    fermentation.forEach((step: FermentationSteps) => {
        if (/^Rast\s*\d+$/i.test(step.type)) {
            processSteps.push({ name: `Aufheizen für ${step.type} -> ${step.temperature}°C` });
            processSteps.push({ name: step.type });
            lastRastIndex = processSteps.length - 1;
        }
    });

    // Jod-Probe nach letzter Rast
    if (lastRastIndex !== -1) {
        processSteps.splice(lastRastIndex + 1, 0, { name: 'Jod Probe' });
    }

    // Abmaischen
    const abmaischen = fermentation.find(step => step.type === 'Abmaischen');
    if (abmaischen) {
        processSteps.push({ name: `Aufheizen für Abmaischen -> ${abmaischen.temperature}°C` });
        processSteps.push({ name: 'Abmaischen' });
    }

    // Kochen
    processSteps.push({ name: 'Aufheizen auf Kochen' });
    processSteps.push({ name: 'Kochen' });

    return processSteps;
}
