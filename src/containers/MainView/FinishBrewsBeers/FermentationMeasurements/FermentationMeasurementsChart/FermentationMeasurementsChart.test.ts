import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import FermentationMeasurementsChart, {buildFermentationActionMarkers, buildFermentationChartData, filterFermentationMeasurementsByRange} from './FermentationMeasurementsChart';

jest.mock('recharts', () => {
  const React = require('react');
  const Container = ({children}: {children?: React.ReactNode}) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: Container,
    LineChart: jest.fn(({children}: {children?: React.ReactNode}) => React.createElement('div', null, children)),
    CartesianGrid: () => null,
    Legend: () => null,
    Line: () => null,
    ReferenceLine: () => null,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

describe('buildFermentationChartData', () => {
  it('renders manual and sensor values from the unified measurement history', () => {
    const data = buildFermentationChartData(
      [
        {id: 's', finishedBeerId: 'b', measuredAt: '2026-09-03T10:00:00Z', beerTemperatureC: 18.1, ambientTemperatureC: 16.2, source: 'SENSOR'},
        {id: 'm', finishedBeerId: 'b', measuredAt: '2026-09-04T10:00:00Z', beerTemperatureC: 18.4, plato: 4.2, source: 'MANUAL'},
        {id: 'invalid', finishedBeerId: 'b', measuredAt: 'invalid', beerTemperatureC: 99, source: 'SENSOR'},
      ],
    );

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({beerTemperature: 18.1, ambientTemperature: 16.2});
    expect(data[1]).toMatchObject({beerTemperature: 18.4, plato: 4.2});
  });
  it('marks only completed actions with a concrete backend timestamp', () => {
    const markers = buildFermentationActionMarkers([
      {actionId: 'done', status: 'COMPLETED', completedAt: '2026-09-11T10:22:00Z', sourceType: 'DRY_HOP', name: 'Mosaic', amount: 50, unit: 'GRAMS'},
      {actionId: 'future', status: 'PENDING', completedAt: '2026-09-12T10:22:00Z', sourceType: 'DRY_HOP'},
      {actionId: 'missing', status: 'COMPLETED', sourceType: 'DRY_HOP'},
    ] as any);
    expect(markers).toEqual([{actionId: 'done', timestamp: Date.parse('2026-09-11T10:22:00Z'), label: 'Mosaic 50 g'}]);
  });

  it('filters ranges relative to the newest available measurement', () => {
    const measurements: any[] = [
      {id: 'old', measuredAt: '2026-09-01T00:00:00Z'},
      {id: 'recent', measuredAt: '2026-09-07T20:00:00Z'},
      {id: 'latest', measuredAt: '2026-09-08T00:00:00Z'},
    ];

    expect(filterFermentationMeasurementsByRange(measurements, '6h').map(value => value.id)).toEqual(['recent', 'latest']);
    expect(filterFermentationMeasurementsByRange(measurements, '24h').map(value => value.id)).toEqual(['recent', 'latest']);
    expect(filterFermentationMeasurementsByRange(measurements, '7d').map(value => value.id)).toEqual(['old', 'recent', 'latest']);
    expect(filterFermentationMeasurementsByRange(measurements, 'all')).toBe(measurements);
  });
});

describe('FermentationMeasurementsChart refresh rendering', () => {
  const firstMeasurement: any = {id: 'm1', finishedBeerId: 'b', measuredAt: '2026-09-03T10:00:00Z', beerTemperatureC: 18.1, source: 'SENSOR'};

  it('skips an identical-props refresh and renders a newly supplied measurement', () => {
    const measurements = [firstMeasurement];
    const actions: any[] = [];
    const LineChart = require('recharts').LineChart as jest.Mock;
    LineChart.mockClear();
    const {rerender} = render(React.createElement(FermentationMeasurementsChart, {measurements, actions}));
    expect(LineChart).toHaveBeenCalledTimes(1);
    expect(LineChart.mock.calls[0][0].data).toHaveLength(1);

    rerender(React.createElement(FermentationMeasurementsChart, {measurements, actions}));
    expect(LineChart).toHaveBeenCalledTimes(1);

    const updatedMeasurements = [...measurements, {...firstMeasurement, id: 'm2', measuredAt: '2026-09-03T10:05:00Z', beerTemperatureC: 18.2}];
    rerender(React.createElement(FermentationMeasurementsChart, {measurements: updatedMeasurements, actions}));
    expect(LineChart).toHaveBeenCalledTimes(2);
    expect(LineChart.mock.calls[1][0].data).toHaveLength(2);
  });

  it('offers the same compact time ranges as the fermentation activity chart', () => {
    const measurements: any[] = [
      {id: 'old', finishedBeerId: 'b', measuredAt: '2026-09-01T00:00:00Z', beerTemperatureC: 17.8, source: 'SENSOR'},
      {id: 'latest', finishedBeerId: 'b', measuredAt: '2026-09-08T00:00:00Z', beerTemperatureC: 18.1, source: 'SENSOR'},
    ];
    const LineChart = require('recharts').LineChart as jest.Mock;
    LineChart.mockClear();

    render(React.createElement(FermentationMeasurementsChart, {measurements, actions: []}));
    expect(screen.getByRole('group', {name: 'Zeitraum des Temperaturverlaufs'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '24 h'})).toHaveAttribute('aria-pressed', 'true');
    expect(LineChart.mock.calls.at(-1)[0].data).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', {name: 'Alles'}));
    expect(screen.getByRole('button', {name: 'Alles'})).toHaveAttribute('aria-pressed', 'true');
    expect(LineChart.mock.calls.at(-1)[0].data).toHaveLength(2);
  });

  it('uses the supplied initial range without overwriting a later user selection', () => {
    const measurements: any[] = [
      {id: 'old', finishedBeerId: 'b', measuredAt: '2026-09-01T00:00:00Z', beerTemperatureC: 17.8, source: 'SENSOR'},
      {id: 'latest', finishedBeerId: 'b', measuredAt: '2026-09-08T00:00:00Z', beerTemperatureC: 18.1, source: 'SENSOR'},
    ];
    const {rerender} = render(React.createElement(FermentationMeasurementsChart, {measurements, initialRange: '6h'}));

    expect(screen.getByRole('button', {name: '6 h'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'Alles'}));
    rerender(React.createElement(FermentationMeasurementsChart, {measurements: [...measurements, {...measurements[1], id: 'new'}], initialRange: '6h'}));

    expect(screen.getByRole('button', {name: 'Alles'})).toHaveAttribute('aria-pressed', 'true');
  });
});
