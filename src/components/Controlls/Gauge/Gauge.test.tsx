import React from 'react';
import {render} from '@testing-library/react';
import Gauge from './Gauge';

const chartMock = jest.fn(() => <div data-testid="chart" />);

jest.mock('react-google-charts', () => ({
    Chart: (props: any) => chartMock(props),
}));

describe('Gauge value formatting', () => {
    beforeEach(() => {
        chartMock.mockClear();
    });

    it('formats liter values with exactly one German decimal place for display', () => {
        render(<Gauge showAreas={false} value={2.04} targetValue={10} height={200} offset={0.5} minValue={0} maxValue={70} label="Liter" />);

        expect(chartMock).toHaveBeenCalledWith(expect.objectContaining({
            data: [
                ['Label', 'Value'],
                ['Liter', {v: 2.04, f: '2,0'}],
            ],
        }));
    });

    it('keeps non-liter gauges numeric so existing chart behavior remains unchanged', () => {
        render(<Gauge showAreas={true} value={64.44} targetValue={65} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);

        expect(chartMock).toHaveBeenCalledWith(expect.objectContaining({
            data: [
                ['Label', 'Value'],
                ['°C', 64.44],
            ],
        }));
    });
});
