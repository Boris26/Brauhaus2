import React, { Component } from 'react'
import {Basic, Donut, White} from 'react-dial-knob'
import {ToggleState} from "../../../enums/eToggleState";
import { SHADOW_KNOB_BLUE, SHADOW_KNOB_RED, SHADOW_KNOB_BLACK } from '../../../colors';

interface MyPageState {
    value: number;
    isButtonDown: boolean;
}
interface MyPageProps {
    min: number;
    max: number;
    onClick: () => void;
    onValueChange: (newValue: number) => void;
    isAktive: ToggleState;
    currentValue: number;
    label: string;
}


class MyKnob extends Component<MyPageProps,MyPageState> {
    constructor(props: MyPageProps) {
        super(props);
    }
    state: MyPageState = {
        value: 0,
        isButtonDown: false,
    };

    componentDidMount() {
        this.setState({ value: this.props.currentValue });
    }

    handleValueChange = (newValue: number) => {
        this.setState({ value: newValue });
        this.props.onValueChange(newValue);
    };


    handleMouseDown = () => {
        this.setState({ isButtonDown: true });
    };

    handleMouseUp = () => {
        this.setState({ isButtonDown: false });
    };

    render() {
        const { value,isButtonDown } = this.state;
        const { min, max, isAktive,label} = this.props;
        let knobStyle;

        if (isButtonDown) {
            knobStyle = { boxShadow: `0 0 10px 5px ${SHADOW_KNOB_BLUE}`, transform: 'translateY(2px)' };
        }
        else if (isAktive === ToggleState.ON)
        {
            knobStyle = { boxShadow: `0 0 10px 5px ${SHADOW_KNOB_RED}`};
        }
        else {
            knobStyle = { boxShadow: `0 0 10px 5px ${SHADOW_KNOB_BLACK}` };
        }
        return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <White
                        knobStyle={knobStyle}
                        diameter={160}
                        min={min}
                        max={max}
                        step={1}
                        value={value}
                        onValueChange={this.handleValueChange}
                        ariaLabelledBy={'my-label'}
                    >
                        <button
                            onMouseDown={this.handleMouseDown}
                            onMouseUp={this.handleMouseUp}
                            onClick={this.props.onClick}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20, // Setzen Sie den Wert auf die Hälfte der Breite, um einen runden Button zu erstellen
                                backgroundColor: 'transparent', // Transparente Hintergrundfarbe
                                border: 'none', // Entfernen Sie die Standard-Rahmenlinie
                                color: 'blue', // Textfarbe für den Button
                                fontSize: 16,
                                cursor: 'pointer',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2, // Der Button wird über den Knöpfen angezeigt, da der z-index höher ist
                            }}
                        >

                        </button>
                    </White>
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: 20, fontWeight: 'bold'}}>{label}</span>
                    </div>
                </div>


        );
    }
}

export default MyKnob;
