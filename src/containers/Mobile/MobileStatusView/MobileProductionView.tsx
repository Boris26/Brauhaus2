import React from 'react';
import { connect } from 'react-redux';
import './MobileProductionView.css';
import { BrewingStatus } from '../../../model/BrewingStatus';
import { ProductionActions } from '../../../actions/actions';
import { TimeFormatter } from "../../../utils/TimeFormatter";
import MobileBrewingCalculationsView from '../MobileBrewingCalculationsView/MobileBrewingCalculationsView';

interface MobileProductionViewProps {
    temperature: number;
    brewingStatus: BrewingStatus;
    startPolling: () => void;
    isPollingRunning: boolean;
}

interface MobileProductionViewState {
    activeTab: 'status' | 'finishedBrew' | 'calculations';
}

class MobileProductionView extends React.Component<MobileProductionViewProps, MobileProductionViewState> {
    constructor(props: MobileProductionViewProps) {
        super(props);
        this.state = { activeTab: 'status' };
    }

    handleTabChange = (tab: 'status' | 'finishedBrew' | 'calculations') => {
        this.setState({ activeTab: tab });
    };

    componentDidUpdate(prevProps: MobileProductionViewProps) {
        const prevStatus = prevProps.brewingStatus?.StatusText;
        const currStatus = this.props.brewingStatus?.StatusText;
        if (prevStatus !== undefined && currStatus !== prevStatus) {
            // Status hat sich geändert, triggere Vibration (falls unterstützt)
            if (navigator.vibrate) {
                navigator.vibrate(200); // 200ms Vibration
            }
        }
    }

    touchStartX: number | null = null;
    touchEndX: number | null = null;

    handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        this.touchStartX = e.touches[0].clientX;
    };

    handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        this.touchEndX = e.touches[0].clientX;
    };

    handleTouchEnd = () => {
        if (this.touchStartX === null || this.touchEndX === null) return;
        const deltaX = this.touchEndX - this.touchStartX;
        if (Math.abs(deltaX) > 50) {
            // Swipe nach links: nächste Seite, nach rechts: vorherige Seite
            const tabOrder: ('status' | 'finishedBrew' | 'calculations')[] = ['status', 'finishedBrew', 'calculations'];
            const currentIdx = tabOrder.indexOf(this.state.activeTab);
            if (deltaX < 0 && currentIdx < tabOrder.length - 1) {
                this.setState({ activeTab: tabOrder[currentIdx + 1] });
            } else if (deltaX > 0 && currentIdx > 0) {
                this.setState({ activeTab: tabOrder[currentIdx - 1] });
            }
        }
        this.touchStartX = null;
        this.touchEndX = null;
    };

    render() {
        const { brewingStatus, startPolling, isPollingRunning } = this.props;
        const { activeTab } = this.state;
        const statusText = brewingStatus?.Name;
        return (
            <div
                className="mobile-production-container"
                onTouchStart={this.handleTouchStart}
                onTouchMove={this.handleTouchMove}
                onTouchEnd={this.handleTouchEnd}
            >
                <div className="mobile-tabs">
                    <button className={activeTab === 'status' ? 'active' : ''} onClick={() => this.handleTabChange('status')}>Status</button>
                    <button className={activeTab === 'finishedBrew' ? 'active' : ''} onClick={() => this.handleTabChange('finishedBrew')}>Aktiver Sud</button>
                    <button className={activeTab === 'calculations' ? 'active' : ''} onClick={() => this.handleTabChange('calculations')}>Berechnungen</button>
                </div>
                <hr className="mobile-tabs-separator" />
                {activeTab === 'status' && (
                    <>
                        <h2>Brauhaus Mobile</h2>
                        <div className="mobile-info-list">
                            <div className="mobile-info-block">
                                <span className="mobile-label">Temperatur:</span>
                                <span className="mobile-value">{brewingStatus?.Temperature ?? '-'} °C</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Zieltemperatur:</span>
                                <span className="mobile-value">{brewingStatus?.TargetTemperature ?? '-'} °C</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Typ:</span>
                                <span className="mobile-value">{brewingStatus?.Type || '-'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Warten:</span>
                                <span className="mobile-value">{brewingStatus?.WaitingStatus ? 'Ja' : 'Nein'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Heizt auf:</span>
                                <span className="mobile-value">{brewingStatus?.HeatUpStatus ? 'Ja' : 'Nein'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Rührwerk:</span>
                                <span className="mobile-value">{brewingStatus?.AgitatorStatus ? 'An' : 'Aus'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Laufzeit:</span>
                                <span className="mobile-value">{brewingStatus?.elapsedTime != null ? TimeFormatter.formatSecondsToHMS(brewingStatus.elapsedTime) : '-'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Zielzeit:</span>
                                <span className="mobile-value">{brewingStatus?.currentTime != null ? TimeFormatter.formatSecondsToHMS(brewingStatus.currentTime) : '-'}</span>
                            </div>
                        </div>
                        <div className="mobile-status-block">
                            <span className="mobile-label">Status:</span>
                            <div className="mobile-status-value">{statusText || '-'}</div>
                        </div>
                        <button className="mobile-polling-btn" onClick={startPolling} disabled={isPollingRunning}>
                            {isPollingRunning ? 'Aktualisierung läuft...' : 'Aktualisieren'}
                        </button>
                    </>
                )}
                {activeTab === 'finishedBrew' && (
                    <React.Suspense fallback={<div>Lade...</div>}>
                        <MobileActiveFinishedBrewViewLazy />
                    </React.Suspense>
                )}
                {activeTab === 'calculations' && (
                    <MobileBrewingCalculationsView />
                )}
            </div>
        );
    }
}

const MobileActiveFinishedBrewViewLazy = React.lazy(() => import('../MobileActiveFinishedBrewView/MobileActiveFinishedBrewView'));

const mapStateToProps = (state: any) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isPollingRunning: state.productionReducer.isPollingRunning
});

const mapDispatchToProps = (dispatch: any) => ({
    startPolling: () => dispatch(ProductionActions.startPolling())
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
