import React, { Component } from 'react';
import './QuantityPicker.css'; // Passe den Dateipfad entsprechend an

interface QuantityPickerProps {
    initialValue: number;
    onChange: (value: number) => void;
    label: string;
    labelPosition?: 'left' | 'right' | 'above' | 'below';
    max: number;
    min: number;
    isDisabled: boolean;
}

interface QuantityPickerState {
    quantity: number;
    isIncrementing: boolean;
    isDecrementing: boolean;
}

class QuantityPicker extends Component<QuantityPickerProps, QuantityPickerState> {
    private incrementTimer: NodeJS.Timeout | null = null;
    private decrementTimer: NodeJS.Timeout | null = null;

    constructor(props: QuantityPickerProps) {
        super(props);
        if(props.initialValue > props.max)
        {
            this.state = {
                quantity: props.max,
                isIncrementing: false,
                isDecrementing: false,
            };
        }
        else if(props.initialValue < props.min)
        {
            this.state = {
                quantity: props.min,
                isIncrementing: false,
                isDecrementing: false,
            };
        }
        else
        {
            this.state = {
                quantity: props.initialValue,
                isIncrementing: false,
                isDecrementing: false,
            };
        }


    }

    handleIncrementMouseDown = () => {
        this.setState({ isIncrementing: true });
        this.incrementQuantity();
    };

    handleIncrementMouseUp = () => {
        this.setState({ isIncrementing: false });
        this.clearIncrementTimer();
    };

    handleDecrementMouseDown = () => {
        this.setState({ isDecrementing: true });
        this.decrementQuantity();
    };

    handleDecrementMouseUp = () => {
        this.setState({ isDecrementing: false });
        this.clearDecrementTimer();
    };

    incrementQuantity = () => {
        if(this.state.quantity < this.props.max)
        {
            this.props.onChange(this.state.quantity + 1);
            this.setState((prevState) => ({ quantity: prevState.quantity + 1 }));
            this.incrementTimer = setTimeout(this.incrementQuantity, 200);
        }

    };

    decrementQuantity = () => {
        if (this.state.quantity > this.props.min) {
            this.props.onChange(this.state.quantity - 1);
            this.setState((prevState) => ({ quantity: prevState.quantity - 1 }));
            this.decrementTimer = setTimeout(this.decrementQuantity, 200);
        }
    };

    clearIncrementTimer = () => {
        if (this.incrementTimer) {
            clearTimeout(this.incrementTimer);
            this.incrementTimer = null;
        }
    };

    clearDecrementTimer = () => {
        if (this.decrementTimer) {
            clearTimeout(this.decrementTimer);
            this.decrementTimer = null;
        }
    };

    render() {
        const { label, labelPosition = 'above' ,isDisabled} = this.props;

        const labelElement = <div className="quantity-picker-label">{label}</div>;

        return (
            <div className={`quantity-picker-container label-${labelPosition}`}>
                {labelPosition === 'above' && labelElement}
                <div className="quantity-picker-content">
                    {labelPosition === 'left' && labelElement}
                    <button
                        className={`decrement-btn`}
                        onMouseDown={this.handleDecrementMouseDown}
                        onMouseUp={this.handleDecrementMouseUp}
                        onMouseLeave={this.handleDecrementMouseUp}
                        disabled={isDisabled}
                    >
                        -
                    </button>
                    <span  className={`quantity-picker-input ${isDisabled ? 'quantity-picker-input-disabled' : ''}`} >{this.state.quantity}</span>
                    <button
                        className={"increment-btn"}
                        onMouseDown={this.handleIncrementMouseDown}
                        onMouseUp={this.handleIncrementMouseUp}
                        onMouseLeave={this.handleIncrementMouseUp}
                        disabled={isDisabled}
                    >
                        +
                    </button>
                    {labelPosition === 'right' && labelElement}
                </div>
                {labelPosition === 'below' && labelElement}
            </div>
        );
    }
}

export default QuantityPicker;
