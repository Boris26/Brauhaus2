import React from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {Beer} from '../../../model/Beer';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {TimeFormatter} from '../../../utils/TimeFormatter';
import {buildTemperatureTimelineModel, projectTemperatureTimeline, TemperatureTimelineModel} from './temperatureTimelineModel';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import './ProductionTemperatureTimeline.css';
import {TimeAnchorState} from '../../../utils/brewingStatus/streams';
import {useProcessDisplayTime} from '../../../utils/brewingStatus/useProcessDisplayTime';
import {RecordedPhase, TimelineClock} from '../../../model/ProcessTimeline';

interface ProductionTemperatureTimelineProps {
    selectedBeer?: Beer;
    brewingStatus?: BrewingStatus;
    measurements: readonly TimelineMeasurement[];
    phases?: readonly RecordedPhase[];
    history?: TimelineClock;
    historyError?: string;
    fallbackTemperature: number;
    displayNowSeconds?: number;
    displayCurrentStepElapsedSeconds?: number;
}

export const LiveProductionTemperatureTimeline = ({timeAnchor, stale, ...props}: ProductionTemperatureTimelineProps & {timeAnchor?: TimeAnchorState; stale?: boolean}) => {
    const time = useProcessDisplayTime(props.brewingStatus, timeAnchor, stale);
    return <ProductionTemperatureTimeline {...props} displayNowSeconds={time.processElapsedSeconds} displayCurrentStepElapsedSeconds={time.stepElapsedSeconds} />;
};

export class ProductionTemperatureTimeline extends React.Component<ProductionTemperatureTimelineProps> {
    private cached?: {beer?: Beer; status?: BrewingStatus; measurements: readonly TimelineMeasurement[]; phases?: readonly RecordedPhase[]; fallback: number; model: TemperatureTimelineModel};
    formatAxisTime = (elapsedSeconds: number): string => {
        return TimeFormatter.formatSecondsToHMS(Math.max(0, elapsedSeconds));
    }

    renderEmptyState = (): React.ReactNode => {
        return <div className="temperatureTimeline__empty">Noch keine Rezept- oder Temperaturdaten für die Timeline vorhanden.</div>;
    }

