import React from 'react';
import './Header.css';
import {Views} from "../../../enums/eViews";
import StatusDisplay from './StatusDisplay';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import {BrewingStatus} from '../../../model/brewingStatus.types';
import {equipmentAlarmDisplay, heaterStuckOnAlarmDisplay, isEquipmentAlarmActive, isHeaterStuckOnAlarmActive} from '../../../utils/brewingStatus/alarmDisplay';
import {isProcessActive} from '../../../utils/brewingStatus/selectors';
import {getUiMode} from '../../../utils/uiMode';
import {getNavigationViews} from '../../../utils/viewConfig';
import {UiMode} from '../../../enums/eUiMode';
import ModalDialog, {DialogType} from '../../../components/ModalDialog/ModalDialog';
import {SystemRepository} from '../../../repositorys/SystemRepository';
import {RealtimeControllerState} from '../../../model/RealtimeControllerState';
import {getAlarmSnapshot} from '../../Production/utils/productionStatus';
import {getTemperatureSensorMessage} from '../../../utils/temperatureSensor';
import {Warning} from '../../../model/Warning';
import {getWarningHeaderText} from '../../../utils/warningDisplay';



interface HeaderProps {
    setViewState: (viewState: Views) => void;
    currentView: Views;
    messages?: string[];
    removeAllMessages: () => void;
    backendStatus: boolean;
    brewingStatus?: BrewingStatus;
    realtimeState?: RealtimeControllerState;
    socketConnected?: boolean;
    warnings?: Warning[];
    warningsReceived?: boolean;
}

interface HeaderState {
    currentTime: string;
    currentDate: string;
    showShutdownDialog: boolean;
    shutdownState: 'idle' | 'pending' | 'success' | 'error';
}

export class Header extends React.Component<HeaderProps, HeaderState> {
    private timer: NodeJS.Timer | undefined;
    private shutdownRequestPending = false;

    constructor(props: HeaderProps) {
        super(props);
            this.state = {
                currentTime: this.getCurrentTimeString(),
                currentDate: this.getCurrentDateString(),
                showShutdownDialog: false,
                shutdownState: 'idle',
            };
    }

