import React from 'react';
import { connect } from 'react-redux';
import './SettingsPage.css';
import { ThemeName } from '../../utils/theme';
import { ApplicationActions } from '../../actions/actions';

interface SettingsPageProps {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
}

interface SettingsPageState {
    autoConnect: boolean;
    notificationsEnabled: boolean;
    temperatureUnit: 'celsius' | 'fahrenheit';
    statusMessage: string | null;
}

class SettingsPage extends React.Component<SettingsPageProps, SettingsPageState> {
    constructor(props: SettingsPageProps) {
        super(props);

        this.state = {
            autoConnect: true,
            notificationsEnabled: false,
            temperatureUnit: 'celsius',
            statusMessage: null,
        };
    }

    get activeThemeLabel() {
        return this.props.theme === 'dark-alt' ? 'Dunkles Theme' : 'Helles Theme';
    }

    handleThemeChange = (nextTheme: ThemeName) => {
        this.props.setTheme(nextTheme);
        this.setState({
            statusMessage: `Theme auf "${nextTheme === 'dark-alt' ? 'dunkel' : 'hell'}" aktualisiert.`,
        });
    };

    handleSave = () => {
        this.setState({ statusMessage: 'Einstellungen gespeichert.' });
    };

    handleNotificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ notificationsEnabled: event.target.checked });
    };

    handleAutoConnectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ autoConnect: event.target.checked });
    };

    handleTemperatureUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ temperatureUnit: event.target.value as 'celsius' | 'fahrenheit' });
    };

    render() {
        const { theme } = this.props;
        const { autoConnect, notificationsEnabled, temperatureUnit, statusMessage } = this.state;

        return (
            <div className="settings-page">
                <header className="settings-header">
                    <div>
                        <p className="settings-eyebrow">Neue Seite</p>
                        <h2>Einstellungen</h2>
                        <p className="settings-subtitle">
                            Passe das Verhalten der Anwendung an und speichere deine persönlichen Vorlieben.
                        </p>
                    </div>
                    <div className="settings-status">
                        <span className="status-dot" aria-hidden="true"></span>
                        <span className="status-label">{this.activeThemeLabel}</span>
                    </div>
                </header>

                {statusMessage && (
                    <div className="settings-message" role="status" aria-live="polite">
                        {statusMessage}
                    </div>
                )}

                <div className="settings-grid">
                    <section className="settings-card">
                        <div className="settings-card-header">
                            <h3>Darstellung</h3>
                            <p>Steuere das aktive Theme der Oberfläche.</p>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label>Theme auswählen</label>
                                <span className="setting-description">Wechsle jederzeit zwischen heller und dunkler Ansicht.</span>
                            </div>
                            <div className="setting-options">
                                <button
                                    className={`settings-chip ${theme === 'default' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => this.handleThemeChange('default')}
                                >
                                    Helles Theme
                                </button>
                                <button
                                    className={`settings-chip ${theme === 'dark-alt' ? 'active' : ''}`}
                                    type="button"
                                    onClick={() => this.handleThemeChange('dark-alt')}
                                >
                                    Dunkles Theme
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card">
                        <div className="settings-card-header">
                            <h3>Benachrichtigungen</h3>
                            <p>Kontrolliere, ob Hinweistexte automatisch angezeigt werden sollen.</p>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="notifications">Systemmeldungen</label>
                                <span className="setting-description">Zeige Hinweise direkt in der Statusleiste an.</span>
                            </div>
                            <div className="setting-toggle">
                                <input
                                    id="notifications"
                                    type="checkbox"
                                    checked={notificationsEnabled}
                                    onChange={this.handleNotificationChange}
                                />
                                <label htmlFor="notifications">{notificationsEnabled ? 'Aktiviert' : 'Deaktiviert'}</label>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card">
                        <div className="settings-card-header">
                            <h3>Verbindung</h3>
                            <p>Steuere Hintergrundaktionen zum Abruf der Produktionsdaten.</p>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="autoconnect">Automatisch verbinden</label>
                                <span className="setting-description">Startet die Synchronisation unmittelbar nach dem Laden.</span>
                            </div>
                            <div className="setting-toggle">
                                <input
                                    id="autoconnect"
                                    type="checkbox"
                                    checked={autoConnect}
                                    onChange={this.handleAutoConnectChange}
                                />
                                <label htmlFor="autoconnect">{autoConnect ? 'Aktiviert' : 'Deaktiviert'}</label>
                            </div>
                        </div>

                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="temperature-unit">Temperatureinheit</label>
                                <span className="setting-description">Lege fest, in welcher Einheit Werte angezeigt werden.</span>
                            </div>
                            <select
                                id="temperature-unit"
                                className="settings-select"
                                value={temperatureUnit}
                                onChange={this.handleTemperatureUnitChange}
                            >
                                <option value="celsius">Celsius (°C)</option>
                                <option value="fahrenheit">Fahrenheit (°F)</option>
                            </select>
                        </div>
                    </section>
                </div>

                <footer className="settings-footer">
                    <button className="settings-primary" type="button" onClick={this.handleSave}>
                        Einstellungen speichern
                    </button>
                    <p className="settings-hint">Alle Änderungen lassen sich jederzeit zurücksetzen.</p>
                </footer>
            </div>
        );
    }
}

const mapStateToProps = (state: any) => ({
    theme: state.applicationReducer.theme as ThemeName,
});

const mapDispatchToProps = (dispatch: any) => ({
    setTheme: (theme: ThemeName) => dispatch(ApplicationActions.setTheme(theme)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPage);
