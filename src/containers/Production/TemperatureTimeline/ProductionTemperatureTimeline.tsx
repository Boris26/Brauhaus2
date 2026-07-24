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
import {Beer, FermentationSteps} from '../../../model/Beer';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {TimeFormatter} from '../../../utils/TimeFormatter';
import {TimelineMeasurement} from '../../../utils/DataCollector/dataCollector';
import './ProductionTemperatureTimeline.css';

interface ProductionTemperatureTimelineProps {
    selectedBeer?: Beer;
    brewingStatus?: BrewingStatus;
    measurements: TimelineMeasurement[];
    fallbackTemperature: number;
}

interface TimelinePoint {
    elapsedSeconds: number;
    actualTemperature?: number;
    targetTemperature?: number;
}

interface PlannedStep {
    name: string;
    startSeconds: number;
    endSeconds: number;
    targetTemperature?: number;
}

const COOKING_STEP_NAME = 'Kochen';
const DEFAULT_STEP_SECONDS = 60;

export class ProductionTemperatureTimeline extends React.Component<ProductionTemperatureTimelineProps> {
    getSafeNumber = (aValue: unknown): number | undefined => {
        const value = Number(aValue);
        return Number.isFinite(value) ? value : undefined;
    }

    getCurrentElapsedSeconds = (): number => {
        const elapsed = this.getSafeNumber(this.props.brewingStatus?.elapsedTime);
        return elapsed !== undefined && elapsed > 0 ? elapsed : 0;
    }

    getCurrentActualTemperature = (): number | undefined => {
        const statusTemperature = this.getSafeNumber(this.props.brewingStatus?.temperature?.current);
        if (statusTemperature !== undefined && statusTemperature > 0) {
            return statusTemperature;
        }
        const fallback = this.getSafeNumber(this.props.fallbackTemperature);
        return fallback !== undefined && fallback > 0 ? fallback : undefined;
    }

    getCurrentTargetTemperature = (): number | undefined => {
        const target = this.getSafeNumber(this.props.brewingStatus?.temperature?.target);
        return target !== undefined && target > 0 ? target : undefined;
    }

    buildPlannedSteps = (): PlannedStep[] => {
        const {selectedBeer} = this.props;
        if (selectedBeer === undefined) {
            return [];
        }
        const fermentationSteps = Array.isArray(selectedBeer.fermentation) ? selectedBeer.fermentation : [];
        const plannedFermentationSteps = fermentationSteps.map((step: FermentationSteps) => ({
            name: step.type || 'Prozessschritt',
            durationSeconds: Math.max((this.getSafeNumber(step.time) ?? 0) * 60, DEFAULT_STEP_SECONDS),
            targetTemperature: this.getSafeNumber(step.temperature)
        }));
        const cookingMinutes = this.getSafeNumber(selectedBeer.cookingTime) ?? this.getSafeNumber(selectedBeer.wortBoiling?.totalTime);
        const cookingTemperature = this.getSafeNumber(selectedBeer.cookingTemperatur);
        const allSteps = [
            ...plannedFermentationSteps,
            ...(cookingMinutes !== undefined && cookingMinutes > 0 ? [{
                name: COOKING_STEP_NAME,
                durationSeconds: cookingMinutes * 60,
                targetTemperature: cookingTemperature
            }] : [])
        ];
        let cursor = 0;
        return allSteps.map((step) => {
            const plannedStep: PlannedStep = {
                name: step.name,
                startSeconds: cursor,
                endSeconds: cursor + step.durationSeconds,
                targetTemperature: step.targetTemperature
            };
            cursor = plannedStep.endSeconds;
            return plannedStep;
        });
    }

    buildTimelinePoints = (): TimelinePoint[] => {
        const pointsBySecond = new Map<number, TimelinePoint>();
        this.props.measurements.forEach((measurement) => {
            const elapsed = this.getSafeNumber(measurement.elapsedTime);
            if (elapsed === undefined || elapsed < 0) {
                return;
            }
            const elapsedSeconds = Math.floor(elapsed);
            pointsBySecond.set(elapsedSeconds, {
                elapsedSeconds,
                actualTemperature: this.getSafeNumber(measurement.Temperature),
                targetTemperature: this.getSafeNumber(measurement.TargetTemperature)
            });
        });
        const currentElapsedSeconds = Math.floor(this.getCurrentElapsedSeconds());
        const currentPoint = pointsBySecond.get(currentElapsedSeconds) ?? {elapsedSeconds: currentElapsedSeconds};
        pointsBySecond.set(currentElapsedSeconds, {
            ...currentPoint,
            actualTemperature: currentPoint.actualTemperature ?? this.getCurrentActualTemperature(),
            targetTemperature: currentPoint.targetTemperature ?? this.getCurrentTargetTemperature()
        });
        return Array.from(pointsBySecond.values()).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
    }

