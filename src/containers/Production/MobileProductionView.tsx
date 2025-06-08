import React from 'react';
import { connect } from 'react-redux';
import './MobileProductionView.css';
import { BrewingStatus } from '../../model/BrewingStatus';
import { ProductionActions } from '../../actions/actions';
import { TimeFormatter } from "../../utils/TimeFormatter";

interface MobileProductionViewProps {
    temperature: number;
    brewingStatus: BrewingStatus;
    startPolling: () => void;
    isPollingRunning: boolean;
}

class MobileProductionView extends React.Component<MobileProductionViewProps> {
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

    render() {
        const { brewingStatus, startPolling, isPollingRunning } = this.props;
        const statusText = brewingStatus?.Name;
        return (
            <div className="mobile-production-container">
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
            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    temperature: state.productionReducer.temperature,
    brewingStatus: state.productionReducer.brewingStatus,
    isPollingRunning: state.productionReducer.isPollingRunning
});

const mapDispatchToProps = (dispatch: any) => ({
    startPolling: () => dispatch(ProductionActions.startPolling())
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileProductionView);
