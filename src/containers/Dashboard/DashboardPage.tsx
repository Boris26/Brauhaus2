import React from 'react';
import { connect } from 'react-redux';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { BeerActions } from '../../actions/actions';
import { Beer } from '../../model/Beer';
import { FinishedBrew } from '../../model/FinishedBrew';
import { BrewingStatus, ProcessMode, ProcessState } from '../../model/brewingStatus.types';
import { BeerDataReducerState, ProductionReducerState } from '../../reducers/rootReducer';
import { getBrewingStatusLabel, isProcessActive } from '../../utils/brewingStatus/selectors';
import { buildActiveBrewRows, calculateCareHints, calculateDashboardKpis, calculateIngredientSummary, calculateMonthlyStats, formatDashboardQuantity, safeNumber } from '../../utils/Dashboard/dashboardCalculations';
import { DashboardIngredientUsage, DashboardYeastUsage } from '../../utils/Dashboard/dashboardTypes';
import './DashboardPage.css';

interface DashboardRootState {
  beerDataReducer: BeerDataReducerState;
  productionReducer: ProductionReducerState;
}

interface DashboardPageProps {
  beers?: Beer[];
  finishedBrews?: FinishedBrew[];
  isFetching: boolean;
  beerToBrew?: Beer;
  brewingStatus?: BrewingStatus;
  isBackendAvailable: boolean;
  getBeers: (isFetching: boolean) => void;
  getFinishedBrews: (isFetching: boolean) => void;
}

export class DashboardPage extends React.Component<DashboardPageProps> {
  componentDidMount(): void {
    if (this.props.beers === undefined) {
      this.props.getBeers(true);
    }
    if (this.props.finishedBrews === undefined) {
      this.props.getFinishedBrews(true);
    }
  }

  private renderKpis(): React.ReactNode {
    const kpis = calculateDashboardKpis(this.props.beers ?? [], this.props.finishedBrews ?? []);
    const cards = [
      { label: 'Rezepte', value: kpis.recipeCount },
      { label: 'Sude', value: kpis.brewCount },
      { label: 'Gesamt gebraut', value: formatDashboardQuantity(kpis.totalLiters), unit: 'Liter' },
      { label: 'Aktive Biere', value: kpis.activeBeerCount },
      { label: 'In Hauptgärung', value: kpis.fermentationCount },
      { label: 'In Reifung', value: kpis.maturationCount },
      { label: 'Fertige Biere', value: kpis.finishedCount },
    ];

    return (
      <section className="dashboard-kpi-grid" aria-label="Dashboard Kennzahlen">
        {cards.map((card) => (
          <article className="dashboard-card dashboard-kpi-card" key={card.label}>
            <span className="dashboard-kpi-label">{card.label}</span>
            <strong className="dashboard-kpi-value">{card.value}</strong>
            {card.unit && <span className="dashboard-kpi-unit">{card.unit}</span>}
          </article>
        ))}
      </section>
    );
  }

