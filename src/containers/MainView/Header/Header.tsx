import React from 'react';
import { connect } from 'react-redux';
import './Header.css';
import {Views} from "../../../enums/eViews";
import {ApplicationActions} from "../../../actions/actions";
import setViewState = ApplicationActions.setViewState;
import StatusDisplay from './StatusDisplay';



interface HeaderProps {
    setViewState: (viewState: Views) => void;
    currentView: Views;
    messages?: string[];
    removeAllMessages: () => void;
    backendStatus: boolean;
}

interface HeaderState {
    currentTime: string;
    currentDate: string;
}

class Header extends React.Component<HeaderProps, HeaderState> {
    private timer: NodeJS.Timer | undefined;

    constructor(props: HeaderProps) {
        super(props);
            this.state = {
                currentTime: this.getCurrentTimeString(),
                currentDate: this.getCurrentDateString(),
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

    // Hilfsfunktion, um die aktiven Tab-Klassen zu bestimmen
    getTabClassName = (view: Views) => {
        return `icon ${this.props.currentView === view ? 'active' : ''}`;
    }

    render() {
       const { messages = [] , removeAllMessages, backendStatus } = this.props; // Default-Wert für messages ist ein leeres Array

        return (
            <div className="Header">
                <div className="header-left">
                  <h1>Brauhaus</h1>
                </div>
                <div className="icons-container">
                    <img
                        src="beer.png"
                        alt="Icon 1"
                        className={this.getTabClassName(Views.MAIN)}
                        onClick={() => this.handleIconClick(Views.MAIN)}
                        title="Hauptansicht"
                    />
                    <img
                        src="brewing.png"
                        alt="Icon 2"
                        className={this.getTabClassName(Views.PRODUCTION)}
                        onClick={() => this.handleIconClick(Views.PRODUCTION)}
                        title="Produktion"
                    />
                    <img
                        src="bar.png"
                        alt="Icon 3"
                        className={this.getTabClassName(Views.DATABASE)}
                        onClick={() => this.handleIconClick(Views.DATABASE)}
                        title="Datenbank"
                    />
                    <img
                        src="beer-55.gif"
                        alt="Fertige Sude"
                        className={this.getTabClassName(Views.FINISHED_BREWS)}
                        onClick={() => this.handleIconClick(Views.FINISHED_BREWS)}
                        title="Fertige Sude"
                    />
                    <img
                        src="brewing.png" // Korrektur des Pfades, "/" entfernt
                        alt="Berechnungen"
                        className={this.getTabClassName(Views.BREWING_CALCULATIONS)}
                        onClick={() => this.handleIconClick(Views.BREWING_CALCULATIONS)}
                        title="Bierbrau-Berechnungen"
                    />
                    <img
                        src="brewery.png"
                        alt="Zutaten"
                        className={this.getTabClassName(Views.INGREDIENTS)}
                        onClick={() => this.handleIconClick(Views.INGREDIENTS)}
                        title="Zutaten verwalten"
                    />
                    <img
                        src="settings.png"
                        alt="Einstellungen"
                        className={this.getTabClassName(Views.SETTINGS)}
                        onClick={() => this.handleIconClick(Views.SETTINGS)}
                        title="Einstellungen"
                        role="button"
                        aria-label="Einstellungen"
                    />
                </div>
                <div className="header-status">
                  <div className="status-display-wrapper">
                    <StatusDisplay backendStatus={backendStatus} messages={messages} disableScrollAnimation={true} removeAllMessages={removeAllMessages}/>
                  </div>
                  <div className="time">
                    <span>{this.state.currentDate}</span>
                    <span>{this.state.currentTime}</span>
                  </div>
                </div>
            </div>

        );
    }
}

const mapStateToProps = (state: any) => ({
    currentView: state.applicationReducer.view,
    messages: state.applicationReducer.message,
    backendStatus: state.productionReducer.isBackenAvailable,
});

const mapDispatchToProps = (dispatch: any) => ({
    setViewState: (viewState: Views) => dispatch(setViewState(viewState)),
    removeAllMessages: () => dispatch(ApplicationActions.removeMessage()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
