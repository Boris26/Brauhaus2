/* eslint-disable testing-library/no-node-access, testing-library/no-container -- These assertions verify SVG geometry and stable dial nodes. */
import React from 'react';
import {render, screen} from '@testing-library/react';
import Gauge from './Gauge';

const waterProps = {showAreas: false, value: 25.4, targetValue: 30, height: 220, offset: 0, minValue: 0, maxValue: 70, label: 'Liter'};
const temperatureProps = {...waterProps, showAreas: true, value: 52.3, targetValue: 52, offset: 1, maxValue: 100, label: '°C'};

describe('Gauge', () => {
    it('renders the first measured value with one German decimal place and the correct unit', () => {
        render(<Gauge {...waterProps} />);
        expect(screen.getByRole('img', {name: 'Wassermenge: 25,4 L'})).toHaveTextContent('25,4 L');
        expect(screen.getByText('L')).toBeInTheDocument();
        expect(screen.queryByText('°C')).not.toBeInTheDocument();
    });

    it('keeps the dial mounted while updating the value, needle, and measured-water arc', () => {
        const {container, rerender} = render(<Gauge {...waterProps} value={0} />);
        const dial = screen.getByRole('img');
        const needle = container.querySelector('.gauge__needle');
        const initialAngle = needle?.getAttribute('transform');
        expect(container.querySelector('.gauge__areas path')).not.toBeInTheDocument();

        rerender(<Gauge {...waterProps} />);
        expect(screen.getByRole('img', {name: 'Wassermenge: 25,4 L'})).toBe(dial);
        expect(container.querySelector('.gauge__needle')).toBe(needle);
        expect(needle?.getAttribute('transform')).not.toBe(initialAngle);
        expect(container.querySelector('.gauge__areas path')).toBeInTheDocument();
    });

    it('bounds the pointer to the 0–70 scale while preserving a real measurement above it', () => {
        const {container} = render(<Gauge {...waterProps} value={72.4} />);
        expect(screen.getByRole('img', {name: 'Wassermenge: 72,4 L'})).toBeInTheDocument();
        expect(container.querySelector('.gauge__needle')).toHaveAttribute('transform', 'rotate(135 110 110)');
        expect(container.querySelector('.gauge__scale')).toHaveTextContent('70');
    });

    it('retains the 0–100 temperature scale and immediately updates its target areas', () => {
        const {container, rerender} = render(<Gauge {...temperatureProps} />);
        const dial = screen.getByRole('img', {name: 'Temperatur: 52,3 °C'});
        const areas = container.querySelector('.gauge__areas');
        const originalAreas = areas?.innerHTML;
        expect(container.querySelector('.gauge__scale')).toHaveTextContent('100');
        expect(areas?.children).toHaveLength(3);

        rerender(<Gauge {...temperatureProps} targetValue={65} />);
        expect(screen.getByRole('img')).toBe(dial);
        expect(areas?.innerHTML).not.toBe(originalAreas);
    });

    it.each([null, NaN, Infinity])('shows an unknown measurement (%s) without a zero-reading needle', value => {
        const {container, rerender} = render(<Gauge {...temperatureProps} value={value} />);
        const dial = screen.getByRole('img', {name: 'Temperatur: -- °C'});
        expect(container.querySelector('.gauge__needle')).not.toBeInTheDocument();

        rerender(<Gauge {...temperatureProps} value={0} />);
        expect(screen.getByRole('img', {name: 'Temperatur: 0,0 °C'})).toBe(dial);
        expect(container.querySelector('.gauge__needle')).toBeInTheDocument();
    });

    it('has independent dial fills when two gauges render together', () => {
        const {container} = render(<><Gauge {...waterProps} /><Gauge {...temperatureProps} /></>);
        const ids = Array.from(container.querySelectorAll('defs [id]'), element => element.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('restores the bands when a target arrives and clears them when the target is removed', () => {
        const {container, rerender} = render(<Gauge showAreas={true} value={65} targetValue={0} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        expect(container.querySelectorAll('.gauge__areas path')).toHaveLength(0);

        rerender(<Gauge showAreas={true} value={65} targetValue={65} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        expect(container.querySelectorAll('.gauge__areas path')).toHaveLength(3);

        rerender(<Gauge showAreas={true} value={65} targetValue={0} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        expect(container.querySelectorAll('.gauge__areas path')).toHaveLength(0);
    });
});