  private renderProductionStatus(): React.ReactNode {
    const { brewingStatus, beerToBrew, isBackendAvailable } = this.props;
    const isActive = isProcessActive(brewingStatus);
    const currentTemp = safeNumber(brewingStatus?.temperature.current, NaN);
    const targetTemp = safeNumber(brewingStatus?.temperature.target, NaN);
    const hasCurrentTemp = Number.isFinite(currentTemp);
    const hasTargetTemp = Number.isFinite(targetTemp);
    const isHeating = brewingStatus?.currentStep.mode === ProcessMode.HEATING;
    const canShowProgress = brewingStatus?.currentStep.mode === ProcessMode.TIMER_RUNNING && safeNumber(brewingStatus.currentStep.duration) > 0;
    const progress = canShowProgress ? Math.min(100, Math.max(0, Math.round(safeNumber(brewingStatus?.elapsedTime) * 100 / safeNumber(brewingStatus?.currentStep.duration)))) : 0;

    return (
      <section className="dashboard-card dashboard-production-card" aria-labelledby="dashboard-production-title">
        <div className="dashboard-section-header">
          <AssessmentIcon aria-hidden="true" />
          <h2 id="dashboard-production-title">Aktuelle Produktion</h2>
        </div>
        {!isBackendAvailable && <p className="dashboard-warning">Der aktuelle Produktionsstatus konnte nicht geladen werden.</p>}
        {!isActive && <p className="dashboard-empty">Kein aktiver Brauvorgang.</p>}
        {isActive && (
          <div className="dashboard-production-details">
            <h3>{beerToBrew?.name ?? 'Unbekanntes Bier'}</h3>
            <p className="dashboard-muted">{getBrewingStatusLabel(brewingStatus)}</p>
            <p>{brewingStatus?.currentStep.phase ?? '-'} · {brewingStatus?.currentStep.name ?? '-'}</p>
            <dl className="dashboard-status-grid">
              <div><dt>Ist</dt><dd>{hasCurrentTemp ? currentTemp.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '-'} °C</dd></div>
              <div><dt>Soll</dt><dd>{hasTargetTemp ? targetTemp.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '-'} °C</dd></div>
              <div><dt>Heizung</dt><dd>{brewingStatus?.hardware.heater === 'ON' ? 'aktiv' : 'aus'}</dd></div>
              <div><dt>Rührwerk</dt><dd>{brewingStatus?.hardware.agitator === 'ON' ? 'aktiv' : 'aus'}</dd></div>
              <div><dt>Warten</dt><dd>{brewingStatus?.waiting.canConfirm ? String(brewingStatus.waiting.waitingFor) : 'Nein'}</dd></div>
            </dl>
            <div className="dashboard-progress-slot">
              {isHeating && <span>Zieltemperatur wird erreicht.</span>}
              {canShowProgress && <><span>Fortschritt {progress} %</span><div className="dashboard-progress"><span style={{ width: `${progress}%` }} /></div></>}
              {!isHeating && !canShowProgress && <span>{brewingStatus?.process.state === ProcessState.ACTIVE ? 'Prozess läuft.' : 'Bereit.'}</span>}
            </div>
          </div>
        )}
      </section>
    );
  }

