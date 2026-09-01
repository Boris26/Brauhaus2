import React, {useId} from 'react';
import '../../components/Controlls/QuantityPicker/QuantityPicker.css';

interface SettingsNumberFieldProps {
    value: string;
    label: string;
    onChange: (value: string) => void;
    step: number;
    unit?: string;
    description?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    invalid?: boolean;
}

const decimalPlaces = (step: number): number => {
    const text = String(step);
    return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0;
};

export const SettingsNumberField = ({
    value,
    label,
    onChange,
    step,
    unit,
    description,
    disabled = false,
    min,
    max,
    invalid = false,
}: SettingsNumberFieldProps) => {
    const id = useId();
    const numericValue = Number(value);
    const canStep = value.trim() !== '' && Number.isFinite(numericValue);

    const changeBy = (direction: -1 | 1) => {
        if (disabled || !canStep) return;
        let next = numericValue + direction * step;
        if (min !== undefined) next = Math.max(min, next);
        if (max !== undefined) next = Math.min(max, next);
        const precision = decimalPlaces(step);
        onChange(precision > 0 ? String(Number(next.toFixed(precision))) : String(next));
    };

    return <div className="quantity-picker-container settings-number-field">
        <label className="quantity-picker-label" htmlFor={id}>{label}</label>
        <div className="settings-number-field-control">
            <div className={`quantity-picker-content quantity-picker-editable ${disabled ? 'quantity-picker-content-disabled' : ''} ${invalid ? 'quantity-picker-content-error' : ''}`}>
                <button className="decrement-btn" type="button" aria-label={`${label} verringern`} disabled={disabled || !canStep || (min !== undefined && numericValue <= min)} onClick={() => changeBy(-1)}>-</button>
                <input id={id} className="quantity-picker-native-input" aria-label={label} aria-invalid={invalid} type="number" step="any" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}/>
                <button className="increment-btn" type="button" aria-label={`${label} erhöhen`} disabled={disabled || !canStep || (max !== undefined && numericValue >= max)} onClick={() => changeBy(1)}>+</button>
            </div>
            {unit && <span className="intervalTimeUnit">{unit}</span>}
        </div>
        {description && <span className="setting-description">{description}</span>}
    </div>;
};
