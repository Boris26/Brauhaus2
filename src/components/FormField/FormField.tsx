import React from 'react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    multiline?: boolean;
    rows?: number;
    wrapperClassName?: string;
}

/** A labelled native control using the application's shared form-control styles. */
const FormField: React.FC<FormFieldProps> = ({label, error, multiline = false, rows, wrapperClassName = '', id, className = '', ...controlProps}) => {
    const generatedId = React.useId();
    const controlId = id ?? generatedId;
    const errorId = error ? `${controlId}-error` : undefined;
    const wrapperClasses = ['brauhaus-form-field', wrapperClassName].filter(Boolean).join(' ');
    const controlClasses = ['brauhaus-form-control', error ? 'brauhaus-form-control--error' : '', className].filter(Boolean).join(' ');

    return <label className={wrapperClasses} htmlFor={controlId}>
        <span className="brauhaus-form-field__label">{label}</span>
        {multiline
            ? <textarea {...controlProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>} id={controlId} className={controlClasses} rows={rows} aria-invalid={Boolean(error)} aria-describedby={errorId}/>
            : <input {...controlProps} id={controlId} className={controlClasses} aria-invalid={Boolean(error)} aria-describedby={errorId}/>
        }
        {error && <span id={errorId} className="brauhaus-form-field__error">{error}</span>}
    </label>;
};

export default FormField;
