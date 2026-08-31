import React, { useCallback, useEffect, useRef } from 'react';
import './QuantityPicker.css';

interface QuantityPickerProps {
    value?: number;
    onChange: (value: number) => void;
    label: string;
    labelPosition?: 'left' | 'right' | 'above' | 'below';
    max: number;
    min: number;
    isDisabled: boolean;
}

type RepeatDirection = 'increment' | 'decrement';

const REPEAT_DELAY_MS = 200;

const QuantityPicker = ({
    value,
    onChange,
    label,
    labelPosition = 'above',
    max,
    min,
    isDisabled,
}: QuantityPickerProps) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const repeatDirectionRef = useRef<RepeatDirection | null>(null);
    const mountedRef = useRef(true);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);

    valueRef.current = value;
    onChangeRef.current = onChange;

    const stopRepeating = useCallback(() => {
        repeatDirectionRef.current = null;
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const changeAndSchedule = useCallback((direction: RepeatDirection) => {
        if (!mountedRef.current || repeatDirectionRef.current !== direction) return;

        const currentValue = valueRef.current;
        if (currentValue === undefined) {
            stopRepeating();
            return;
        }

        const boundedValue = Math.min(max, Math.max(min, currentValue));
        const nextValue = direction === 'increment'
            ? Math.min(max, boundedValue + 1)
            : Math.max(min, boundedValue - 1);

        if (nextValue === boundedValue) {
            stopRepeating();
            return;
        }

        onChangeRef.current(nextValue);
        timerRef.current = setTimeout(() => changeAndSchedule(direction), REPEAT_DELAY_MS);
    }, [max, min, stopRepeating]);

    const startRepeating = useCallback((direction: RepeatDirection) => {
        if (isDisabled) return;
        stopRepeating();
        repeatDirectionRef.current = direction;
        changeAndSchedule(direction);
    }, [changeAndSchedule, isDisabled, stopRepeating]);

    useEffect(() => {
        if (isDisabled) stopRepeating();
    }, [isDisabled, stopRepeating]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopRepeating();
        };
    }, [stopRepeating]);

    const labelElement = <div className="quantity-picker-label">{label}</div>;
    const displayedValue = value === undefined ? '–' : Math.min(max, Math.max(min, value));
    const stopHandlers = {
        onPointerUp: stopRepeating,
        onPointerCancel: stopRepeating,
        onPointerLeave: stopRepeating,
        onBlur: stopRepeating,
    };

    return (
        <div className={`quantity-picker-container label-${labelPosition}`}>
            {labelPosition === 'above' && labelElement}
            <div className="quantity-picker-content">
                {labelPosition === 'left' && labelElement}
                <button
                    className="decrement-btn"
                    onPointerDown={() => startRepeating('decrement')}
                    {...stopHandlers}
                    disabled={isDisabled}
                    aria-label={`${label} verringern`}
                >
                    -
                </button>
                <span className={`quantity-picker-input ${isDisabled ? 'quantity-picker-input-disabled' : ''}`} aria-label={label}>{displayedValue}</span>
                <button
                    className="increment-btn"
                    onPointerDown={() => startRepeating('increment')}
                    {...stopHandlers}
                    disabled={isDisabled}
                    aria-label={`${label} erhöhen`}
                >
                    +
                </button>
                {labelPosition === 'right' && labelElement}
            </div>
            {labelPosition === 'below' && labelElement}
        </div>
    );
};

export default QuantityPicker;
