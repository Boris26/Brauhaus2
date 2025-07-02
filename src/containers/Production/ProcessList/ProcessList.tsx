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
                    // SimpleBar scrollt auf das innere Scroll-Element, nicht das Wrapper-Div
                    const scrollElement = simpleBarScroll.querySelector('.simplebar-content-wrapper');
                    if (scrollElement) {
                        const containerRect = scrollElement.getBoundingClientRect();
                        const nodeRect = activeNode.getBoundingClientRect();
                        if (nodeRect.top < containerRect.top) {
                            scrollElement.scrollTop += nodeRect.top - containerRect.top;
                        } else if (nodeRect.bottom > containerRect.bottom) {
                            scrollElement.scrollTop += nodeRect.bottom - containerRect.bottom;
                        }
                    }
                }
            }, 0);
        }
    }

    render() {
        const { steps, currentStepIndex, onNextStep } = this.props;
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
