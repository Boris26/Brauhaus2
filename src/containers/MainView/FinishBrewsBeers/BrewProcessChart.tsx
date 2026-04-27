import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush } from 'recharts';
import './BrewProcessChart.css';
import {
  COLOR_ACCENT,
  COLOR_BREW_FINISHED,
  COLOR_CHART_BLUE,
  COLOR_CHART_GREEN,
  COLOR_CHART_PEACH,
  COLOR_CHART_PINK,
  COLOR_CHART_PURPLE,
  COLOR_CHART_RED,
  COLOR_CHART_YELLOW,
  COLOR_CHART_YELLOW_STRONG,
  COLOR_DARK_BG,
  COLOR_HEATING,
  COLOR_LIGHT_TEXT,
  COLOR_WAITING_MASHING,
  COLOR_WHITE,
  SHADOW_PANEL2
} from '../../../colors';

interface BrewProcessChartProps {
  groupedData: any;
  selectedProcess?: string; // Optionaler Parameter für den ausgewählten Prozess
}

class BrewProcessChart extends Component<BrewProcessChartProps> {
  // Zustandslogik für die Prozessfilterung hinzufügen
  state = {
    selectedProcess: this.props.selectedProcess || ''
  };

  // Ändere die Prozessauswahl
  handleProcessChange = (process: string) => {
    this.setState({ selectedProcess: process === 'all' ? '' : process });
  };

  // Hilfsfunktion: Daten für das Diagramm aufbereiten
  prepareChartData(groupedData: any, selectedProcess?: string) {
    const chartData: any[] = [];
    let globalElapsed = 0;
    let interpolatedPoints = 0;
    const MAX_INTERPOLATED_POINTS = 2000;
    const INTERPOLATION_STEP = 1; // Sekunden

    // Filter anwenden, wenn ein Prozess ausgewählt ist
    const filteredData = selectedProcess
      ? { [selectedProcess]: groupedData[selectedProcess] }
      : groupedData;

    Object.entries(filteredData).forEach(([step, states]: [string, any]) => {
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
    const { selectedProcess } = this.state;

    if (!groupedData) return <div>Keine Diagrammdaten vorhanden.</div>;

    // Alle verfügbaren Prozessschritte extrahieren
    const availableProcesses = Object.keys(groupedData);

    const data = this.prepareChartData(groupedData, selectedProcess);

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
    const areaColors = [
      COLOR_CHART_PEACH,
      COLOR_CHART_GREEN,
      COLOR_CHART_BLUE,
      COLOR_CHART_PINK,
      COLOR_CHART_PURPLE,
      COLOR_CHART_YELLOW
    ];

    // Bereiche für jeden State (Prozessabschnitt) berechnen - basierend auf dem gefilterten Datensatz
    const stateAreas: { key: string; step: string; state: string; start: number; end: number }[] = [];
    let lastEnd = 0;

    const filteredGroupedData = selectedProcess
      ? { [selectedProcess]: groupedData[selectedProcess] }
      : groupedData;

    Object.entries(filteredGroupedData).forEach(([step, states]: [string, any]) => {
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

    // Farbzuweisungen bleiben unverändert
    const stateColorMap: Record<string, string> = {
      HEATING: COLOR_HEATING,
      WAITING_FOR_MASHING_IN: COLOR_WAITING_MASHING,
      RUNNING: COLOR_CHART_GREEN,
      WAITING_FOR_IODINE_TEST: COLOR_CHART_PINK,
      WAITING_FOR_COOKING_START: COLOR_CHART_PURPLE,
      WAITING_FOR_WATER_BOIL: COLOR_CHART_YELLOW,
      BREWING_FINISHED: COLOR_BREW_FINISHED,
      default: COLOR_LIGHT_TEXT
    };

    return (
      <div className="brew-process-container">
        {/* Prozessfilter-Auswahl */}
        <div className="brew-chart-filter">
          <button
            onClick={() => this.handleProcessChange('all')}
            className={`brew-filter-button ${!selectedProcess ? 'active' : ''}`}
          >
            Alle Prozesse
          </button>
          {availableProcesses.map(process => (
            <button
              key={process}
              onClick={() => this.handleProcessChange(process)}
              className={`brew-filter-button ${selectedProcess === process ? 'active' : ''}`}
            >
              {process}
            </button>
          ))}
        </div>

        <div className="brew-chart-container">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 50, right: 30, left: 0, bottom: 40 }}>
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
                formatter={(value, name) => {
                  // Temperaturwerte auf eine Dezimalstelle runden
                  const formattedValue = Number(value).toFixed(1);
                  // Name der Datenreihe anpassen
                  let seriesName = name;
                  if (name === 'Temperature') seriesName = 'Ist-Temperatur';
                  else if (name === 'TargetTemperature') seriesName = 'Soll-Temperatur';
                  else seriesName = name;
                  return [`${formattedValue} °C`, seriesName];
                }}
                labelFormatter={(label, payload) => {
                  if (!payload || !payload[0] || !payload[0].payload) {
                    return this.formatSecondsToHMS(label);
                  }

                  const dataPoint = payload[0].payload;
                  // Zeit und Prozess einfach als formatierter Text zurückgeben
                  return `${this.formatSecondsToHMS(label)} - ${dataPoint.step} (${this.capitalizeState(dataPoint.state)})`;
                }}
                contentStyle={{
                  fontWeight: 'normal',
                  fontSize: 12,
                  background: COLOR_DARK_BG,
                  color: COLOR_WHITE,
                  border: `2px solid ${COLOR_ACCENT}`,
                  borderRadius: '4px',
                  padding: '8px',
                  boxShadow: `2px 2px 6px ${SHADOW_PANEL2}`,
                  maxWidth: '220px',
                  width: 'auto'
                }}
                cursor={{ stroke: COLOR_ACCENT, strokeWidth: 1 }}
              />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ top: 460 }} />

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
                    className: "brew-process-area-label",
                    dy: -45
                  }}
                />
              ))}

              {/* Prozesswechsel nur als vertikale Linien markieren, ohne Label */}
              {processChanges.map(pc => (
                <ReferenceLine
                  key={pc.step}
                  x={pc.elapsedTime}
                  stroke={COLOR_ACCENT}
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
                    className: "brew-state-area-label",
                    dy: -18
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
                      value: `${this.formatDuration(area.start, area.end)}`,
                      position: 'top',
                      className: "brew-state-duration-label",
                    }}
                  />
                );
              })}
              <Line type="monotone" dataKey="Temperature" stroke={COLOR_CHART_RED} name="Ist-Temperatur" dot={false} />
              <Line type="monotone" dataKey="TargetTemperature" stroke={COLOR_CHART_YELLOW_STRONG} name="Soll-Temperatur" dot={false} />

              {/* Brush auskommentiert für mehr Diagrammhöhe
              <Brush
                dataKey="elapsedTime"
                height={36}
                stroke={COLOR_ACCENT}
                travellerWidth={14}
                fill={COLOR_DARK_BG}
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
              */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
}

export default BrewProcessChart;
