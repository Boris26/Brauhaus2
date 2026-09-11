import React from 'react';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {BubbleActivity} from '../../../model/Fermentation';
import {COLOR_CHART_BLUE} from '../../../colors';

export interface BubbleActivityChartPoint {
  timestamp: number;
  bubblesPerMinute: number;
  bubbleCount: number;
  windowSeconds: number;
}

const localDateTime = (value: number): string => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

export const buildBubbleActivityChartData = (activity: BubbleActivity[]): BubbleActivityChartPoint[] => activity
  .filter(value => Number.isFinite(Date.parse(value.windowEndedAt)) && Number.isFinite(value.bubbleCount) && Number.isFinite(value.windowSeconds) && value.windowSeconds > 0)
  .map(value => ({
    timestamp: Date.parse(value.windowEndedAt),
    bubblesPerMinute: value.bubbleCount * 60 / value.windowSeconds,
    bubbleCount: value.bubbleCount,
    windowSeconds: value.windowSeconds,
  }))
  .sort((left, right) => left.timestamp - right.timestamp);

export class BubbleActivityChart extends React.PureComponent<{activity: BubbleActivity[]}> {
  render() {
    const data = buildBubbleActivityChartData(this.props.activity);
    return <div className="fermentation-bubble-chart" role="img" aria-label="Zeitlicher Verlauf der Gäraktivität in Blubbs pro Minute">
      <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top: 8, right: 12, bottom: 8, left: 4}}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} minTickGap={30} tickFormatter={localDateTime} />
        <YAxis width={72} label={{value: 'Blubbs/min', angle: -90, position: 'insideLeft'}} allowDecimals />
        <Tooltip labelFormatter={value => localDateTime(Number(value))} formatter={(value, _name, item) => [
          `${Number(value).toLocaleString('de-DE', {maximumFractionDigits: 2})} Blubbs/min · ${item.payload.bubbleCount.toLocaleString('de-DE')} Blubbs in ${item.payload.windowSeconds.toLocaleString('de-DE')} s`,
          'Gäraktivität',
        ]} />
        <Line dataKey="bubblesPerMinute" name="Gäraktivität" type="linear" stroke={COLOR_CHART_BLUE} strokeWidth={2} dot={false} activeDot={{r: 4}} connectNulls isAnimationActive={false} />
      </LineChart></ResponsiveContainer>
    </div>;
  }
}

export default BubbleActivityChart;