    componentDidMount() {
        this.timer = setInterval(() => {
            this.setState({
                currentTime: this.getCurrentTimeString(),
                currentDate: this.getCurrentDateString(),
            });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.timer) clearInterval(this.timer);
    }

    getCurrentTimeString = () => {
        const now = new Date();
        return now.toLocaleTimeString('de-DE', { hour12: false });
    }

    getCurrentDateString = () => {
        const now = new Date();
        return now.toLocaleDateString('de-DE');
    }

    handleIconClick = (viewState: Views) => {
        const{setViewState} = this.props;
        setViewState(viewState);
    }

    handleShutdownConfirmed = async () => {
        if (this.shutdownRequestPending || this.state.shutdownState === 'success') return;

        this.shutdownRequestPending = true;
        this.setState({shutdownState: 'pending'});
        try {
            await SystemRepository.shutdown();
            this.setState({shutdownState: 'success'});
        } catch (error) {
            console.error('Herunterfahren des Brauhauses fehlgeschlagen', error);
            this.shutdownRequestPending = false;
            this.setState({shutdownState: 'error'});
        }
    }

    openShutdownDialog = () => {
        if (!this.shutdownRequestPending && this.state.shutdownState !== 'success') {
            this.setState({showShutdownDialog: true, shutdownState: 'idle'});
        }
    }

    closeShutdownDialog = () => {
        if (!this.shutdownRequestPending) {
            this.setState({showShutdownDialog: false, shutdownState: 'idle'});
        }
    }

    // Hilfsfunktion, um die aktiven Tab-Klassen zu bestimmen
    getTabClassName = (view: Views) => {
        return `icon ${this.props.currentView === view ? 'active' : ''}`;
    }

    render() {
       const { messages = [] , removeAllMessages, backendStatus, brewingStatus } = this.props; // Default-Wert für messages ist ein leeres Array
       const alarms = getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected);
       const alarmText = isHeaterStuckOnAlarmActive(alarms)
           ? heaterStuckOnAlarmDisplay.headerText
           : isEquipmentAlarmActive(alarms) ? equipmentAlarmDisplay.headerText : undefined;
       const warningText = this.props.socketConnected && this.props.warningsReceived
           ? getWarningHeaderText(this.props.warnings)
           : undefined;
       const temperatureSensor = this.props.realtimeState?.temperatureSensor;
       // Keep the technical sensor state as a compatibility fallback until all
       // controller versions provide warning-state-changed snapshots.
       const sensorWarning = !warningText && (!this.props.socketConnected || temperatureSensor?.health !== 'OK')
           ? `⚠ Temperatursensor: ${getTemperatureSensorMessage(temperatureSensor)}`
           : undefined;
       const priorityMessage = alarmText ?? warningText ?? sensorWarning;
       const prioritySeverity = alarmText ? 'alarm' : priorityMessage ? 'warning' : undefined;
       const uiMode = getUiMode();
       const navigationViews = getNavigationViews(uiMode);
       const isVisible = (view: Views) => navigationViews.includes(view);
       const shutdownMessage = isProcessActive(brewingStatus)
           ? 'Die Steuerung und der Raspberry Pi werden beendet.\n\n⚠ Ein Brauvorgang läuft gerade. Beim Herunterfahren wird die Steuerung beendet.'
           : 'Die Steuerung und der Raspberry Pi werden beendet.';
       const shutdownDialogContent = this.state.shutdownState === 'success'
           ? 'Brauhaus wird heruntergefahren …'
           : this.state.shutdownState === 'error'
               ? 'Das System konnte nicht heruntergefahren werden.'
               : this.state.shutdownState === 'pending'
                   ? 'Herunterfahren wird gestartet …'
                   : shutdownMessage;

        return (
            <div className="Header">
                <div className="icons-container">
                    {isVisible(Views.DASHBOARD) && <button
                        type="button"
                        className={this.getTabClassName(Views.DASHBOARD)}
                        onClick={() => this.handleIconClick(Views.DASHBOARD)}
                        title="Dashboard"
                        aria-label="Dashboard"
                    >
                        <DashboardIcon fontSize="inherit" />
                    </button>}
                    {isVisible(Views.MAIN) && <img
                        src="beer.png"
                        alt={uiMode === UiMode.CONTROLLER ? 'Bierliste' : 'Icon 1'}
                        className={this.getTabClassName(Views.MAIN)}
                        onClick={() => this.handleIconClick(Views.MAIN)}
                        title={uiMode === UiMode.CONTROLLER ? 'Bierliste' : 'Hauptansicht'}
                    />}
                    {isVisible(Views.PRODUCTION) && <img
                        src="brewing.png"
                        alt="Icon 2"
                        className={this.getTabClassName(Views.PRODUCTION)}
                        onClick={() => this.handleIconClick(Views.PRODUCTION)}
                        title="Produktion"
                    />}
                    {isVisible(Views.DATABASE) && <img
                        src="bar.png"
                        alt="Icon 3"
                        className={this.getTabClassName(Views.DATABASE)}
                        onClick={() => this.handleIconClick(Views.DATABASE)}
                        title="Datenbank"
                    />}
                    {isVisible(Views.FINISHED_BREWS) && <img
                        src="beer-55.gif"
                        alt="Fertige Sude"
                        className={this.getTabClassName(Views.FINISHED_BREWS)}
                        onClick={() => this.handleIconClick(Views.FINISHED_BREWS)}
                        title="Fertige Sude"
                    />}
                    {isVisible(Views.BREWING_CALCULATIONS) && <img
                        src="brewing.png" // Korrektur des Pfades, "/" entfernt
                        alt="Berechnungen"
                        className={this.getTabClassName(Views.BREWING_CALCULATIONS)}
                        onClick={() => this.handleIconClick(Views.BREWING_CALCULATIONS)}
                        title="Bierbrau-Berechnungen"
                    />}
                    {isVisible(Views.INGREDIENTS) && <img
                        src="brewery.png"
                        alt="Zutaten"
                        className={this.getTabClassName(Views.INGREDIENTS)}
                        onClick={() => this.handleIconClick(Views.INGREDIENTS)}
                        title="Zutaten verwalten"
                    />}
                    {isVisible(Views.SETTINGS) && <img
                        src="settings.png"
                        alt="Einstellungen"
                        className={this.getTabClassName(Views.SETTINGS)}
                        onClick={() => this.handleIconClick(Views.SETTINGS)}
                        title="Einstellungen"
                        role="button"
                        aria-label="Einstellungen"
                    />}
                    {isVisible(Views.VERSION) && <button
                        type="button"
                        className={this.getTabClassName(Views.VERSION)}
                        onClick={() => this.handleIconClick(Views.VERSION)}
                        title="Version"
                        aria-label="Version"
                    >
                        i
                    </button>}
                </div>
                <div className="header-status">
                  <div className="status-display-wrapper">
                    <StatusDisplay
                      backendStatus={backendStatus}
                      messages={messages}
                      priorityMessage={priorityMessage}
                      prioritySeverity={prioritySeverity}
                      disableScrollAnimation={true}
                      removeAllMessages={removeAllMessages}
                    />
                  </div>
                  <div className="time">
                    <span>{this.state.currentDate}</span>
                    <span>{this.state.currentTime}</span>
                  </div>
                  <button
                    type="button"
                    className="icon shutdown-button"
                    onClick={this.openShutdownDialog}
                    disabled={this.state.shutdownState === 'pending' || this.state.shutdownState === 'success'}
                    title="Brauhaus herunterfahren"
                    aria-label="Brauhaus herunterfahren"
                  >
                    <PowerSettingsNewIcon fontSize="inherit" />
                  </button>
                </div>
                <ModalDialog
                  type={this.state.shutdownState === 'error' ? DialogType.ERROR : DialogType.INFO}
                  open={this.state.showShutdownDialog}
                  header="Brauhaus herunterfahren?"
                  content={shutdownDialogContent}
                  showCancelButton={this.state.shutdownState === 'idle' || this.state.shutdownState === 'pending'}
                  cancelLabel="Abbrechen"
                  confirmLabel={this.state.shutdownState === 'error' ? 'Schließen' : 'Herunterfahren'}
                  confirmColor="error"
                  confirmVariant="contained"
                  actionsDisabled={this.state.shutdownState === 'pending'}
                  showConfirmButton={this.state.shutdownState !== 'success'}
                  disableClose={this.state.shutdownState === 'pending' || this.state.shutdownState === 'success'}
                  onCancel={this.closeShutdownDialog}
                  onConfirm={this.state.shutdownState === 'error' ? this.closeShutdownDialog : this.handleShutdownConfirmed}
                />
            </div>

        );
    }
}
