import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {FermentationAction, FermentationMeasurement} from '../../../model/Fermentation';
import {actionAmountLabel} from '../../../utils/fermentation';
import {COLOR_ACCENT, COLOR_CHART_BLUE, COLOR_CHART_GREEN, COLOR_CHART_YELLOW} from '../../../colors';

interface Props { measurements: FermentationMeasurement[]; actions?: FermentationAction[]; }
interface ChartPoint { timestamp: number; label: string; beerTemperature?: number; ambientTemperature?: number; plato?: number; }
interface ActionMarker {actionId: string; timestamp: number; label: string;}

const finite = (value?: number | null): value is number => typeof value === 'number' && Number.isFinite(value);

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

const FermentationMeasurementsChart: React.FC<Props> = props => {
  const data = buildFermentationChartData(props.measurements);
  if (data.length === 0) return <p>Keine Diagrammdaten vorhanden.</p>;
  return <div className="fermentation-history-chart" role="img" aria-label="Zeitlicher Verlauf von Temperatur und Plato">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top: 8, right: 8, bottom: 8, left: 0}}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
      <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} minTickGap={30} tickFormatter={value => new Intl.DateTimeFormat('de-DE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}).format(new Date(value))} />
      <YAxis yAxisId="temperature" unit=" °C" width={58} />
      <YAxis yAxisId="plato" orientation="right" unit=" °P" width={52} />
      <Tooltip /><Legend />
      {buildFermentationActionMarkers(props.actions).map(marker => <ReferenceLine key={marker.actionId} x={marker.timestamp} stroke={COLOR_ACCENT} strokeDasharray="4 3" label={{value: marker.label, fill: COLOR_ACCENT, position: 'insideTopRight'}} />)}
      <Line yAxisId="temperature" type="monotone" dataKey="beerTemperature" name="Biertemperatur" stroke={COLOR_CHART_GREEN || COLOR_ACCENT} connectNulls dot={false} />
      <Line yAxisId="temperature" type="monotone" dataKey="ambientTemperature" name="Außentemperatur" stroke={COLOR_CHART_BLUE} connectNulls dot={false} />
      <Line yAxisId="plato" type="monotone" dataKey="plato" name="Plato" stroke={COLOR_CHART_YELLOW} connectNulls dot={false} />
    </LineChart></ResponsiveContainer>
  </div>;
};
export default FermentationMeasurementsChart;
