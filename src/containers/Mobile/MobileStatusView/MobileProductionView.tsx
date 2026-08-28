import React from 'react';
import './MobileProductionView.css';
import { BrewingStatus } from '../../../model/brewingStatus.types';
import { TimeFormatter } from "../../../utils/TimeFormatter";
import MobileBrewingCalculationsView from '../MobileBrewingCalculationsView/MobileBrewingCalculationsView';
import {getBrewingStatusLabel, getConfirmationRequestViewModel, getStatusChangeKey, isStepWaiting} from '../../../utils/brewingStatus/selectors';
import SettingsPage from '../../Settings/SettingsPage.connect';
import {ConfirmStates} from '../../../enums/eConfirmStates';
import {ControlConfirmationNotice} from '../../Production/components/InlineProcessNotice';
import {getHeaterDisplayLabel} from '../../Production/utils/productionStatus';

interface MobileProductionViewProps {
    temperature: number;
    brewingStatus: BrewingStatus;
    startPolling: () => void;
    stopPolling: () => void;
    isPollingRunning: boolean;
    confirm: (confirmState: ConfirmStates) => void;
    isConfirmPending: boolean;
    confirmError?: string;
    isBrewingStatusStale: boolean;
}

interface MobileProductionViewState {
    activeTab: MobileTab;
}

type MobileTab = 'status' | 'finishedBrew' | 'calculations' | 'settings';

export class MobileProductionView extends React.Component<MobileProductionViewProps, MobileProductionViewState> {
    constructor(props: MobileProductionViewProps) {
        super(props);
        this.state = { activeTab: 'status' };
    }

    handleTabChange = (tab: MobileTab) => {
        this.setState({ activeTab: tab });
    };

    componentDidMount() {
        if (!this.props.isPollingRunning) {
            this.props.startPolling();
        }
    }

    componentWillUnmount() {
        this.props.stopPolling();
    }

    componentDidUpdate(prevProps: MobileProductionViewProps) {
        const prevStatus = getStatusChangeKey(prevProps.brewingStatus);
        const currStatus = getStatusChangeKey(this.props.brewingStatus);
        if (prevStatus !== undefined && currStatus !== prevStatus) {
            // Status hat sich geändert, triggere Vibration (falls unterstützt)
            if (navigator.vibrate) {
                navigator.vibrate(200); // 200ms Vibration
            }
        }
    }

    confirmCurrentWaitingState = () => {
        const request = getConfirmationRequestViewModel(this.props.brewingStatus);
        if (!request?.canConfirm || !request.confirmState || this.props.isConfirmPending) return;
        this.props.confirm(request.confirmState);
    };

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
            const tabOrder: MobileTab[] = ['status', 'finishedBrew', 'calculations', 'settings'];
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
        const statusText = this.props.isBrewingStatusStale ? 'Status veraltet – Controller nicht erreichbar' : getBrewingStatusLabel(brewingStatus);
        const confirmationRequest = getConfirmationRequestViewModel(brewingStatus);
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
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => this.handleTabChange('settings')}>Einstellungen</button>
                </div>
                <hr className="mobile-tabs-separator" />
                <main className="mobile-content" data-testid="mobile-scroll-content">
                {activeTab === 'status' && (
                    <>
                        <div className="mobile-info-list">
                            <div className="mobile-info-block">
                                <span className="mobile-label">Temperatur:</span>
                                <span className="mobile-value">{this.props.isBrewingStatusStale ? '-' : (brewingStatus?.temperature?.current ?? '-')} °C</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Zieltemperatur:</span>
                                <span className="mobile-value">{this.props.isBrewingStatusStale ? '-' : (brewingStatus?.temperature?.target ?? '-')} °C</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Typ:</span>
                                <span className="mobile-value">{brewingStatus?.currentStep?.phase || '-'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Warten:</span>
                                <span className="mobile-value">{isStepWaiting(brewingStatus) ? 'Ja' : 'Nein'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Heizung:</span>
                                <span className="mobile-value">{this.props.isBrewingStatusStale ? 'Unbekannt' : getHeaterDisplayLabel(brewingStatus)}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Rührwerk:</span>
                                <span className="mobile-value">{this.props.isBrewingStatusStale ? 'Unbekannt' : (brewingStatus?.hardware?.agitator === 'ON' ? 'An' : 'Aus')}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Laufzeit:</span>
                                <span className="mobile-value">{brewingStatus?.elapsedTime != null ? TimeFormatter.formatSecondsToHMS(brewingStatus.elapsedTime) : '-'}</span>
                            </div>
                            <div className="mobile-info-block">
                                <span className="mobile-label">Zielzeit:</span>
                                <span className="mobile-value">{brewingStatus?.currentStep?.duration != null ? TimeFormatter.formatSecondsToHMS(brewingStatus.currentStep.duration) : '-'}</span>
                            </div>
                        </div>
                        <div className="mobile-status-block">
                            <span className="mobile-label">Status:</span>
                            <div className="mobile-status-value">{statusText || '-'}</div>
                        </div>
                        {confirmationRequest && (
                            <div className="mobile-confirmation-wrapper">
                                <ControlConfirmationNotice request={confirmationRequest} pending={this.props.isConfirmPending} errorMessage={this.props.confirmError} onConfirm={this.confirmCurrentWaitingState} />
                            </div>
                        )}
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
                {activeTab === 'settings' && (
                    <SettingsPage />
                )}
                </main>
            </div>
        );
    }
}

const MobileActiveFinishedBrewViewLazy = React.lazy(() => import('../MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.connect'));
