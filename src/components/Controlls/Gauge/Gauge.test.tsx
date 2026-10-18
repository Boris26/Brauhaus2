import React from 'react';
import {render} from '@testing-library/react';
import Gauge from './Gauge';

const mockChart = jest.fn((_props: any) => <div data-testid="chart" />);

jest.mock('react-google-charts', () => ({
    Chart: (props: any) => mockChart(props),
}));

describe('Gauge value formatting', () => {
    beforeEach(() => {
        mockChart.mockClear();
    });

    it('formats liter values with exactly one German decimal place for display', () => {
        render(<Gauge showAreas={false} value={2.04} targetValue={10} height={200} offset={0.5} minValue={0} maxValue={70} label="Liter" />);

        expect(mockChart).toHaveBeenCalledWith(expect.objectContaining({
            data: [
                ['Label', 'Value'],
                ['Liter', {v: 2.04, f: '2,0'}],
            ],
        }));
    });

    it('keeps non-liter gauges numeric so existing chart behavior remains unchanged', () => {
        render(<Gauge showAreas={true} value={64.44} targetValue={65} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);

        expect(mockChart).toHaveBeenCalledWith(expect.objectContaining({
            data: [
                ['Label', 'Value'],
                ['°C', 64.44],
            ],
        }));
    });

    it('shows low temperatures as yellow and high temperatures as red', () => {
        render(<Gauge showAreas={true} value={65} targetValue={65} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);

        const lastChartProps = mockChart.mock.calls[mockChart.mock.calls.length - 1][0];

        expect(lastChartProps.options).toEqual(expect.objectContaining({
            yellowFrom: 0,
            yellowTo: 64,
            greenFrom: 64,
            greenTo: 66,
            redFrom: 66,
            redTo: 100,
        }));
    });

    it('restores the bands when a target arrives and clears them when the target is removed', () => {
        const {rerender} = render(<Gauge showAreas={true} value={65} targetValue={0} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        const options = () => mockChart.mock.calls[mockChart.mock.calls.length - 1][0].options;
        const noAreas = {yellowFrom: 0, yellowTo: 0, greenFrom: 0, greenTo: 0, redFrom: 0, redTo: 0};
        expect(options()).toEqual(expect.objectContaining(noAreas));

        rerender(<Gauge showAreas={true} value={65} targetValue={65} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        expect(options()).toEqual(expect.objectContaining({yellowFrom: 0, yellowTo: 64, greenFrom: 64, greenTo: 66, redFrom: 66, redTo: 100}));

        rerender(<Gauge showAreas={true} value={65} targetValue={0} height={200} offset={1} minValue={0} maxValue={100} label="°C" />);
        expect(options()).toEqual(expect.objectContaining(noAreas));
    });
});