    getChartEndSeconds = (plannedSteps: PlannedStep[], points: TimelinePoint[]): number => {
        const plannedEnd = plannedSteps.length > 0 ? plannedSteps[plannedSteps.length - 1].endSeconds : 0;
        const lastPoint = points.length > 0 ? points[points.length - 1].elapsedSeconds : 0;
        return Math.max(plannedEnd, lastPoint, DEFAULT_STEP_SECONDS);
    }

    formatAxisTime = (elapsedSeconds: number): string => {
        return TimeFormatter.formatSecondsToHMS(Math.max(0, elapsedSeconds));
    }

    renderEmptyState = (): React.ReactNode => {
        return <div className="temperatureTimeline__empty">Noch keine Rezept- oder Temperaturdaten für die Timeline vorhanden.</div>;
    }

    render() {
        const plannedSteps = this.buildPlannedSteps();
        const points = this.buildTimelinePoints();
        const currentElapsedSeconds = this.getCurrentElapsedSeconds();
        const chartEndSeconds = this.getChartEndSeconds(plannedSteps, points);
        const progressPercent = Math.min(100, Math.max(0, (currentElapsedSeconds / chartEndSeconds) * 100));
        const hasChartData = plannedSteps.length > 0 || points.some((point) => point.actualTemperature !== undefined || point.targetTemperature !== undefined);

        return (
            <section className="temperatureTimeline" aria-label="Temperatur-Timeline">
                <div className="temperatureTimeline__header">
                    <div>
                        <h3>Temperatur-Timeline</h3>
                        <p>Isttemperatur, Zieltemperatur und Prozessschritte über den gesamten Brautag.</p>
                    </div>
                    <div className="temperatureTimeline__progress" aria-label={`Braufortschritt ${Math.round(progressPercent)} Prozent`}>
                        <span>{Math.round(progressPercent)}%</span>
                        <div className="temperatureTimeline__progressTrack">
                            <div className="temperatureTimeline__progressBar" style={{width: `${progressPercent}%`}} />
                        </div>
                    </div>
                </div>
                {!hasChartData ? this.renderEmptyState() : (
                    <div className="temperatureTimeline__chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={points} margin={{top: 10, right: 28, bottom: 10, left: 0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" />
                                <XAxis dataKey="elapsedSeconds" type="number" domain={[0, chartEndSeconds]} tickFormatter={this.formatAxisTime} stroke="var(--color-light-text)" />
                                <YAxis domain={[0, 105]} unit="°C" stroke="var(--color-light-text)" />
                                <Tooltip labelFormatter={(value) => `Zeit: ${this.formatAxisTime(Number(value))}`} formatter={(value, name) => [`${Number(value).toFixed(1)} °C`, name === 'actualTemperature' ? 'Isttemperatur' : 'Zieltemperatur']} />
                                {plannedSteps.map((step, index) => (
                                    <ReferenceArea key={`${step.name}-${step.startSeconds}`} x1={step.startSeconds} x2={step.endSeconds} fill={index % 2 === 0 ? 'rgba(76, 175, 80, 0.10)' : 'rgba(33, 150, 243, 0.10)'} stroke="rgba(255,255,255,0.18)" label={{value: step.name, position: 'insideTop', fill: 'var(--color-light-text)', fontSize: 12}} />
                                ))}
                                {plannedSteps.map((step) => (
                                    <ReferenceLine key={`${step.name}-end`} x={step.endSeconds} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
                                ))}
                                <ReferenceLine x={currentElapsedSeconds} stroke="var(--color-accent)" strokeWidth={2} label={{value: 'Jetzt', position: 'top', fill: 'var(--color-accent)', fontSize: 12}} />
                                <Line type="monotone" dataKey="actualTemperature" name="Isttemperatur" stroke="var(--color-warning)" strokeWidth={3} dot={{r: 2}} isAnimationActive={false} connectNulls />
                                <Line type="stepAfter" dataKey="targetTemperature" name="Zieltemperatur" stroke="var(--color-success)" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>
        );
    }
}
