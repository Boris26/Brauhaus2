import React from "react";
import "./ProcessList.css";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

export interface ProcessStep {
    name: string;
}

interface ProcessListProps {
    steps: ProcessStep[];
    currentStepIndex: number; // 0-based
    onNextStep?: () => void;
}

export class ProcessList extends React.Component<ProcessListProps> {
    render() {
        const { steps, currentStepIndex, onNextStep } = this.props;
        return (
            <div className="process-list">
                <h3 className="process-title">Process</h3>
                <SimpleBar className="process-list-scroll">
                    <ul>
                        {steps.map((step, idx) => (
                            <li
                                key={step.name + idx}
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
