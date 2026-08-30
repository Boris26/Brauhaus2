import React from 'react';
import {render, screen} from '@testing-library/react';
import {ProductionTemperatureTimeline} from './ProductionTemperatureTimeline';

jest.mock('recharts', () => {
    const React = require('react');
    const Container = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;

    return {
        ResponsiveContainer: Container,
        LineChart: Container,
        CartesianGrid: () => null,
        XAxis: () => null,
        YAxis: () => null,
        Tooltip: () => null,
        ReferenceArea: () => null,
        ReferenceLine: (props: Record<string, unknown>) => (
            <div
                data-testid="reference-line"
                data-stroke={String(props.stroke)}
                data-stroke-width={String(props.strokeWidth)}
                data-label={JSON.stringify(props.label)}
            />
        ),
        Line: (props: Record<string, unknown>) => (
            <div
                data-testid={`temperature-line-${props.dataKey}`}
                data-type={String(props.type)}
                data-stroke={String(props.stroke)}
                data-stroke-width={String(props.strokeWidth)}
                data-stroke-opacity={props.strokeOpacity === undefined ? '' : String(props.strokeOpacity)}
                data-dot={String(props.dot)}
            />
        )
    };
});

describe('ProductionTemperatureTimeline', () => {
    it('renders distinct measurement and target curves without permanent dots', () => {
        render(
            <ProductionTemperatureTimeline
                measurements={[{elapsedTime: 1, Temperature: 62, TargetTemperature: 63}]}
                fallbackTemperature={0}
            />
        );

        const actualLine = screen.getByTestId('temperature-line-actualTemperature');
        const targetLine = screen.getByTestId('temperature-line-targetTemperature');

        expect(actualLine).toHaveAttribute('data-type', 'linear');
        expect(actualLine).toHaveAttribute('data-stroke', 'var(--color-warning)');
        expect(actualLine).toHaveAttribute('data-stroke-width', '2');
        expect(actualLine).toHaveAttribute('data-dot', 'false');
        expect(targetLine).toHaveAttribute('data-type', 'stepAfter');
        expect(targetLine).toHaveAttribute('data-stroke', 'var(--color-success)');
        expect(targetLine).toHaveAttribute('data-stroke-width', '1.5');
        expect(targetLine).toHaveAttribute('data-stroke-opacity', '0.8');
        expect(targetLine).toHaveAttribute('data-dot', 'false');
    });

    it('shows the compact color-coded legend and preserves the now marker', () => {
        render(
            <ProductionTemperatureTimeline
                measurements={[{elapsedTime: 1, Temperature: 62, TargetTemperature: 63}]}
                fallbackTemperature={0}
            />
        );

        expect(screen.getByText('Isttemperatur')).toHaveClass('temperatureTimeline__legendActual');
        expect(screen.getByText('Zieltemperatur')).toHaveClass('temperatureTimeline__legendTarget');
        expect(screen.queryByText('Isttemperatur, Zieltemperatur und Prozessschritte über den gesamten Brautag.')).not.toBeInTheDocument();

        const nowMarker = screen.getByTestId('reference-line');
        expect(nowMarker).toHaveAttribute('data-stroke', 'var(--color-accent)');
        expect(nowMarker).toHaveAttribute('data-stroke-width', '2');
        expect(nowMarker.getAttribute('data-label')).toContain('Jetzt');
    });
});
