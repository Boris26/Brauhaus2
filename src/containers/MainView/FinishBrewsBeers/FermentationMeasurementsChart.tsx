import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {FermentationAction, FermentationMeasurement} from '../../../model/Fermentation';
import {actionAmountLabel} from '../../../utils/fermentation';
import {COLOR_ACCENT, COLOR_CHART_BLUE, COLOR_CHART_GREEN, COLOR_CHART_YELLOW} from '../../../colors';
import './FermentationChartRange.css';

interface Props { measurements: FermentationMeasurement[]; actions?: FermentationAction[]; }
interface ChartPoint { timestamp: number; label: string; beerTemperature?: number; ambientTemperature?: number; plato?: number; }
interface ActionMarker {actionId: string; timestamp: number; label: string;}
type FermentationChartRange = '6h' | '24h' | '7d' | 'all';

const CHART_RANGES: [FermentationChartRange, string][] = [['6h', '6 h'], ['24h', '24 h'], ['7d', '7 Tage'], ['all', 'Alles']];
const RANGE_MS: Record<Exclude<FermentationChartRange, 'all'>, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const finite = (value?: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

export const filterFermentationMeasurementsByRange = (measurements: FermentationMeasurement[], range: FermentationChartRange): FermentationMeasurement[] => {
  if (range === 'all') return measurements;
  const timestamps = measurements.map(measurement => Date.parse(measurement.measuredAt)).filter(Number.isFinite);
  if (timestamps.length === 0) return [];
  const end = Math.max(...timestamps);
  const start = end - RANGE_MS[range];
  return measurements.filter(measurement => {
    const timestamp = Date.parse(measurement.measuredAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
  });
};

export const buildFermentationChartData = (measurements: FermentationMeasurement[]): ChartPoint[] => {
  const points = new Map<number, ChartPoint>();
  const pointFor = (measuredAt: string): ChartPoint | undefined => {
    const timestamp = Date.parse(measuredAt);
    if (!Number.isFinite(timestamp)) return undefined;
    const current = points.get(timestamp) ?? {timestamp, label: new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}).format(new Date(timestamp))};
    points.set(timestamp, current); return current;
  };
  measurements.forEach(measurement => { const point = pointFor(measurement.measuredAt); if (!point) return; if (finite(measurement.beerTemperatureC)) point.beerTemperature = measurement.beerTemperatureC; if (finite(measurement.ambientTemperatureC)) point.ambientTemperature = measurement.ambientTemperatureC; if (finite(measurement.plato)) point.plato = measurement.plato; });
  return Array.from(points.values()).sort((a, b) => a.timestamp - b.timestamp);
};

export const buildFermentationActionMarkers = (actions: FermentationAction[] = []): ActionMarker[] => actions
  .filter(action => action.status === 'COMPLETED' && action.completedAt && Number.isFinite(Date.parse(action.completedAt)))
  .map(action => ({actionId: action.actionId, timestamp: Date.parse(action.completedAt as string), label: `${action.name || 'Zugabe'} ${actionAmountLabel(action.amount, action.unit) || ''}`.trim()}));

const FermentationMeasurementsChart: React.FC<Props> = React.memo(props => {
  const [range, setRange] = React.useState<FermentationChartRange>('24h');
  const visibleMeasurements = React.useMemo(() => filterFermentationMeasurementsByRange(props.measurements, range), [props.measurements, range]);
  const data = React.useMemo(() => buildFermentationChartData(visibleMeasurements), [visibleMeasurements]);
  const actionMarkers = React.useMemo(() => buildFermentationActionMarkers(props.actions), [props.actions]);

  return <>
    <div className="fermentation-range-selector fermentation-temperature-range-selector" role="group" aria-label="Zeitraum des Temperaturverlaufs">
      {CHART_RANGES.map(([value, label]) => <button key={value} type="button" className={range === value ? 'is-selected' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}
    </div>
    {data.length === 0
      ? <p>Keine Diagrammdaten vorhanden.</p>
      : <div className="fermentation-history-chart" style={{height: 160, minWidth: 0, display: 'grid', overflow: 'hidden'}} role="img" aria-label="Zeitlicher Verlauf von Temperatur und Plato">
        <ResponsiveContainer
          width="100%"
          height={160}
          minWidth={0}
          debounce={50}
        ><LineChart data={data} margin={{top: 8, right: 8, bottom: 8, left: 0}}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} minTickGap={30} tickFormatter={value => new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}).format(new Date(value))} />
          <YAxis yAxisId="temperature" unit=" °C" width={58} />
          <YAxis yAxisId="plato" orientation="right" unit=" °P" width={52} />
          <Tooltip /><Legend />
          {actionMarkers.map(marker => <ReferenceLine key={marker.actionId} x={marker.timestamp} stroke={COLOR_ACCENT} strokeDasharray="4 3" label={{value: marker.label, fill: COLOR_ACCENT, position: 'insideTopRight'}} />)}
          <Line yAxisId="temperature" type="monotone" dataKey="beerTemperature" name="Biertemperatur" stroke={COLOR_CHART_GREEN || COLOR_ACCENT} connectNulls dot={false} isAnimationActive={false} />
          <Line yAxisId="temperature" type="monotone" dataKey="ambientTemperature" name="Außentemperatur" stroke={COLOR_CHART_BLUE} connectNulls dot={false} isAnimationActive={false} />
          <Line yAxisId="plato" type="monotone" dataKey="plato" name="Plato" stroke={COLOR_CHART_YELLOW} connectNulls dot={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div>}
  </>;
});
export default FermentationMeasurementsChart;
