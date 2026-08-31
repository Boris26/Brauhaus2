import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import QuantityPicker from './QuantityPicker';

const renderPicker = (props: Partial<React.ComponentProps<typeof QuantityPicker>> = {}) => {
    const onChange = props.onChange ?? jest.fn();
    const result = render(<QuantityPicker value={5} min={1} max={10} label="Menge" isDisabled={false} onChange={onChange} {...props} />);
    return {...result, onChange};
};

describe('QuantityPicker', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it.each([
        ['increment', 'Menge erhöhen'],
        ['decrement', 'Menge verringern'],
    ])('stops %s auto-repeat when unmounted', (_direction, buttonName) => {
        const {onChange, unmount} = renderPicker();
        fireEvent.pointerDown(screen.getByRole('button', {name: buttonName}));
        expect(onChange).toHaveBeenCalledTimes(1);

        unmount();
        act(() => jest.advanceTimersByTime(1000));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('uses the latest parent value during auto-repeat', () => {
        const ControlledPicker = () => {
            const [value, setValue] = useState(2);
            return <QuantityPicker value={value} min={0} max={10} label="Menge" isDisabled={false} onChange={setValue} />;
        };
        render(<ControlledPicker />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Menge erhöhen'}));
        expect(screen.getByLabelText('Menge')).toHaveTextContent('3');
        act(() => jest.advanceTimersByTime(200));
        act(() => jest.advanceTimersByTime(200));
        expect(screen.getByLabelText('Menge')).toHaveTextContent('5');
        fireEvent.pointerUp(screen.getByRole('button', {name: 'Menge erhöhen'}));
    });

    it('does not jump back when the parent changes its value during repeat', () => {
        const onChange = jest.fn();
        const {rerender} = renderPicker({value: 2, onChange});
        const increment = screen.getByRole('button', {name: 'Menge erhöhen'});
        fireEvent.pointerDown(increment);
        expect(onChange).toHaveBeenLastCalledWith(3);

        rerender(<QuantityPicker value={8} min={1} max={10} label="Menge" isDisabled={false} onChange={onChange} />);
        act(() => jest.advanceTimersByTime(200));

        expect(onChange).toHaveBeenLastCalledWith(9);
        fireEvent.pointerCancel(increment);
    });

    it('handles quick clicks and stops on pointer leave', () => {
        const onChange = jest.fn();
        renderPicker({onChange});
        const increment = screen.getByRole('button', {name: 'Menge erhöhen'});
        fireEvent.pointerDown(increment);
        fireEvent.pointerUp(increment);
        act(() => jest.advanceTimersByTime(1000));
        expect(onChange).toHaveBeenCalledTimes(1);

        fireEvent.pointerDown(increment);
        fireEvent.pointerLeave(increment);
        act(() => jest.advanceTimersByTime(1000));
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('respects min and max boundaries', () => {
        const onChange = jest.fn();
        const {rerender} = renderPicker({value: 10, onChange});
        fireEvent.pointerDown(screen.getByRole('button', {name: 'Menge erhöhen'}));
        expect(onChange).not.toHaveBeenCalled();

        rerender(<QuantityPicker value={1} min={1} max={10} label="Menge" isDisabled={false} onChange={onChange} />);
        fireEvent.pointerDown(screen.getByRole('button', {name: 'Menge verringern'}));
        expect(onChange).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('does not react while disabled and stops a running repeat when disabled', () => {
        const onChange = jest.fn();
        const {rerender} = renderPicker({value: 5, onChange});
        const increment = screen.getByRole('button', {name: 'Menge erhöhen'});
        fireEvent.pointerDown(increment);
        expect(onChange).toHaveBeenCalledTimes(1);

        rerender(<QuantityPicker value={6} min={1} max={10} label="Menge" isDisabled={true} onChange={onChange} />);
        act(() => jest.advanceTimersByTime(1000));
        fireEvent.pointerDown(screen.getByRole('button', {name: 'Menge erhöhen'}));
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