  private renderActiveBrews(): React.ReactNode {
    const rows = buildActiveBrewRows(this.props.finishedBrews ?? []);
    return (
      <section className="dashboard-card" aria-labelledby="dashboard-active-brews-title">
        <div className="dashboard-section-header"><LocalDrinkIcon aria-hidden="true" /><h2 id="dashboard-active-brews-title">Meine aktuellen Biere</h2></div>
        {rows.length === 0 ? <p className="dashboard-empty">Keine Biere in Hauptgärung oder Reifung.</p> : (
          <div className="dashboard-active-list">
            {rows.map((row) => (
              <article className="dashboard-active-row" key={row.id}>
                <h3>{row.name}</h3>
                <span className="dashboard-badge">{row.stateLabel}</span>
                <dl>
                  <div><dt>Start</dt><dd>{row.startDateLabel}</dd></div>
                  <div><dt>Seit</dt><dd>{row.daysSinceStartLabel}</dd></div>
                  <div><dt>Liter</dt><dd>{row.litersLabel}</dd></div>
                  <div><dt>Stammwürze</dt><dd>{row.originalWortLabel}</dd></div>
                  <div><dt>Restextrakt</dt><dd>{row.residualExtractLabel}</dd></div>
                  <div><dt>Notiz</dt><dd>{row.noteLabel}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  private renderIngredientList(title: string, items: DashboardIngredientUsage[] | DashboardYeastUsage[], unitFallback: string): React.ReactNode {
    return (
      <section className="dashboard-ingredient-panel" aria-label={title}>
        <h3>{title}</h3>
        {items.length === 0 ? <p className="dashboard-empty">Noch keine Zutatenstatistik verfügbar.</p> : (
          <ol>
            {items.map((item) => {
              const quantityText = 'quantity' in item ? `${formatDashboardQuantity(item.quantity)} ${item.unit ?? unitFallback}` : `${item.brewCount} Sude`;
              return <li key={`${item.name}-${'unit' in item ? item.unit ?? '' : ''}`}><span>{item.name}</span><strong>{quantityText}</strong><small>{item.brewCount} Sude{'type' in item && item.type ? ` · ${item.type}` : ''}</small></li>;
            })}
          </ol>
        )}
      </section>
    );
  }

  private renderIngredients(): React.ReactNode {
    const summary = calculateIngredientSummary(this.props.beers ?? [], this.props.finishedBrews ?? []);
    return (
      <section className="dashboard-card" aria-labelledby="dashboard-ingredients-title">
        <div className="dashboard-section-header"><ScienceIcon aria-hidden="true" /><h2 id="dashboard-ingredients-title">Zutatenverbrauch</h2></div>
        <p className="dashboard-muted">Mengen werden neutral als Rezeptmenge angezeigt, da die gespeicherte Mengeneinheit für Malz und Hopfen nicht eindeutig im Feldnamen codiert ist.</p>
        {summary.linkedBrewCount === 0 && <p className="dashboard-empty">Noch keine Zutatenstatistik verfügbar.</p>}
        <div className="dashboard-ingredients-grid">
          {this.renderIngredientList('Top 5 Malze', summary.malts, 'Menge')}
          {this.renderIngredientList('Top 5 Hopfen', summary.hops, 'Menge')}
          {this.renderIngredientList('Meistverwendete Hefen', summary.yeasts, '')}
          {this.renderIngredientList('Weitere Zutaten', summary.additionalIngredients, '')}
        </div>
      </section>
    );
  }

  private renderHistory(): React.ReactNode {
    const stats = calculateMonthlyStats(this.props.finishedBrews ?? []);
    const maxLiters = Math.max(...stats.map((stat) => stat.liters), 1);
    return (
      <section className="dashboard-card" aria-labelledby="dashboard-history-title">
        <h2 id="dashboard-history-title">Brauhistorie</h2>
        {stats.length === 0 ? <p className="dashboard-empty">Noch keine Braudurchgänge vorhanden.</p> : (
          <div className="dashboard-history-chart" role="list" aria-label="Liter und Sude pro Monat">
            {stats.map((stat) => (
              <div className="dashboard-history-bar" role="listitem" key={stat.key}>
                <span className="dashboard-history-value">{formatDashboardQuantity(stat.liters)} L · {stat.brewCount} Sude</span>
                <div className="dashboard-history-track"><span style={{ height: `${Math.max(8, stat.liters / maxLiters * 100)}%` }} /></div>
                <span className="dashboard-history-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  private renderCareHints(): React.ReactNode {
    const hints = calculateCareHints(this.props.beers ?? [], this.props.finishedBrews ?? []);
    const lines = [
      `${hints.missingLiters} Sude ohne eingetragene Litermenge`,
      `${hints.missingEndDate} Sude ohne Enddatum`,
      `${hints.missingResidualExtract} Sude ohne sinnvollen Restextrakt`,
      `${hints.activeInvalidStartDate} aktive Biere ohne gültiges Startdatum`,
      `${hints.missingRecipeLink} Sude ohne Rezeptverknüpfung`,
    ];
    return <section className="dashboard-card dashboard-care-card" aria-labelledby="dashboard-care-title"><div className="dashboard-section-header"><WarningAmberIcon aria-hidden="true" /><h2 id="dashboard-care-title">Daten prüfen</h2></div><ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul></section>;
  }

  render(): React.ReactNode {
    return (
      <main className="dashboard-page" aria-labelledby="dashboard-title">
        <header className="dashboard-title-row">
          <div>
            <p className="dashboard-eyebrow">Brauhaus Übersicht</p>
            <h1 id="dashboard-title">Dashboard</h1>
          </div>
          {this.props.isFetching && <span className="dashboard-loading">Dashboard-Daten werden geladen …</span>}
        </header>
        {this.renderKpis()}
        <div className="dashboard-two-column">
          {this.renderProductionStatus()}
          {this.renderActiveBrews()}
        </div>
        {this.renderIngredients()}
        <div className="dashboard-two-column dashboard-bottom-grid">
          {this.renderHistory()}
          {this.renderCareHints()}
        </div>
      </main>
    );
  }
}

const mapStateToProps = (state: DashboardRootState) => ({
  beers: state.beerDataReducer.beers,
  finishedBrews: state.beerDataReducer.finishedBrews,
  isFetching: state.beerDataReducer.isFetching,
  beerToBrew: state.beerDataReducer.beerToBrew,
  brewingStatus: state.productionReducer.brewingStatus,
  isBackendAvailable: state.productionReducer.isBackenAvailable,
});

const mapDispatchToProps = (dispatch: (action: BeerActions.AllBeerActions) => void) => ({
  getBeers: (isFetching: boolean) => dispatch(BeerActions.getBeers(isFetching)),
  getFinishedBrews: (isFetching: boolean) => dispatch(BeerActions.getFinishedBeers(isFetching)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
