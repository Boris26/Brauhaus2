import React from 'react';
import './Header.css';
import {Views} from "../../../enums/eViews";
import StatusDisplay from './StatusDisplay/StatusDisplay';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SportsBarOutlinedIcon from '@mui/icons-material/SportsBarOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import LocalDrinkOutlinedIcon from '@mui/icons-material/LocalDrinkOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
import {FermentationGatewaySensorStatus} from '../../../model/Fermentation';
import {getFermentationGatewayWarning} from '../../../utils/fermentationGatewayStatus';

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
    fermentationGatewayConnected?: boolean;
    fermentationGatewaySensors?: Record<string, FermentationGatewaySensorStatus>;
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
            this.setState({currentTime: this.getCurrentTimeString(), currentDate: this.getCurrentDateString()});
        }, 1000);
    }

    componentWillUnmount() {
        if (this.timer) clearInterval(this.timer);
    }

    getCurrentTimeString = () => new Date().toLocaleTimeString('de-DE', {hour12: false});
    getCurrentDateString = () => new Date().toLocaleDateString('de-DE');

    handleIconClick = (viewState: Views) => this.props.setViewState(viewState);

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
    };

    openShutdownDialog = () => {
        if (!this.shutdownRequestPending && this.state.shutdownState !== 'success') this.setState({showShutdownDialog: true, shutdownState: 'idle'});
    };

    closeShutdownDialog = () => {
        if (!this.shutdownRequestPending) this.setState({showShutdownDialog: false, shutdownState: 'idle'});
    };

    getTabClassName = (view: Views) => `icon ${this.props.currentView === view ? 'active' : ''}`;

    renderNavButton = (view: Views, title: string, icon: React.ReactNode) => (
        <button
            type="button"
            className={this.getTabClassName(view)}
            onClick={() => this.handleIconClick(view)}
            title={title}
            aria-label={title}
        >
            {icon}
        </button>
    );

    render() {
        const {messages = [], removeAllMessages, backendStatus, brewingStatus} = this.props;
        const alarms = getAlarmSnapshot(this.props.realtimeState, this.props.socketConnected);
        const alarmText = isHeaterStuckOnAlarmActive(alarms)
            ? heaterStuckOnAlarmDisplay.headerText
            : isEquipmentAlarmActive(alarms) ? equipmentAlarmDisplay.headerText : undefined;
        const warningText = this.props.socketConnected && this.props.warningsReceived ? getWarningHeaderText(this.props.warnings) : undefined;
        const temperatureSensor = this.props.realtimeState?.temperatureSensor;
        const fermentationGatewayWarning = this.props.fermentationGatewayConnected === undefined ? undefined : getFermentationGatewayWarning(
            this.props.fermentationGatewayConnected,
            this.props.fermentationGatewaySensors || {},
        );
        const sensorWarning = !warningText && (!this.props.socketConnected || temperatureSensor?.health !== 'OK')
            ? `⚠ Temperatursensor: ${getTemperatureSensorMessage(temperatureSensor)}`
            : undefined;
        const priorityMessage = alarmText ?? warningText ?? fermentationGatewayWarning ?? sensorWarning;
        const prioritySeverity = alarmText ? 'alarm' : priorityMessage ? 'warning' : undefined;
        const uiMode = getUiMode();
        const navigationViews = getNavigationViews(uiMode);
        const isVisible = (view: Views) => navigationViews.includes(view);
        const mainTitle = uiMode === UiMode.CONTROLLER ? 'Bierliste' : 'Hauptansicht';
        const shutdownMessage = isProcessActive(brewingStatus)
            ? 'Die Steuerung und der Raspberry Pi werden beendet.\n\n⚠ Ein Brauvorgang läuft gerade. Beim Herunterfahren wird die Steuerung beendet.'
            : 'Die Steuerung und der Raspberry Pi werden beendet.';
        const shutdownDialogContent = this.state.shutdownState === 'success'
            ? 'Brauhaus wird heruntergefahren …'
            : this.state.shutdownState === 'error'
                ? 'Das System konnte nicht heruntergefahren werden.'
                : this.state.shutdownState === 'pending' ? 'Herunterfahren wird gestartet …' : shutdownMessage;

        return (
            <div className="Header">
                <nav className="icons-container" aria-label="Hauptnavigation">
                    {isVisible(Views.DASHBOARD) && this.renderNavButton(Views.DASHBOARD, 'Dashboard', <DashboardOutlinedIcon />)}
                    {isVisible(Views.MAIN) && this.renderNavButton(Views.MAIN, mainTitle, <SportsBarOutlinedIcon />)}
                    {isVisible(Views.PRODUCTION) && this.renderNavButton(Views.PRODUCTION, 'Produktion', <PrecisionManufacturingOutlinedIcon />)}
                    {isVisible(Views.DATABASE) && this.renderNavButton(Views.DATABASE, 'Datenbank', <StorageOutlinedIcon />)}
                    {isVisible(Views.FINISHED_BREWS) && this.renderNavButton(Views.FINISHED_BREWS, 'Fertige Sude', <LocalDrinkOutlinedIcon />)}
                    {isVisible(Views.BREWING_CALCULATIONS) && this.renderNavButton(Views.BREWING_CALCULATIONS, 'Bierbrau-Berechnungen', <CalculateOutlinedIcon />)}
                    {isVisible(Views.INGREDIENTS) && this.renderNavButton(Views.INGREDIENTS, 'Zutaten verwalten', <ScienceOutlinedIcon />)}
                    {isVisible(Views.SETTINGS) && this.renderNavButton(Views.SETTINGS, 'Einstellungen', <SettingsOutlinedIcon />)}
                    {isVisible(Views.VERSION) && this.renderNavButton(Views.VERSION, 'Version', <InfoOutlinedIcon />)}
                </nav>
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
                    <div className="time" aria-label={`${this.state.currentDate} ${this.state.currentTime}`}>
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
                        <PowerSettingsNewIcon />
                    </button>
                </div>
                <ModalDialog
                    type={this.state.shutdownState === 'error' ? DialogType.ERROR : this.state.shutdownState === 'pending' || this.state.shutdownState === 'success' ? DialogType.PROGRESS : DialogType.CONFIRM}
                    open={this.state.showShutdownDialog}
                    header={this.state.shutdownState === 'pending' || this.state.shutdownState === 'success' ? 'Braumeister wird heruntergefahren' : 'Brauhaus herunterfahren?'}
                    content={shutdownDialogContent}
                    showCancelButton={this.state.shutdownState === 'idle'}
                    cancelLabel="Abbrechen"
                    confirmLabel={this.state.shutdownState === 'error' ? 'Schließen' : 'Herunterfahren'}
                    confirmColor="error"
                    confirmVariant="contained"
                    actionsDisabled={this.state.shutdownState === 'pending'}
                    showConfirmButton={this.state.shutdownState === 'idle' || this.state.shutdownState === 'error'}
                    disableClose={this.state.shutdownState === 'pending' || this.state.shutdownState === 'success'}
                    onCancel={this.closeShutdownDialog}
                    onConfirm={this.state.shutdownState === 'error' ? this.closeShutdownDialog : this.handleShutdownConfirmed}
                />
            </div>
        );
    }
}
