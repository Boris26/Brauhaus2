import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {SettingsNumberField} from './SettingsNumberField';

describe('SettingsNumberField', () => {
    it('supports direct decimal keyboard input without applying the button step as a restriction', () => {
        const onChange = jest.fn();
        render(<SettingsNumberField value="2.5" label="Temperaturanstieg" unit="°C" step={0.1} onChange={onChange}/>);

        fireEvent.change(screen.getByLabelText('Temperaturanstieg'), {target: {value: '2.75'}});

        expect(onChange).toHaveBeenCalledWith('2.75');
        expect(screen.getByText('°C')).toBeInTheDocument();
    });

    it('increments and decrements decimals with the configured step', () => {
        const onChange = jest.fn();
        const view = render(<SettingsNumberField value="0.5" label="Startverzögerung" step={0.1} onChange={onChange}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Startverzögerung erhöhen'}));
        expect(onChange).toHaveBeenLastCalledWith('0.6');

        view.rerender(<SettingsNumberField value="0.5" label="Startverzögerung" step={0.1} onChange={onChange}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Startverzögerung verringern'}));
        expect(onChange).toHaveBeenLastCalledWith('0.4');
    });

    it('disables editing and both step buttons together', () => {
        render(<SettingsNumberField value="120" label="Nachlaufzeit" step={1} disabled onChange={jest.fn()}/>);

        expect(screen.getByLabelText('Nachlaufzeit')).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Nachlaufzeit verringern'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Nachlaufzeit erhöhen'})).toBeDisabled();
    });
});
