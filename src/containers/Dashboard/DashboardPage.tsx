import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Beer } from '../../model/Beer';
import { FinishedBrew } from '../../model/FinishedBrew';
import { BrewingStatus, ProcessMode } from '../../model/brewingStatus.types';
import { eBrewState } from '../../enums/eBrewState';
import { getBrewingStatusLabel, isProcessActive } from '../../utils/brewingStatus/selectors';
import { buildActiveBrewRows, calculateAdditionalStats, calculateCareHints, calculateConsumption, calculateDashboardKpis, calculateRecipeHistory, formatDashboardQuantity, safeNumber } from '../../utils/Dashboard/dashboardCalculations';
import './DashboardPage.css';
import {RealtimeControllerState} from '../../model/RealtimeControllerState';
import {getAgitatorActive, getHeatingActive} from '../Production/utils/productionStatus';
import {formatTemperature} from '../../utils/temperatureSensor';
import {FermentationDetails} from '../../model/Fermentation';
import {actionDueLabel, latestFermentationReadings} from '../../utils/fermentation';

interface DashboardPageProps {
  beers?: Beer[];
  finishedBrews?: FinishedBrew[];
  isFetching: boolean;
  beerToBrew?: Beer;
  brewingStatus?: BrewingStatus;
  isBackendAvailable: boolean;
  realtimeState?: RealtimeControllerState;
  socketConnected?: boolean;
  getBeers: (isFetching: boolean) => void;
  getFinishedBrews: (isFetching: boolean) => void;
  fermentationByBrewId?: Record<string, FermentationDetails>;
  loadFermentation?: (id: string) => void;
}

