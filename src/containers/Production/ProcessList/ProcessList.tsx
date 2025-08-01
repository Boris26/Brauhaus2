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

export class ProcessList extends React.Component<ProcessListProps> {
    activeStepRef: React.RefObject<HTMLLIElement>;
    simpleBarRef: React.RefObject<HTMLDivElement>;

    constructor(props: ProcessListProps) {
        super(props);
        this.activeStepRef = React.createRef();
        this.simpleBarRef = React.createRef();
    }

    componentDidUpdate(prevProps: ProcessListProps) {
        if (
            prevProps.currentStepIndex !== this.props.currentStepIndex &&
            this.activeStepRef.current &&
            this.simpleBarRef.current
        ) {
            setTimeout(() => {
                const simpleBarScroll = this.simpleBarRef.current;
                const activeNode = this.activeStepRef.current;
                if (simpleBarScroll && activeNode) {
                    const scrollElement = simpleBarScroll.querySelector('.simplebar-content-wrapper');
                    if (scrollElement) {
                        const containerRect = scrollElement.getBoundingClientRect();
                        const nodeRect = activeNode.getBoundingClientRect();
                        // Prüfen, ob der Schritt bereits sichtbar ist
                        if (nodeRect.bottom > containerRect.bottom || nodeRect.top < containerRect.top) {
                            // Immer so scrollen, dass der Schritt am unteren Rand sichtbar ist
                            scrollElement.scrollTop += nodeRect.bottom - containerRect.bottom;
                        }
                    }
                }
            }, 0);
        }
    }

    render() {
        const { selectedBeer, currentStepIndex, onNextStep } = this.props;
        const steps = createProcessSteps(selectedBeer);
        return (
            <div className="process-list">
                <h3 className="process-title">Process</h3>
                <SimpleBar className="process-list-scroll" scrollableNodeProps={{ ref: this.simpleBarRef }}>
                    <ul>
                        {steps.map((step, idx) => (
                            <li
                                key={step.name + idx}
                                ref={idx === currentStepIndex ? this.activeStepRef : undefined}
                                className={
                                    "process-step" + (idx === currentStepIndex ? " active" : "")
                                }
                            >
                                <span className="step-number">{idx + 1}.</span> {step.name}
                            </li>
                        ))}
                    </ul>
                </SimpleBar>
                {onNextStep && (
                    <>
                        <hr className="next-step-separator" />
                        <div className="next-step-btn-container">
                            <button className="nextStepBtn" onClick={onNextStep} title="Nächster Prozessschritt">
                                Nächster Schritt
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }
}


export function createProcessSteps(selectedBeer: Beer): ProcessStep[] {
    let processSteps: ProcessStep[] = [];
    if (!selectedBeer || !Array.isArray(selectedBeer.fermentation)) {
        return processSteps;
    }
    const fermentation = selectedBeer.fermentation;
    // Einmaischen finden
    const einmaischen = fermentation.find((step: any) => step.type === 'Einmaischen');
    if (einmaischen) {
        const temperature = einmaischen.temperature
        processSteps.push({ name: `Aufheizen für Einmaischen -> ${temperature}°C`});
        processSteps.push({ name: 'Einmaischen' });
    }
    // Nur Rast-Schritte (Rast1, Rast 2, ...) berücksichtigen
    let lastRastIndex = -1;
    fermentation.forEach((step: FermentationSteps, idx: number) => {
        const temperature = step.temperature
        const type = step.type
        if (/^Rast\s*\d+$/i.test(step.type)) {
            processSteps.push({ name: `Aufheizen für ${type} -> ${temperature}°C`});
            processSteps.push({ name: type });
            lastRastIndex = processSteps.length - 1;
        }
    });
    // Nach der letzten Rast Jod Probe einfügen
    if (lastRastIndex !== -1) {
        processSteps.splice(lastRastIndex + 1, 0, { name: 'Jod Probe' });
    }
    // Abmaischen finden und vor Kochen einfügen
    const abmaischen = fermentation.find((step: any) => step.type === 'Abmaischen');
    if (abmaischen) {
        const temperature = abmaischen.temperature
        processSteps.push({ name: `Aufheizen für Abmaischen -> ${temperature}°C`});
        processSteps.push({ name: 'Abmaischen' });
    }
    // Am Ende "Aufheizen auf Kochen" und "Kochen" hinzufügen
    processSteps.push({ name: 'Aufheizen auf Kochen' });
    processSteps.push({ name: 'Kochen' });
    return processSteps;
}
