import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush } from 'recharts';

interface BrewProcessChartProps {
  groupedData: any;
}

class BrewProcessChart extends Component<BrewProcessChartProps> {
  // Hilfsfunktion: Daten für das Diagramm aufbereiten
  prepareChartData(groupedData: any) {
    const chartData: any[] = [];
    let globalElapsed = 0;
    let interpolatedPoints = 0;
    const MAX_INTERPOLATED_POINTS = 2000;
    const INTERPOLATION_STEP = 1; // Sekunden
    Object.entries(groupedData).forEach(([step, states]: [string, any]) => {
      let stepElapsed = globalElapsed;
      Object.entries(states).forEach(([state, points]) => {
        if (Array.isArray(points)) {
          for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const baseElapsed = stepElapsed + point.elapsedTime;
            chartData.push({
              step,
              state,
              elapsedTime: baseElapsed,
              Temperature: point.Temperature,
              TargetTemperature: point.TargetTemperature,
            });
            // Interpolation zwischen diesem und dem nächsten Punkt
            if (i < points.length - 1 && interpolatedPoints < MAX_INTERPOLATED_POINTS) {
              const next = points[i + 1];
              const nextElapsed = stepElapsed + next.elapsedTime;
              const diff = nextElapsed - baseElapsed;
              if (diff > INTERPOLATION_STEP) {
                for (let t = INTERPOLATION_STEP; t < diff; t += INTERPOLATION_STEP) {
                  if (interpolatedPoints >= MAX_INTERPOLATED_POINTS) break;
                  const ratio = t / diff;
                  chartData.push({
                    step,
                    state,
                    elapsedTime: baseElapsed + t,
                    Temperature: point.Temperature + (next.Temperature - point.Temperature) * ratio,
                    TargetTemperature: point.TargetTemperature + (next.TargetTemperature - point.TargetTemperature) * ratio,
                  });
                  interpolatedPoints++;
                }
              }
            }
          }
          // Schrittzeit erhöhen um die letzte elapsedTime dieses States
          if (points.length > 0) {
            const lastElapsed = points[points.length - 1].elapsedTime;
            stepElapsed += lastElapsed;
          }
        }
      });
      globalElapsed = stepElapsed;
    });
    return chartData;
  }

  // Hilfsfunktion: State-String in Capitalized-Form, nur Buchstaben, Zeichen werden durch Leerzeichen ersetzt
  capitalizeState(state: string) {
    if (!state) return '';
    const s = state.startsWith('WAITING_') ? 'Waiting' : state;
    // Ersetze alle Nicht-Buchstaben durch Leerzeichen
    const withSpaces = s.replace(/[^a-zA-ZäöüÄÖÜß]+/g, ' ');
    // Entferne doppelte Leerzeichen und trimme
    const cleaned = withSpaces.replace(/ +/g, ' ').trim();
    // Jeden Wortanfang groß, Rest klein
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  // Hilfsfunktion: Sekunden in h:mm:ss
  formatSecondsToHMS(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v, i) => (i === 0 ? v : v.toString().padStart(2, '0')))
      .join(':');
  }

  // Hilfsfunktion: Berechnet die Dauer zwischen zwei Zeitpunkten und formatiert sie
  formatDuration(startSeconds: number, endSeconds: number) {
    const durationSec = endSeconds - startSeconds;
    return this.formatSecondsToHMS(durationSec);
  }

  // Hilfsfunktion: Tick-Werte für die X-Achse alle 1 Minute generieren
  generateTicksEveryMinute(data: any[]) {
    const ticks: number[] = [];
    if (data.length === 0) return ticks;
    const minTime = Math.floor(data[0].elapsedTime / 60) * 60;
    const maxTime = Math.ceil(data[data.length - 1].elapsedTime / 60) * 60;
    for (let t = minTime; t <= maxTime; t += 60) {
      ticks.push(t);
    }
    return ticks;
  }

  render() {
    const { groupedData } = this.props;
    if (!groupedData) return <div>Keine Diagrammdaten vorhanden.</div>;
    const data = this.prepareChartData(groupedData);
    const minElapsed = data.length > 0 ? data[0].elapsedTime : 0;
    const maxElapsed = data.length > 0 ? data[data.length - 1].elapsedTime : 100;

    // Prozesswechsel für ReferenceLines und ReferenceAreas bestimmen
    const processChanges: { step: string; elapsedTime: number }[] = [];
    const seenSteps = new Set<string>();
    data.forEach(d => {
      if (!seenSteps.has(d.step)) {
        processChanges.push({ step: d.step, elapsedTime: d.elapsedTime });
        seenSteps.add(d.step);
      }
    });
    // Bereiche für ReferenceArea berechnen
    const processAreas = processChanges.map((pc, idx) => {
      const start = pc.elapsedTime;
      const end = processChanges[idx + 1] ? processChanges[idx + 1].elapsedTime : data[data.length - 1]?.elapsedTime;
      return { step: pc.step, start, end };
    });
    const areaColors = ['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0', '#d1c4e9', '#fff9c4'];

    // Bereiche für jeden State (Prozessabschnitt) berechnen
    const stateAreas: { key: string; step: string; state: string; start: number; end: number }[] = [];
    let lastEnd = 0;
    Object.entries(groupedData).forEach(([step, states]: [string, any]) => {
      let stepElapsed = lastEnd;
      Object.entries(states).forEach(([state, points]) => {
        if (Array.isArray(points) && points.length > 0) {
          const start = stepElapsed;
          const end = stepElapsed + points[points.length - 1].elapsedTime;
          stateAreas.push({ key: `${step}_${state}_${start}`, step, state, start, end });
          stepElapsed = end;
        }
      });
      lastEnd = stepElapsed;
    });
    // Kontrastreiche Farben, abwechselnd hell/dunkel
    const stateColors = ['rgba(255,255,255,0.0)', 'rgba(44,62,80,0.10)'];

    // Feste Farben für States
    const stateColorMap: Record<string, string> = {
      HEATING: '#ffe082',
      WAITING_FOR_MASHING_IN: '#b3e5fc',
      RUNNING: '#c8e6c9',
      WAITING_FOR_IODINE_TEST: '#f8bbd0',
      WAITING_FOR_COOKING_START: '#d1c4e9',
      WAITING_FOR_WATER_BOIL: '#fff9c4',
      BREWING_FINISHED: '#ffccbc',
      // Fallback für unbekannte States
      default: '#eeeeee'
    };

    // Hilfskomponente für vertikale Linien-Labels mit fester Höhe
    const FixedHeightLabel = ({ value }: { value: string }) => (
      <text
        x={0}
        y={-35} // Feste Höhe über der Linie
        textAnchor="middle"
        fill="#ff9800"
        fontSize={12}
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {value}
      </text>
    );
    return (
      <div style={{ width: '100%', height: 500 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 60, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="elapsedTime"
              type="number"
              label={{ value: 'Zeit', position: 'insideBottomRight', offset: -5 }}
              tickFormatter={this.formatSecondsToHMS}
              interval={0}
              ticks={this.generateTicksEveryMinute(data)}
              fontSize={11}
            />
            <YAxis label={{ value: 'Temperatur (°C)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value, name, props) => [value, name === 'Temperature' ? 'Ist-Temperatur' : 'Soll-Temperatur']}
              labelFormatter={(label, payload) => {
                const found = payload && payload[0] && payload[0].payload;
                return found ? `${this.formatSecondsToHMS(label)} – %c${found.state}` : this.formatSecondsToHMS(label);
              }}
              contentStyle={{ fontWeight: 'bold', fontSize: 15, background: '#f9f9f9', border: '1px solid #bbb' }}
            />
            <Legend verticalAlign="top" align="center" wrapperStyle={{ top: 415 }} />
            {/* Prozessbereiche als farbige Flächen mit Dauer in einem Label */}
            {processAreas.map((area, idx) => (
              <ReferenceArea
                key={area.step}
                x1={area.start}
                x2={area.end}
                strokeOpacity={0}
                fill={areaColors[idx % areaColors.length]}
                fillOpacity={0.18}
                label={{
                  value: `${area.step} (${this.formatDuration(area.start, area.end)})`,
                  position: 'top',
                  fill: 'White',
                  fontSize: 13,
                  fontWeight: 'bold',
                  dy: -55,
                  dx: 0
                }}
              />
            ))}

            {/* Prozesswechsel nur als vertikale Linien markieren, ohne Label */}
            {processChanges.map(pc => (
              <ReferenceLine
                key={pc.step}
                x={pc.elapsedTime}
                stroke="#ff9800"
                strokeWidth={1}
              />
            ))}
            {/* Bereiche für jeden State farblich markieren */}
            {stateAreas.map((area, idx) => (
              <ReferenceArea
                key={area.key}
                x1={area.start}
                x2={area.end}
                stroke="Black"
                strokeWidth={1}
                fill={stateColorMap[area.state] || stateColorMap.default}
                fillOpacity={0.22}
                label={{
                  value: this.capitalizeState(area.state),
                  position: 'top',
                  fill: 'White',
                  fontSize: 11,
                  fontWeight: 'bold',
                  dy: -15,
                  dx: 0
                }}
              />
            ))}

            {/* State-Dauer als separate Referenzlinie, um Überlappung zu vermeiden */}
            {stateAreas.map((area, idx) => {
              const centerX = area.start + (area.end - area.start) / 2;
              // Nur anzeigen, wenn der Bereich groß genug ist
              if ((area.end - area.start) < 60) return null; // Zu kleine Bereiche überspringen
              return (
                <ReferenceLine
                  key={`state_duration_${area.key}`}
                  x={centerX}
                  stroke="transparent"
                  label={{
                    value: `(${this.formatDuration(area.start, area.end)})`,
                    position: 'top',
                    fill: 'White',
                    fontSize: 11,
                    dy: -1,
                    dx: 0
                  }}
                />
              );
            })}
            <Line type="monotone" dataKey="Temperature" stroke="#8884d8" name="Ist-Temperatur" dot={false} />
            <Line type="monotone" dataKey="TargetTemperature" stroke="#82ca9d" name="Soll-Temperatur" dot={false} />
            <Brush
              dataKey="elapsedTime"
              height={36}
              stroke="#ff9800"
              travellerWidth={14}
              fill="#23272b"
              tickFormatter={this.formatSecondsToHMS}
              className="brew-brush"
              y={440}
              startIndex={0}
              endIndex={data.length - 1}
              gap={4}
              onChange={(viewport) => {
                // Optional: Hier könnte ein Zoom-Event-Handler implementiert werden
              }}
              alwaysShowText={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default BrewProcessChart;