const formatSeconds = (value: unknown): string => {
  const seconds = Math.max(0, Math.round(safeNumber(value)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const formatFermentationValue = (value: number | undefined, unit: string): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('de-DE', {maximumFractionDigits: 1})} ${unit}` : '–';

export class DashboardPage extends React.Component<DashboardPageProps> {
  componentDidMount(): void {
    if (this.props.beers === undefined) this.props.getBeers(true);
    if (this.props.finishedBrews === undefined) this.props.getFinishedBrews(true);
    (this.props.finishedBrews ?? []).filter(b => b.active && b.state !== eBrewState.FINISHED).forEach(b => this.props.loadFermentation?.(b.id));
  }

  componentDidUpdate(previous: DashboardPageProps): void {
    if (previous.finishedBrews !== this.props.finishedBrews) {
      (this.props.finishedBrews ?? []).filter(b => b.active && b.state !== eBrewState.FINISHED).forEach(b => this.props.loadFermentation?.(b.id));
    }
  }

  private renderProductionStatus(): React.ReactNode {
    const { brewingStatus, beerToBrew, isBackendAvailable } = this.props;
    const isActive = isProcessActive(brewingStatus);
    const currentTemp = this.props.socketConnected ? this.props.realtimeState?.temperatureSensor?.current : null;
    const targetTemp = safeNumber(brewingStatus?.temperature.target, NaN);
    const duration = safeNumber(brewingStatus?.currentStep.duration);
    const elapsed = safeNumber(brewingStatus?.currentStep.elapsedTime);
    const canShowProgress = brewingStatus?.currentStep.mode === ProcessMode.TIMER_RUNNING && duration > 0;
    const progress = canShowProgress ? Math.min(100, Math.max(0, Math.round(elapsed * 100 / duration))) : 0;

    return (
      <section className={`dashboard-card dashboard-main-card dashboard-production-card${isActive ? ' is-active' : ''}`} aria-labelledby="dashboard-production-title">
        <div className="dashboard-section-header"><AssessmentIcon aria-hidden="true" /><h2 id="dashboard-production-title">Aktuelle Produktion</h2></div>
        {!isBackendAvailable && <p className="dashboard-warning">Der aktuelle Produktionsstatus konnte nicht geladen werden.</p>}
        {!isActive && isBackendAvailable && <div className="dashboard-production-empty"><strong>Keine aktive Produktion</strong><span>Die Brausteuerung wartet auf einen neuen Brauvorgang.</span></div>}
        {isActive && <div className="dashboard-production-details">
          <div className="dashboard-production-heading"><h3>{beerToBrew?.name ?? 'Unbekanntes Bier'}</h3><span className="dashboard-badge dashboard-badge-production">{getBrewingStatusLabel(brewingStatus)}</span></div>
          <p className="dashboard-step">{brewingStatus?.currentStep.name || brewingStatus?.currentStep.phase || 'Aktueller Schritt'}</p>
          <div className="dashboard-temperature"><strong>{formatTemperature(currentTemp)}</strong><span>Ziel: {Number.isFinite(targetTemp) ? targetTemp.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–'} °C</span></div>
          <div className="dashboard-progress" aria-label={`Fortschritt ${progress} Prozent`}><span style={{ width: `${progress}%` }} /></div>
          <div className="dashboard-time"><span>{canShowProgress ? `${formatSeconds(elapsed)} / ${formatSeconds(duration)}` : brewingStatus?.currentStep.mode === ProcessMode.HEATING ? 'Zieltemperatur wird erreicht' : 'Prozess läuft'}</span>{canShowProgress && <strong>{progress} %</strong>}</div>
          <dl className="dashboard-hardware">
            <div><dt>Heizung</dt><dd className={getHeatingActive(this.props.realtimeState, this.props.socketConnected) ? 'is-on' : ''}>{getHeatingActive(this.props.realtimeState, this.props.socketConnected) === undefined ? 'UNBEKANNT' : getHeatingActive(this.props.realtimeState, this.props.socketConnected) ? 'EIN' : 'AUS'}</dd></div>
            <div><dt>Rührwerk</dt><dd className={getAgitatorActive(this.props.realtimeState, this.props.socketConnected) ? 'is-on' : ''}>{getAgitatorActive(this.props.realtimeState, this.props.socketConnected) === undefined ? 'UNBEKANNT' : getAgitatorActive(this.props.realtimeState, this.props.socketConnected) ? 'EIN' : 'AUS'}</dd></div>
          </dl>
          {brewingStatus?.waiting.canConfirm && <p className="dashboard-warning">Bestätigung erforderlich: {String(brewingStatus.waiting.waitingFor)}</p>}
        </div>}
      </section>
    );
  }

  render(): React.ReactNode {
    const beers = this.props.beers ?? [];
    const brews = this.props.finishedBrews ?? [];
    const kpis = calculateDashboardKpis(beers, brews);
    const activeRows = buildActiveBrewRows(brews);
    const history = calculateRecipeHistory(beers, brews);
    const consumption = calculateConsumption(beers, brews);
    const stats = calculateAdditionalStats(brews);
    const hints = calculateCareHints(beers, brews);
    const maxHistoryBrews = Math.max(1, ...history.map((row) => row.brewCount));
    const hintLines = [
      hints.missingLiters > 0 ? `${hints.missingLiters} Sude ohne Litermenge` : '',
      hints.missingEndDate > 0 ? `${hints.missingEndDate} Sude ohne Enddatum` : '',
      hints.activeInvalidStartDate > 0 ? `${hints.activeInvalidStartDate} aktive Biere ohne Startdatum` : '',
      hints.missingRecipeLink > 0 ? `${hints.missingRecipeLink} Sude ohne Rezeptverknüpfung` : '',
    ].filter(Boolean);
    const activeBreakdown = [kpis.fermentationCount ? `${kpis.fermentationCount} in Hauptgärung` : '', kpis.maturationCount ? `${kpis.maturationCount} in Reifung` : ''].filter(Boolean).join(' · ') || 'Keine aktiven Biere';
    const cards = [
      { label: 'Sude gesamt', value: kpis.brewCount, detail: `${formatDashboardQuantity(kpis.totalLiters)} Liter gebraut`, icon: <ScienceIcon /> },
      { label: 'Aktive Biere', value: kpis.activeBeerCount, detail: activeBreakdown, icon: <LocalDrinkIcon /> },
      { label: 'Fertige Biere', value: kpis.finishedCount, detail: 'abgeschlossene Sude', icon: <CheckCircleOutlineIcon /> },
      { label: 'Rezepte', value: kpis.recipeCount, detail: 'verfügbar insgesamt', icon: <MenuBookOutlinedIcon /> },
    ];

    return <main className="dashboard-page" aria-labelledby="dashboard-title">
      <header className="dashboard-title-row"><div><h1 id="dashboard-title">Dashboard</h1><p>Brauhaus auf einen Blick</p></div>{this.props.isFetching && <span className="dashboard-loading">Dashboard-Daten werden geladen …</span>}</header>
      <section className="dashboard-kpi-grid" aria-label="Dashboard Kennzahlen">{cards.map((card) => <article className="dashboard-card dashboard-kpi-card" key={card.label}><span className="dashboard-kpi-icon" aria-hidden="true">{card.icon}</span><span className="dashboard-kpi-label">{card.label}</span><strong className="dashboard-kpi-value">{card.value}</strong><span className="dashboard-kpi-detail">{card.detail}</span></article>)}</section>
      <div className="dashboard-content-grid">
        <section className="dashboard-card dashboard-main-card dashboard-active-card" aria-labelledby="dashboard-active-title"><div className="dashboard-section-header"><LocalDrinkIcon aria-hidden="true" /><h2 id="dashboard-active-title">Aktive Gärungen</h2></div>{activeRows.length === 0 ? <p className="dashboard-empty">Keine Biere in Hauptgärung oder Reifung.</p> : <div className="dashboard-scroll-list">{activeRows.map((row) => { const detail = this.props.fermentationByBrewId?.[row.id]; const readings = latestFermentationReadings(detail?.measurements, detail?.sensorMeasurements); const next = [...(detail?.actions ?? [])].filter(a => a.state === 'PLANNED').sort((a,b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]; const due = next && actionDueLabel(next); return <article className="dashboard-active-row" key={row.id}><span className={`dashboard-state-dot ${row.state === eBrewState.MATURATION ? 'is-maturation' : ''}`} /><div className="dashboard-active-details"><h3>{row.name}</h3><dl className="dashboard-fermentation-values"><div><dt>Bier</dt><dd>{formatFermentationValue(readings.beerTemperature, '°C')}</dd></div><div><dt>Außen</dt><dd>{formatFermentationValue(readings.ambientTemperature, '°C')}</dd></div><div><dt>Plato</dt><dd>{formatFermentationValue(readings.plato, '°P')}</dd></div></dl>{next && <p className={`dashboard-next-action is-${due?.severity}`}><strong>{due?.label}:</strong> {[next.amount, next.unit, next.ingredientName, next.type?.toLowerCase()].filter(Boolean).join(' ')}</p>}</div><span className={`dashboard-badge ${row.state === eBrewState.MATURATION ? 'is-maturation' : ''}`}>{row.stateLabel}</span><strong className="dashboard-day">{row.daysSinceStartLabel === '-' ? '–' : `Tag ${row.daysSinceStartLabel.replace(' Tage', '')}`}</strong></article>;})}</div>}</section>
        {this.renderProductionStatus()}
        <section className="dashboard-card dashboard-main-card dashboard-history-card" aria-labelledby="dashboard-history-title"><div className="dashboard-section-header"><AssessmentIcon aria-hidden="true" /><h2 id="dashboard-history-title">Brauhistorie nach Rezept</h2></div><div className="dashboard-history-summary"><span><strong>{kpis.brewCount}</strong>Sude</span><span><strong>{formatDashboardQuantity(kpis.totalLiters)} l</strong>gebraut</span><span><strong>{kpis.brewCount ? formatDashboardQuantity(kpis.totalLiters / kpis.brewCount) : '–'} l</strong>Ø pro Sud</span><span><strong>{history.length}</strong>verwendet</span></div>{history.length === 0 ? <p className="dashboard-empty">Keine verknüpfte Brauhistorie verfügbar.</p> : <div className="dashboard-scroll-list dashboard-history-list">{history.map((row) => <div className="dashboard-history-row" key={row.recipeId}><strong>{row.recipeName}</strong><span>{row.brewCount} {row.brewCount === 1 ? 'Sud' : 'Sude'}</span><span>{formatDashboardQuantity(row.liters)} l</span><div className="dashboard-history-track"><span style={{ width: `${row.brewCount / maxHistoryBrews * 100}%` }} /></div></div>)}</div>}</section>
        <section className="dashboard-card dashboard-compact-card" aria-labelledby="dashboard-consumption-title"><div className="dashboard-section-header"><Inventory2OutlinedIcon aria-hidden="true" /><h2 id="dashboard-consumption-title">Gesamtverbrauch</h2></div>{consumption.linkedBrewCount ? <><div className="dashboard-consumption-grid"><div><span>Malz</span><strong>{formatDashboardQuantity(consumption.maltQuantity)}</strong><small>Rezeptmenge*</small></div><div><span>Hopfen</span><strong>{formatDashboardQuantity(consumption.hopQuantity)}</strong><small>Rezeptmenge*</small></div><div><span>Hefe</span><strong>{consumption.yeastUses}</strong><small>Sud-Einsätze</small></div></div><p className="dashboard-footnote">* Die gespeicherten Mengen haben keine verlässliche Einheit.</p></> : <p className="dashboard-empty">Keine verknüpften Rezeptdaten verfügbar.</p>}</section>
        <section className="dashboard-card dashboard-compact-card" aria-labelledby="dashboard-stats-title"><div className="dashboard-section-header"><ScienceIcon aria-hidden="true" /><h2 id="dashboard-stats-title">Weitere Kennzahlen</h2></div><dl className="dashboard-metric-list"><div><dt>Ø Stammwürze ({stats.originalWortSampleCount})</dt><dd>{stats.averageOriginalWort === undefined ? '–' : `${formatDashboardQuantity(stats.averageOriginalWort)} °P`}</dd></div><div><dt>Größter Sud</dt><dd>{stats.largestBrew === undefined ? '–' : `${formatDashboardQuantity(stats.largestBrew)} l`}</dd></div><div><dt>Kleinster Sud</dt><dd>{stats.smallestBrew === undefined ? '–' : `${formatDashboardQuantity(stats.smallestBrew)} l`}</dd></div><div><dt>Letzter Sud</dt><dd>{stats.lastBrew ?? '–'}</dd></div></dl></section>
        <section className="dashboard-card dashboard-compact-card dashboard-hints-card" aria-labelledby="dashboard-hints-title"><div className="dashboard-section-header">{!this.props.isBackendAvailable || hintLines.length ? <WarningAmberIcon aria-hidden="true" /> : <CheckCircleOutlineIcon aria-hidden="true" />}<h2 id="dashboard-hints-title">Hinweise</h2></div>{!this.props.isBackendAvailable && <p className="dashboard-hint is-warning">Backend nicht erreichbar</p>}{hintLines.map((line) => <p className="dashboard-hint" key={line}>• {line}</p>)}{this.props.isBackendAvailable && hintLines.length === 0 && <p className="dashboard-hint is-clear">Keine offenen Aktionen</p>}</section>
      </div>
    </main>;
  }
}
