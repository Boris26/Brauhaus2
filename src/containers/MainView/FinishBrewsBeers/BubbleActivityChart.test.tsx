import {render, screen} from '@testing-library/react';
import {BubbleActivityChart, buildBubbleActivityChartData} from './BubbleActivityChart';

jest.mock('recharts', () => {
  const React = require('react');
  const Container = ({children}: {children?: React.ReactNode}) => <div>{children}</div>;
  return {
    ResponsiveContainer: Container, LineChart: Container, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
    Line: (props: Record<string, unknown>) => <div data-testid="bubble-activity-line" data-type={String(props.type)} data-dot={JSON.stringify(props.dot)} data-connect-nulls={String(props.connectNulls)} data-animation={String(props.isAnimationActive)} />,
  };
});

const activity: any[] = [
  {deviceId: 'new', sequence: 3, bubbleCount: 7, windowSeconds: 60, windowEndedAt: '2026-09-11T10:04:00Z'},
  {deviceId: 'old', sequence: 1, bubbleCount: 8, windowSeconds: 60, windowEndedAt: '2026-09-11T10:00:00Z'},
  {deviceId: 'old', sequence: 2, bubbleCount: 0, windowSeconds: 60, windowEndedAt: '2026-09-11T10:01:00Z'},
  {deviceId: 'bad', sequence: 4, bubbleCount: 4, windowSeconds: 0, windowEndedAt: '2026-09-11T10:05:00Z'},
];

describe('bubble activity chart', () => {
  it('normalizes windows, preserves zero and chronological gaps, and combines devices', () => {
    const data = buildBubbleActivityChartData(activity);
    expect(data.filter(point => point.bubblesPerMinute !== null).map(point => [point.timestamp, point.bubblesPerMinute])).toEqual([
      [Date.parse('2026-09-11T10:00:00Z'), 8], [Date.parse('2026-09-11T10:01:00Z'), 0], [Date.parse('2026-09-11T10:04:00Z'), 7],
    ]);
    expect(data.some(point => point.timestamp === Date.parse('2026-09-11T10:02:00Z'))).toBe(false);
    expect(data.filter(point => point.bubblesPerMinute === null)).toHaveLength(1);
    expect(data[0]).not.toHaveProperty('sequence'); expect(data[0]).not.toHaveProperty('deviceId');
  });
  it('normalizes a 30 second window and exposes only a technical label', () => {
    expect(buildBubbleActivityChartData([{...activity[0], bubbleCount: 4, windowSeconds: 30}])[0].bubblesPerMinute).toBe(8);
    render(<BubbleActivityChart activity={activity} />);
    expect(screen.getByRole('img', {name: /Gäraktivität in Blubbs pro Minute/})).toBeInTheDocument();
    expect(screen.getByTestId('bubble-activity-line')).toHaveAttribute('data-type', 'linear');
    expect(screen.getByTestId('bubble-activity-line')).toHaveAttribute('data-connect-nulls', 'false');
    expect(screen.getByTestId('bubble-activity-line')).toHaveAttribute('data-animation', 'false');
    expect(screen.queryByText(/starke|schwache|beendet|verlangsamt|Device|sequence/i)).not.toBeInTheDocument();
  });
});
