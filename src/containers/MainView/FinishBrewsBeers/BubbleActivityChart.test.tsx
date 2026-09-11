import {render, screen} from '@testing-library/react';
import {BubbleActivityChart, buildBubbleActivityChartData, formatBubbleActivityTooltip} from './BubbleActivityChart';

jest.mock('recharts', () => {
  const React = require('react');
  const Container = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;
  return {
    ResponsiveContainer: Container, LineChart: Container, CartesianGrid: () => null, Legend: () => <div data-testid="chart-legend" />, Tooltip: () => null,
    XAxis: (props: Record<string, unknown>) => <div data-testid="chart-x-axis" data-key={String(props.dataKey)} />,
    YAxis: (props: Record<string, unknown>) => <div data-testid="chart-y-axis" data-id={String(props.yAxisId)} data-orientation={String(props.orientation)} />,
    Line: (props: Record<string, unknown>) => <div data-testid="bubble-activity-line" data-key={String(props.dataKey)} data-axis={String(props.yAxisId)} data-name={String(props.name)} data-type={String(props.type)} data-dot={JSON.stringify(props.dot)} data-connect-nulls={String(props.connectNulls)} data-animation={String(props.isAnimationActive)} />,
  };
});

const activity: any[] = [
  {deviceId: 'new', sequence: 3, bubbleCount: 7, windowSeconds: 60, averagePressureDeltaPa: -0.75, windowEndedAt: '2026-09-11T10:04:00Z'},
  {deviceId: 'old', sequence: 1, bubbleCount: 8, windowSeconds: 60, averagePressureDeltaPa: 1.42, windowEndedAt: '2026-09-11T10:00:00Z'},
  {deviceId: 'old', sequence: 2, bubbleCount: 0, windowSeconds: 60, averagePressureDeltaPa: 0, windowEndedAt: '2026-09-11T10:01:00Z'},
  {deviceId: 'bad', sequence: 4, bubbleCount: 4, windowSeconds: 0, windowEndedAt: '2026-09-11T10:05:00Z'},
];

describe('bubble activity chart', () => {
  it('normalizes windows, preserves zero and chronological gaps, and combines devices', () => {
    const data = buildBubbleActivityChartData(activity);
    expect(data.filter(point => point.bubblesPerMinute !== null).map(point => [point.timestamp, point.bubblesPerMinute])).toEqual([
      [Date.parse('2026-09-11T10:00:00Z'), 8], [Date.parse('2026-09-11T10:01:00Z'), 0], [Date.parse('2026-09-11T10:04:00Z'), 7],
    ]);
    expect(data.map(point => point.averagePressureDeltaPa)).toEqual([1.42, 0, null, -0.75]);
    expect(data).toHaveLength(4);
    expect(data.filter(point => point.bubblesPerMinute !== null).every(point => point.bubbleCount !== undefined && point.windowSeconds !== undefined)).toBe(true);
    expect(data[0]).not.toHaveProperty('sequence'); expect(data[0]).not.toHaveProperty('deviceId');
  });
  it('normalizes a 30 second window and exposes only a technical label', () => {
    expect(buildBubbleActivityChartData([{...activity[0], bubbleCount: 4, windowSeconds: 30}])[0].bubblesPerMinute).toBe(8);
    render(<BubbleActivityChart activity={activity} />);
    expect(screen.getByRole('img', {name: /Differenzdrucks in Pascal/})).toBeInTheDocument();
    const lines = screen.getAllByTestId('bubble-activity-line');
    expect(lines[0]).toHaveAttribute('data-key', 'bubblesPerMinute'); expect(lines[0]).toHaveAttribute('data-axis', 'bubbles');
    expect(lines[1]).toHaveAttribute('data-key', 'averagePressureDeltaPa'); expect(lines[1]).toHaveAttribute('data-axis', 'pressure');
    lines.forEach(line => { expect(line).toHaveAttribute('data-type', 'linear'); expect(line).toHaveAttribute('data-dot', 'false'); expect(line).toHaveAttribute('data-connect-nulls', 'true'); expect(line).toHaveAttribute('data-animation', 'false'); });
    expect(screen.getAllByTestId('chart-y-axis')).toHaveLength(2);
    expect(screen.getAllByTestId('chart-y-axis')[1]).toHaveAttribute('data-orientation', 'right');
    expect(screen.getByTestId('chart-x-axis')).toHaveAttribute('data-key', 'timestamp');
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    expect(screen.queryByText(/starke|schwache|beendet|verlangsamt|Device|sequence/i)).not.toBeInTheDocument();
  });
  it('keeps a legacy pressure value absent instead of inventing zero', () => {
    const data = buildBubbleActivityChartData([{...activity[0], averagePressureDeltaPa: null}, {...activity[1], averagePressureDeltaPa: undefined}]);
    expect(data.filter(point => point.bubblesPerMinute !== null).map(point => point.averagePressureDeltaPa)).toEqual([null, null]);
  });
  it('formats both technical tooltip series without inventing a missing pressure entry', () => {
    const payload = {payload: {bubbleCount: 8, windowSeconds: 60}};
    expect(formatBubbleActivityTooltip(8, 'Blubbs/min', payload)).toEqual(['8 Blubbs/min · 8 Blubbs in 60 s', 'Blubbs/min']);
    expect(formatBubbleActivityTooltip(1.42, 'Differenzdruck', payload)).toEqual(['1,42 Pa', 'Differenzdruck']);
    expect(buildBubbleActivityChartData([{...activity[0], averagePressureDeltaPa: null}])[0].averagePressureDeltaPa).toBeNull();
  });
});
