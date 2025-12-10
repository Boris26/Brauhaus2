import React, { useMemo, useState } from 'react';
import { connect } from 'react-redux';
import './SettingsPage.css';
import { ThemeName } from '../../utils/theme';
import { ApplicationActions } from '../../actions/actions';

interface SettingsPageProps {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ theme, setTheme }) => {
    const [autoConnect, setAutoConnect] = useState<boolean>(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
    const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const activeThemeLabel = useMemo(() => theme === 'dark-alt' ? 'Dunkles Theme' : 'Helles Theme', [theme]);

    const handleThemeChange = (nextTheme: ThemeName) => {
        setTheme(nextTheme);
        setStatusMessage(`Theme auf "${nextTheme === 'dark-alt' ? 'dunkel' : 'hell'}" aktualisiert.`);
    };

    const handleSave = () => {
        setStatusMessage('Einstellungen gespeichert.');
    };

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
                    <span className="status-label">{activeThemeLabel}</span>
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
                                onClick={() => handleThemeChange('default')}
                            >
                                Helles Theme
                            </button>
                            <button
                                className={`settings-chip ${theme === 'dark-alt' ? 'active' : ''}`}
                                type="button"
                                onClick={() => handleThemeChange('dark-alt')}
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
                                onChange={(event) => setNotificationsEnabled(event.target.checked)}
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
                                onChange={(event) => setAutoConnect(event.target.checked)}
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
                            onChange={(event) => setTemperatureUnit(event.target.value as 'celsius' | 'fahrenheit')}
                        >
                            <option value="celsius">Celsius (°C)</option>
                            <option value="fahrenheit">Fahrenheit (°F)</option>
                        </select>
                    </div>
                </section>
            </div>

            <footer className="settings-footer">
                <button className="settings-primary" type="button" onClick={handleSave}>
                    Einstellungen speichern
                </button>
                <p className="settings-hint">Alle Änderungen lassen sich jederzeit zurücksetzen.</p>
            </footer>
        </div>
    );
};

const mapStateToProps = (state: any) => ({
    theme: state.applicationReducer.theme as ThemeName,
});

const mapDispatchToProps = (dispatch: any) => ({
    setTheme: (theme: ThemeName) => dispatch(ApplicationActions.setTheme(theme)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPage);
