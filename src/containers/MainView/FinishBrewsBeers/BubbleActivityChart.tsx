import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {BubbleActivity} from '../../../model/Fermentation';
import {COLOR_ACCENT, COLOR_INFO} from '../../../colors';

export interface BubbleActivityChartPoint {
  timestamp: number;
  bubblesPerMinute: number | null;
  averagePressureDeltaPa: number | null;
  bubbleCount?: number;
  windowSeconds?: number;
}

type BubbleActivityMeasurementPoint = BubbleActivityChartPoint & {bubbleCount: number; windowSeconds: number};

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: 'var(--color-panel-contrast)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--border-radius-medium)',
  boxShadow: '0 8px 20px rgba(0, 0, 0, .28)',
  color: 'var(--color-text)',
  fontSize: '.78rem',
  padding: '6px 9px',
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontWeight: 700,
  marginBottom: 4,
};
const TOOLTIP_ITEM_STYLE: React.CSSProperties = {padding: '1px 0'};

const localDateTime = (value: number): string => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

const normalizedBubbleActivity = (activity: BubbleActivity[]): BubbleActivityMeasurementPoint[] => activity
  .filter(value => Number.isFinite(Date.parse(value.windowEndedAt)) && Number.isFinite(value.bubbleCount) && Number.isFinite(value.windowSeconds) && value.windowSeconds > 0)
  .map(value => ({
    timestamp: Date.parse(value.windowEndedAt),
    bubblesPerMinute: value.bubbleCount * 60 / value.windowSeconds,
    averagePressureDeltaPa: typeof value.averagePressureDeltaPa === 'number' && Number.isFinite(value.averagePressureDeltaPa) ? value.averagePressureDeltaPa : null,
    bubbleCount: value.bubbleCount,
    windowSeconds: value.windowSeconds,
  }))
  .sort((left, right) => left.timestamp - right.timestamp);

export const buildBubbleActivityChartData = (activity: BubbleActivity[]): BubbleActivityChartPoint[] => normalizedBubbleActivity(activity)
  .flatMap((point, index, points) => {
    const previous = points[index - 1];
    if (!previous || point.timestamp - previous.timestamp <= Math.max(previous.windowSeconds, point.windowSeconds) * 1000) return [point];

    return [{timestamp: previous.timestamp + (point.timestamp - previous.timestamp) / 2, bubblesPerMinute: null, averagePressureDeltaPa: null}, point];
  });

export const formatBubbleActivityTooltip = (value: unknown, name: unknown, item: any): [string, string] => {
  if (name === 'Differenzdruck') return [`${Number(value).toLocaleString('de-DE', {maximumFractionDigits: 2})} Pa`, 'Differenzdruck'];
  return [
    `${Number(value).toLocaleString('de-DE', {maximumFractionDigits: 2})} Blubbs/min${item.payload.bubbleCount !== undefined && item.payload.windowSeconds !== undefined ? ` · ${item.payload.bubbleCount.toLocaleString('de-DE')} Blubbs in ${item.payload.windowSeconds.toLocaleString('de-DE')} s` : ''}`,
    'Blubbs/min',
  ];
};

export class BubbleActivityChart extends React.PureComponent<{activity: BubbleActivity[]}> {
  render() {
    const data = buildBubbleActivityChartData(this.props.activity);
    return <div className="fermentation-bubble-chart" style={{height: 170, minWidth: 0, display: 'grid', overflow: 'hidden'}} role="img" aria-label="Zeitlicher Verlauf der Gäraktivität in Blubbs pro Minute und des Differenzdrucks in Pascal">
      <ResponsiveContainer
        width="100%"
        height={170}
        minWidth={0}
        debounce={50}
      ><LineChart data={data} margin={{top: 8, right: 12, bottom: 8, left: 4}}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} minTickGap={30} tickFormatter={localDateTime} />
        <YAxis yAxisId="bubbles" width={72} label={{value: 'Blubbs/min', angle: -90, position: 'insideLeft'}} allowDecimals />
        <YAxis yAxisId="pressure" orientation="right" width={72} label={{value: 'Differenzdruck (Pa)', angle: 90, position: 'insideRight'}} allowDecimals />
        <Tooltip
          labelFormatter={value => localDateTime(Number(value))}
          formatter={formatBubbleActivityTooltip}
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{stroke: 'var(--color-border-strong)', strokeDasharray: '3 3'}}
        />
        <Legend />
        <Line yAxisId="bubbles" dataKey="bubblesPerMinute" name="Blubbs/min" type="linear" stroke={COLOR_INFO} strokeWidth={2} dot={false} activeDot={{r: 4}} connectNulls isAnimationActive={false} />
        <Line yAxisId="pressure" dataKey="averagePressureDeltaPa" name="Differenzdruck" type="linear" stroke={COLOR_ACCENT} strokeWidth={2} dot={false} activeDot={{r: 4}} connectNulls isAnimationActive={false} />
      </LineChart></ResponsiveContainer>
    </div>;
  }
}

export default BubbleActivityChart;
