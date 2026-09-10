import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {FermentationMeasurement} from '../../../model/Fermentation';
import {COLOR_ACCENT, COLOR_CHART_BLUE, COLOR_CHART_GREEN, COLOR_CHART_YELLOW} from '../../../colors';

interface Props { measurements: FermentationMeasurement[]; }
interface ChartPoint { timestamp: number; label: string; beerTemperature?: number; ambientTemperature?: number; plato?: number; }

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

const FermentationMeasurementsChart: React.FC<Props> = props => {
  const data = buildFermentationChartData(props.measurements);
  if (data.length === 0) return <p>Keine Diagrammdaten vorhanden.</p>;
  return <div className="fermentation-history-chart" role="img" aria-label="Zeitlicher Verlauf von Temperatur und Plato">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top: 8, right: 8, bottom: 8, left: 0}}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
      <XAxis dataKey="label" minTickGap={30} />
      <YAxis yAxisId="temperature" unit=" °C" width={58} />
      <YAxis yAxisId="plato" orientation="right" unit=" °P" width={52} />
      <Tooltip /><Legend />
      <Line yAxisId="temperature" type="monotone" dataKey="beerTemperature" name="Biertemperatur" stroke={COLOR_CHART_GREEN || COLOR_ACCENT} connectNulls dot={false} />
      <Line yAxisId="temperature" type="monotone" dataKey="ambientTemperature" name="Außentemperatur" stroke={COLOR_CHART_BLUE} connectNulls dot={false} />
      <Line yAxisId="plato" type="monotone" dataKey="plato" name="Plato" stroke={COLOR_CHART_YELLOW} connectNulls dot={false} />
    </LineChart></ResponsiveContainer>
  </div>;
};
export default FermentationMeasurementsChart;
