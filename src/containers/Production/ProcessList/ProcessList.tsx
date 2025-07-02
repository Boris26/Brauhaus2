import React from "react";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import './ProcessList.css';

export interface ProcessStep {
    name: string;
}

interface ProcessListProps {
    steps: ProcessStep[];
    currentStepIndex: number; // 0-based
    onNextStep?: () => void;
}

export class ProcessList extends React.Component<ProcessListProps> {
    activeStepRef: React.RefObject<HTMLLIElement>;
    simpleBarRef: React.RefObject<any>;

    constructor(props: ProcessListProps) {
        super(props);
        this.activeStepRef = React.createRef();
        this.simpleBarRef = React.createRef();
    }

    componentDidUpdate(prevProps: ProcessListProps) {
        if (prevProps.currentStepIndex !== this.props.currentStepIndex && this.activeStepRef.current && this.simpleBarRef.current) {
            // Scrollen, so dass das aktive Element sichtbar ist
            const node = this.activeStepRef.current;
            const simpleBarNode = this.simpleBarRef.current.getScrollElement();
            const nodeTop = node.offsetTop;
            const nodeBottom = node.offsetTop + node.offsetHeight;
            const viewTop = simpleBarNode.scrollTop;
            const viewBottom = viewTop + simpleBarNode.clientHeight;
            if (nodeTop < viewTop) {
                simpleBarNode.scrollTop = nodeTop;
            } else if (nodeBottom > viewBottom) {
                simpleBarNode.scrollTop = nodeBottom - simpleBarNode.clientHeight;
            }
        }
    }

    render() {
        const { steps, currentStepIndex, onNextStep } = this.props;
        return (
            <div className="process-list">
                <h3 className="process-title">Process</h3>
                <SimpleBar className="process-list-scroll" ref={this.simpleBarRef}>
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