    render() {
        if (!this.cached || this.cached.beer !== this.props.selectedBeer || this.cached.status !== this.props.brewingStatus
            || this.cached.measurements !== this.props.measurements || this.cached.phases !== this.props.phases || this.cached.fallback !== this.props.fallbackTemperature) {
            this.cached = {beer: this.props.selectedBeer, status: this.props.brewingStatus, measurements: this.props.measurements,
                fallback: this.props.fallbackTemperature, phases: this.props.phases,
                model: buildTemperatureTimelineModel(this.props.selectedBeer, this.props.brewingStatus, this.props.measurements, this.props.fallbackTemperature, {
                    measurementsOrderedByCollection: true,
                    phases: this.props.phases,
                    historyClock: this.props.history,
                })};
        }
        const model = this.cached.model;
        const {points} = model;
        const clockSeconds = this.props.history && !this.props.brewingStatus?.timeline ? this.props.history.processElapsedSeconds
            : this.props.displayNowSeconds ?? this.props.brewingStatus?.timeline?.processElapsedSeconds ?? this.props.brewingStatus?.elapsedTime;
        const nowSeconds = Math.max(0, clockSeconds === undefined ? model.nowSeconds : model.clockOffsetSeconds + clockSeconds);
        const {steps, endSeconds, axisEndSeconds, axisTicks} = projectTemperatureTimeline(model, nowSeconds, this.props.displayCurrentStepElapsedSeconds);
        const progressPercent = this.props.brewingStatus?.process.state === 'FINISHED' ? 100 : Math.min(100, nowSeconds * 100 / Math.max(endSeconds, 1));
        const history = this.props.history ?? this.props.brewingStatus?.timeline;
        const hasChartData = steps.length > 0 || points.some((point) => point.actualTemperature != null || point.targetTemperature != null);

        return (
            <section className="temperatureTimeline" aria-label="Temperatur-Timeline">
                <div className="temperatureTimeline__header">
                    <div className="temperatureTimeline__titleArea">
                        <h3 className="temperatureTimeline__title">Temperaturverlauf</h3>
                        <div className="temperatureTimeline__legend" aria-label="Temperaturkurven">
                            <span className="temperatureTimeline__legendActual">Isttemperatur</span>
                            <span className="temperatureTimeline__legendTarget">Zieltemperatur</span>
                        </div>
                    </div>
                    <div className="temperatureTimeline__progress" aria-label={`Braufortschritt ${Math.round(progressPercent)} Prozent`}>
                        <span>Fortschritt: {Math.round(progressPercent)}%</span>
                        <div className="temperatureTimeline__progressTrack">
                            <div className="temperatureTimeline__progressBar" style={{width: `${progressPercent}%`}} />
                        </div>
                    </div>
                </div>
                {history?.origin === 'RECOVERY' && <small>Der aufgezeichnete Zeitverlauf beginnt mit der Wiederaufnahme.</small>}
                {history && !this.props.brewingStatus?.timeline && <small>Historie des zuletzt aufgezeichneten Brauvorgangs. Die Prozesszeit ist angehalten.</small>}
                {!!history?.retentionVersion && <small>Ältere Messdetails wurden aufgrund der Historienbegrenzung entfernt.</small>}
                {history && !history.durable && <small role="status">Die Messhistorie ist derzeit nur im Arbeitsspeicher verfügbar.</small>}
                {this.props.historyError && <small role="status">{this.props.historyError}</small>}
                {!hasChartData ? this.renderEmptyState() : (
                    <div className="temperatureTimeline__chart">
                        <ResponsiveContainer width="100%" height="100%" debounce={100}>
                            <LineChart data={points} margin={{top: 18, right: 28, bottom: 14, left: 4}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" />
                                <XAxis
                                    dataKey="elapsedSeconds"
                                    type="number"
                                    scale="linear"
                                    domain={[0, axisEndSeconds]}
                                    ticks={axisTicks}
                                    interval={0}
                                    allowDataOverflow
                                    minTickGap={12}
                                    tickFormatter={this.formatAxisTime}
                                    stroke="var(--text-primary)"
                                />
                                <YAxis domain={[0, 110]} unit="°C" tickCount={6} stroke="var(--text-primary)" />
                                <Tooltip labelFormatter={(value) => `Zeit: ${this.formatAxisTime(Number(value))}`} formatter={(value, name) => [`${Number(value).toFixed(1)} °C`, name === 'actualTemperature' ? 'Isttemperatur' : 'Zieltemperatur']} />
                                {steps.map((step, index) => (
                                    <ReferenceArea key={step.id ?? `${index}-${step.name}`} x1={step.startSeconds} x2={step.endSeconds} fill={index % 2 === 0 ? 'rgba(76, 175, 80, 0.10)' : 'rgba(33, 150, 243, 0.10)'} stroke="rgba(255,255,255,0.18)" label={step.showLabel ? {value: step.name, position: 'insideTop', fill: 'var(--text-primary)', fontSize: 11} : undefined} />
                                ))}
                                {steps.map((step, index) => (
                                    <ReferenceLine key={`${step.id ?? `${index}-${step.name}`}-end`} x={step.endSeconds} stroke="rgba(255,255,255,0.24)" strokeDasharray="4 4" />
                                ))}
                                <ReferenceLine x={nowSeconds} stroke="var(--accent)" strokeWidth={2} label={{value: 'Jetzt', position: 'top', fill: 'var(--accent)', fontSize: 12}} />
                                <Line type="linear" dataKey="actualTemperature" name="Isttemperatur" stroke="var(--color-warning)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                                <Line type="stepAfter" dataKey="targetTemperature" name="Zieltemperatur" stroke="var(--color-success)" strokeWidth={1.5} strokeOpacity={0.8} dot={false} isAnimationActive={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>
        );
    }
}
