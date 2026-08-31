import React from 'react';
import {render, screen} from '@testing-library/react';
import {AgitatorIntervalProgress, clampIntervalProgress} from './AgitatorIntervalProgress';

describe('AgitatorIntervalProgress', () => {
    it.each([[-5, 0], [42, 42], [140, 100]])('clamps %p to %p', (value, expected) => {
        expect(clampIntervalProgress(value)).toBe(expected);
    });

    it('renders one accessible determinate value and a decorative track', () => {
        render(<AgitatorIntervalProgress active={true} paused={false} progress={37} />);
        const progressbars = screen.getAllByRole('progressbar');
        expect(progressbars).toHaveLength(1);
        expect(progressbars[0]).toHaveAttribute('aria-valuenow', '37');
    });

    it.each([
        ['inactive', false, false],
        ['paused', true, true],
    ])('does not present running progress when %s', (_name, active, paused) => {
        const {container} = render(<AgitatorIntervalProgress active={active} paused={paused} progress={61} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
        expect(container.querySelector('.agitatorIntervalProgress')).toHaveClass('is-inactive');
    });
});
