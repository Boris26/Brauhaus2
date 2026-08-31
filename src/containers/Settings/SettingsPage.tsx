import React from 'react';
import './SettingsPage.css';
import { ThemeName } from '../../utils/theme';
import { PushService, getPermissionState, isPushSupported } from '../../utils/pushService';
import { AudioRepository } from '../../repositorys/AudioRepository';
import { SOUND_LABELS, SOUND_TYPES, SoundType } from '../../enums/eSoundType';
import { UiMode } from '../../enums/eUiMode';
import { getUiMode, setUiMode } from '../../utils/uiMode';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import {AgitatorSettings} from '../../model/AgitatorSettings';
import {AgitatorSettingsRepository} from '../../repositorys/AgitatorSettingsRepository';
import '../../components/Controlls/QuantityPicker/QuantityPicker.css';

interface SettingsPageProps {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    debug: boolean;
    setDebug: (debug: boolean) => void;
    agitatorDefaultsSnapshot?: AgitatorSettings;
}

interface SettingsPageState {
    autoConnect: boolean;
    notificationsEnabled: boolean;
    temperatureUnit: 'celsius' | 'fahrenheit';
    statusMessage: string | null;
    pushSupported: boolean;
    pushPermission: NotificationPermission;
    pushSubscribed: boolean;
    pushLoading: boolean;
    pushError: string | null;
    soundPlaying: SoundType | null;
    soundError: string | null;
    agitatorSettings?: AgitatorSettings;
    agitatorDraft?: {speed: string; intervalOnMinutes: string; intervalOffMinutes: string};
    pendingAgitatorSnapshot?: AgitatorSettings;
    agitatorLoading: boolean;
    agitatorSaving: boolean;
    agitatorError: string | null;
}

export class SettingsPage extends React.Component<SettingsPageProps, SettingsPageState> {
    constructor(props: SettingsPageProps) {
        super(props);

        this.state = {
            autoConnect: true,
            notificationsEnabled: false,
            temperatureUnit: 'celsius',
            statusMessage: null,
            pushSupported: isPushSupported(),
            pushPermission: getPermissionState(),
            pushSubscribed: false,
            pushLoading: false,
            pushError: null,
            soundPlaying: null,
            soundError: null,
            agitatorSettings: undefined,
            agitatorDraft: undefined,
            pendingAgitatorSnapshot: undefined,
            agitatorLoading: true,
            agitatorSaving: false,
            agitatorError: null,
        };
    }

    private soundRequestActive = false;
    private isMountedComponent = false;

    componentDidMount() {
        this.isMountedComponent = true;
        this.refreshPushState();
        void this.loadAgitatorSettings();
    }

    componentWillUnmount() {
        this.isMountedComponent = false;
    }

    componentDidUpdate(previousProps: SettingsPageProps) {
        const snapshot = this.props.agitatorDefaultsSnapshot;
        if (snapshot && snapshot !== previousProps.agitatorDefaultsSnapshot) {
            if (this.isAgitatorDirty()) {
                this.setState({pendingAgitatorSnapshot: snapshot});
            } else {
                this.adoptAgitatorSettings(snapshot);
            }
        }
    }

    private draftFor = (settings: AgitatorSettings) => ({
        speed: String(settings.speed),
        intervalOnMinutes: String(settings.intervalOnMinutes),
        intervalOffMinutes: String(settings.intervalOffMinutes),
    });

    private adoptAgitatorSettings = (settings: AgitatorSettings) => this.setState({
        agitatorSettings: settings,
        agitatorDraft: this.draftFor(settings),
        pendingAgitatorSnapshot: undefined,
        agitatorError: null,
    });

    private isAgitatorDirty = () => {
        const {agitatorSettings, agitatorDraft} = this.state;
        return Boolean(agitatorSettings && agitatorDraft && (
            agitatorDraft.speed !== String(agitatorSettings.speed)
            || agitatorDraft.intervalOnMinutes !== String(agitatorSettings.intervalOnMinutes)
            || agitatorDraft.intervalOffMinutes !== String(agitatorSettings.intervalOffMinutes)
        ));
    };

    loadAgitatorSettings = async () => {
        this.setState({agitatorLoading: true, agitatorError: null, agitatorSettings: undefined, agitatorDraft: undefined, pendingAgitatorSnapshot: undefined});
        try {
            const settings = await AgitatorSettingsRepository.get();
            if (this.isMountedComponent) this.setState({agitatorSettings: settings, agitatorDraft: this.draftFor(settings), agitatorLoading: false});
        } catch (error) {
            if (this.isMountedComponent) this.setState({
                agitatorSettings: undefined,
                agitatorDraft: undefined,
                agitatorLoading: false,
                agitatorError: 'Rührwerk-Standardwerte konnten nicht geladen werden.',
            });
        }
    };

    private agitatorValidationError = (): string | null => {
        const draft = this.state.agitatorDraft;
        if (!draft) return 'Keine Controllerwerte geladen.';
        if (!draft.speed.trim() || !draft.intervalOnMinutes.trim() || !draft.intervalOffMinutes.trim()) return 'Alle drei Werte sind erforderlich.';
        const speed = Number(draft.speed);
        const on = Number(draft.intervalOnMinutes);
        const off = Number(draft.intervalOffMinutes);
        if (!Number.isInteger(speed) || speed < 0 || speed > 100) return 'Geschwindigkeit muss eine Ganzzahl zwischen 0 und 100 sein.';
        if (!Number.isFinite(on) || on <= 0) return 'Intervall EIN muss größer als 0 sein.';
        if (!Number.isFinite(off) || off <= 0) return 'Intervall AUS muss größer als 0 sein.';
        return null;
    };

    saveAgitatorSettings = async () => {
        const draft = this.state.agitatorDraft;
        const validationError = this.agitatorValidationError();
        if (!draft || validationError || this.state.agitatorSaving) return;
        const settings: AgitatorSettings = {
            speed: Number(draft.speed),
            intervalOnMinutes: Number(draft.intervalOnMinutes),
            intervalOffMinutes: Number(draft.intervalOffMinutes),
        };
        this.setState({agitatorSaving: true, agitatorError: null});
        try {
            const confirmed = await AgitatorSettingsRepository.update(settings);
            if (this.isMountedComponent) this.setState({
                agitatorSettings: confirmed,
                agitatorDraft: this.draftFor(confirmed),
                pendingAgitatorSnapshot: undefined,
                agitatorSaving: false,
                statusMessage: 'Rührwerk-Standardwerte gespeichert.',
            });
        } catch (error: any) {
            const backendMessage = error?.response?.data?.error;
            if (this.isMountedComponent) this.setState({
                agitatorSaving: false,
                agitatorError: typeof backendMessage === 'string' && backendMessage.length > 0
                    ? backendMessage
                    : 'Rührwerk-Standardwerte konnten nicht gespeichert werden.',
            });
        }
    };

    changeAgitatorDraft = (field: keyof NonNullable<SettingsPageState['agitatorDraft']>, value: string) => {
        this.setState((state) => state.agitatorDraft ? ({
            agitatorDraft: {...state.agitatorDraft, [field]: value},
            agitatorError: null,
        }) : null);
    };

    stepAgitatorDraft = (
        field: keyof NonNullable<SettingsPageState['agitatorDraft']>,
        delta: number,
        min: number,
        max: number,
    ) => {
        const draft = this.state.agitatorDraft;
        if (!draft || this.state.agitatorSaving) return;
        const current = Number(draft[field]);
        if (!Number.isFinite(current)) return;
        const next = Math.min(max, Math.max(min, current + delta));
        this.changeAgitatorDraft(field, String(next));
    };

    refreshPushState = async () => {
        const pushSupported = isPushSupported();
        if (!pushSupported) {
            this.setState({
                pushSupported: false,
                pushPermission: getPermissionState(),
                pushSubscribed: false,
            });
            return;
        }

        try {
            const subscription = await PushService.getSubscription();
            this.setState({
                pushSupported,
                pushPermission: getPermissionState(),
                pushSubscribed: Boolean(subscription),
                pushError: null,
            });
        } catch (error) {
            this.setState({
                pushSupported,
                pushPermission: getPermissionState(),
                pushSubscribed: false,
                pushError: this.formatPushError(error),
            });
        }
    };

    formatPushError = (error: unknown): string => {
        if (error instanceof Error) {
            return error.message;
        }
        return 'Push-Benachrichtigungen konnten nicht aktualisiert werden.';
    };

    get permissionLabel(): string {
        switch (this.state.pushPermission) {
            case 'granted':
                return 'Erlaubt';
            case 'denied':
                return 'Blockiert';
            default:
                return 'Nicht angefragt';
        }
    }

    handlePushToggle = async () => {
        this.setState({ pushLoading: true, pushError: null, statusMessage: null });
        try {
            if (this.state.pushSubscribed) {
                await PushService.unsubscribe();
                this.setState({ statusMessage: 'Push-Benachrichtigungen deaktiviert.' });
            } else {
                await PushService.subscribe();
                this.setState({ statusMessage: 'Push-Benachrichtigungen aktiviert.' });
            }
            await this.refreshPushState();
        } catch (error) {
            this.setState({
                pushError: this.formatPushError(error),
                pushPermission: getPermissionState(),
            });
        } finally {
            this.setState({ pushLoading: false });
        }
    };

    handlePushTest = async () => {
        this.setState({ pushLoading: true, pushError: null, statusMessage: null });
        try {
            await PushService.sendTestNotification();
            this.setState({ statusMessage: 'Testnachricht wurde an den Controller übergeben.' });
        } catch (error) {
            this.setState({ pushError: this.formatPushError(error) });
        } finally {
            this.setState({ pushLoading: false });
        }
    };

    handleThemeChange = (nextTheme: ThemeName) => {
        this.props.setTheme(nextTheme);
        this.setState({
            statusMessage: `Theme auf "${nextTheme === 'dark-alt' ? 'dunkel' : 'hell'}" aktualisiert.`,
        });
    };

    handleUiModeChange = (nextMode: UiMode) => {
        if (nextMode === getUiMode()) return;
        setUiMode(nextMode);
        window.location.reload();
    };

    handleSoundTest = async (sound: SoundType) => {
        if (this.soundRequestActive) {
            return;
        }

        this.soundRequestActive = true;
        this.setState({ soundPlaying: sound, soundError: null });
        try {
            await AudioRepository.testSound(sound);
        } catch (error) {
            this.setState({ soundError: 'Sound konnte nicht abgespielt werden.' });
        } finally {
            this.soundRequestActive = false;
            this.setState({ soundPlaying: null });
        }
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
        const { theme, debug } = this.props;
        const { autoConnect, notificationsEnabled, temperatureUnit, statusMessage, pushSupported, pushSubscribed, pushLoading, pushError, pushPermission, soundPlaying, soundError, agitatorSettings, agitatorDraft, pendingAgitatorSnapshot, agitatorLoading, agitatorSaving, agitatorError } = this.state;

        return (
            <main className="settings-page">
                <header className="settings-header">
                    <h1>Einstellungen</h1>
                    <p className="settings-subtitle">Passe Darstellung und Verhalten der Anwendung an.</p>
                </header>

                {statusMessage && (
                    <div className="settings-message" role="status" aria-live="polite">
                        {statusMessage}
                    </div>
                )}

                <div className="settings-grid">
                    <section className="settings-card agitator-defaults-card">
                        <div className="settings-card-header">
                            <TuneOutlinedIcon aria-hidden="true" />
                            <div>
                                <h2>Rührwerk</h2>
                                <p>Persistente Standardwerte der Brausteuerung.</p>
                            </div>
                        </div>

                        {agitatorLoading && <p className="agitator-settings-state" role="status">Rührwerk-Standardwerte werden geladen…</p>}
                        {!agitatorLoading && !agitatorSettings && <div className="agitator-settings-state">
                            <p className="settings-error" role="alert">{agitatorError}</p>
                            <button className="settings-secondary" type="button" onClick={this.loadAgitatorSettings}>Erneut versuchen</button>
                        </div>}
                        {agitatorSettings && agitatorDraft && <div className="agitator-defaults-controls">
                            <div className="agitator-default-fields">
                                <label className="quantity-picker-container">
                                    <span className="quantity-picker-label">Geschwindigkeit</span>
                                    <span className="intervalTimeControl">
                                        <span className={`quantity-picker-content quantity-picker-editable ${agitatorSaving ? 'quantity-picker-content-disabled' : ''} ${this.agitatorValidationError()?.startsWith('Geschwindigkeit') ? 'quantity-picker-content-error' : ''}`}>
                                            <button className="decrement-btn" type="button" aria-label="Geschwindigkeit verringern" disabled={agitatorSaving || Number(agitatorDraft.speed) <= 0} onClick={() => this.stepAgitatorDraft('speed', -1, 0, 100)}>-</button>
                                            <input className="quantity-picker-native-input" style={{textAlign: 'center', background: 'var(--color-input-bg)'}} aria-label="Geschwindigkeit" aria-invalid={this.agitatorValidationError()?.startsWith('Geschwindigkeit')} type="number" min="0" max="100" step="1" value={agitatorDraft.speed} disabled={agitatorSaving} onChange={(event) => this.changeAgitatorDraft('speed', event.target.value)}/>
                                            <button className="increment-btn" type="button" aria-label="Geschwindigkeit erhöhen" disabled={agitatorSaving || Number(agitatorDraft.speed) >= 100} onClick={() => this.stepAgitatorDraft('speed', 1, 0, 100)}>+</button>
                                        </span>
                                        <span className="intervalTimeUnit">%</span>
                                    </span>
                                </label>
                                <label className="quantity-picker-container">
                                    <span className="quantity-picker-label">Intervall EIN</span>
                                    <span className="intervalTimeControl">
                                        <span className={`quantity-picker-content quantity-picker-editable ${agitatorSaving ? 'quantity-picker-content-disabled' : ''} ${this.agitatorValidationError()?.startsWith('Intervall EIN') ? 'quantity-picker-content-error' : ''}`}>
                                            <button className="decrement-btn" type="button" aria-label="Intervall EIN verringern" disabled={agitatorSaving || Number(agitatorDraft.intervalOnMinutes) <= 0} onClick={() => this.stepAgitatorDraft('intervalOnMinutes', -1, 0, Number.MAX_SAFE_INTEGER)}>-</button>
                                            <input className="quantity-picker-native-input" style={{textAlign: 'center', background: 'var(--color-input-bg)'}} aria-label="Intervall EIN" aria-invalid={this.agitatorValidationError()?.startsWith('Intervall EIN')} type="number" min="0" step="any" value={agitatorDraft.intervalOnMinutes} disabled={agitatorSaving} onChange={(event) => this.changeAgitatorDraft('intervalOnMinutes', event.target.value)}/>
                                            <button className="increment-btn" type="button" aria-label="Intervall EIN erhöhen" disabled={agitatorSaving} onClick={() => this.stepAgitatorDraft('intervalOnMinutes', 1, 0, Number.MAX_SAFE_INTEGER)}>+</button>
                                        </span>
                                        <span className="intervalTimeUnit">min</span>
                                    </span>
                                </label>
                                <label className="quantity-picker-container">
                                    <span className="quantity-picker-label">Intervall AUS</span>
                                    <span className="intervalTimeControl">
                                        <span className={`quantity-picker-content quantity-picker-editable ${agitatorSaving ? 'quantity-picker-content-disabled' : ''} ${this.agitatorValidationError()?.startsWith('Intervall AUS') ? 'quantity-picker-content-error' : ''}`}>
                                            <button className="decrement-btn" type="button" aria-label="Intervall AUS verringern" disabled={agitatorSaving || Number(agitatorDraft.intervalOffMinutes) <= 0} onClick={() => this.stepAgitatorDraft('intervalOffMinutes', -1, 0, Number.MAX_SAFE_INTEGER)}>-</button>
                                            <input className="quantity-picker-native-input" style={{textAlign: 'center', background: 'var(--color-input-bg)'}} aria-label="Intervall AUS" aria-invalid={this.agitatorValidationError()?.startsWith('Intervall AUS')} type="number" min="0" step="any" value={agitatorDraft.intervalOffMinutes} disabled={agitatorSaving} onChange={(event) => this.changeAgitatorDraft('intervalOffMinutes', event.target.value)}/>
                                            <button className="increment-btn" type="button" aria-label="Intervall AUS erhöhen" disabled={agitatorSaving} onClick={() => this.stepAgitatorDraft('intervalOffMinutes', 1, 0, Number.MAX_SAFE_INTEGER)}>+</button>
                                        </span>
                                        <span className="intervalTimeUnit">min</span>
                                    </span>
                                </label>
                            </div>
                            {this.agitatorValidationError() && <p className="settings-error" role="alert">{this.agitatorValidationError()}</p>}
                            {pendingAgitatorSnapshot && <div className="settings-warning" role="status">Die Controllerwerte wurden extern geändert. Deine ungespeicherten Eingaben bleiben erhalten.
                                <button className="settings-secondary" type="button" onClick={() => this.adoptAgitatorSettings(pendingAgitatorSnapshot)}>Externe Werte übernehmen</button>
                            </div>}
                            <div className="settings-actions">
                                <button className="settings-primary" type="button" onClick={this.saveAgitatorSettings} disabled={agitatorSaving || Boolean(this.agitatorValidationError()) || !this.isAgitatorDirty()}>{agitatorSaving ? 'Wird gespeichert…' : 'Speichern'}</button>
                            </div>
                            {agitatorError && <p className="settings-error" role="alert">{agitatorError}</p>}
                        </div>}
                    </section>

                    <section className="settings-card">
                        <div className="settings-card-header">
                            <PaletteOutlinedIcon aria-hidden="true" />
                            <div>
                                <h2>Oberfläche</h2>
                                <p>Darstellung und Funktionsumfang dieses Browsers.</p>
                            </div>
                        </div>

                        <div className="setting-block">
                            <div className="setting-label-group">
                                <span className="setting-label">UI-Modus</span>
                                <span className="setting-description">Desktop bietet die vollständige Verwaltung, Brausteuerung konzentriert sich auf den laufenden Sud.</span>
                            </div>
                            <div className="settings-segmented" aria-label="UI-Modus">
                                <button className={getUiMode() === UiMode.DESKTOP ? 'active' : ''} type="button" aria-pressed={getUiMode() === UiMode.DESKTOP} onClick={() => this.handleUiModeChange(UiMode.DESKTOP)}>Desktop</button>
                                <button className={getUiMode() === UiMode.CONTROLLER ? 'active' : ''} type="button" aria-pressed={getUiMode() === UiMode.CONTROLLER} onClick={() => this.handleUiModeChange(UiMode.CONTROLLER)}>Brausteuerung</button>
                            </div>
                        </div>

                        <div className="setting-block">
                            <div className="setting-label-group">
                                <span className="setting-label">Darstellung</span>
                                <span className="setting-description">Wähle das Theme der Anwendung.</span>
                            </div>
                            <div className="settings-segmented" aria-label="Darstellung">
                                <button className={theme === 'default' ? 'active' : ''} type="button" aria-pressed={theme === 'default'} onClick={() => this.handleThemeChange('default')}>Helles Theme</button>
                                <button className={theme === 'dark-alt' ? 'active' : ''} type="button" aria-pressed={theme === 'dark-alt'} onClick={() => this.handleThemeChange('dark-alt')}>Dunkles Theme</button>
                            </div>
                        </div>
                    </section>

                    <section className="settings-card">
                        <div className="settings-card-header">
                            <PrecisionManufacturingOutlinedIcon aria-hidden="true" />
                            <div>
                                <h2>Brausteuerung</h2>
                                <p>Verbindung, Messwerte und Werkzeuge für den Brauprozess.</p>
                            </div>
                        </div>

                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="debug-mode">Debug-Modus</label>
                                <span className="setting-description">Zeigt zusätzliche Funktionen für Entwicklung und Tests.</span>
                            </div>
                            <label className="settings-toggle">
                                <input id="debug-mode" type="checkbox" checked={debug} onChange={(event) => this.props.setDebug(event.target.checked)} />
                                <span aria-hidden="true"></span>
                            </label>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="autoconnect">Automatisch verbinden</label>
                                <span className="setting-description">Verbindung beim Start herstellen.</span>
                            </div>
                            <label className="settings-toggle">
                                <input id="autoconnect" type="checkbox" checked={autoConnect} onChange={this.handleAutoConnectChange} />
                                <span aria-hidden="true"></span>
                            </label>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="temperature-unit">Temperatureinheit</label>
                                <span className="setting-description">Einheit für angezeigte Messwerte.</span>
                            </div>
                            <select id="temperature-unit" className="settings-select" value={temperatureUnit} onChange={this.handleTemperatureUnitChange}>
                                <option value="celsius">Celsius °C</option>
                                <option value="fahrenheit">Fahrenheit °F</option>
                            </select>
                        </div>

                        {debug && <div className="sound-tools">
                            <div className="sound-tools-header">
                                <h3>Soundtests</h3>
                                <p>Signaltöne der Brausteuerung prüfen.</p>
                            </div>
                            {soundError && <p className="settings-error" role="alert">{soundError}</p>}
                            <div className="sound-list">
                                {SOUND_TYPES.map((sound) => (
                                    <div className="sound-row" key={sound}>
                                        <span>{SOUND_LABELS[sound]}</span>
                                        <button className="settings-secondary sound-test-button" type="button" onClick={() => this.handleSoundTest(sound)} disabled={soundPlaying !== null} aria-label={`${SOUND_LABELS[sound]} testen`}>
                                            {soundPlaying === sound ? 'Wird abgespielt…' : 'Testen'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>}
                    </section>

                    <section className="settings-card">
                        <div className="settings-card-header">
                            <NotificationsNoneOutlinedIcon aria-hidden="true" />
                            <div>
                                <h2>Benachrichtigungen</h2>
                                <p>Systemmeldungen und Hinweise aus der Brausteuerung.</p>
                            </div>
                        </div>
                        <div className="setting-row">
                            <div className="setting-label-group">
                                <label htmlFor="notifications">Systemmeldungen</label>
                                <span className="setting-description">Hinweise direkt in der Statusleiste anzeigen.</span>
                            </div>
                            <label className="settings-toggle">
                                <input id="notifications" type="checkbox" checked={notificationsEnabled} onChange={this.handleNotificationChange} />
                                <span aria-hidden="true"></span>
                            </label>
                        </div>

                        <div className="push-section">
                            <div className="push-heading">
                                <div>
                                    <h3>Push-Benachrichtigungen</h3>
                                    <p>Informiert dich, wenn der Brauvorgang eine Bestätigung benötigt.</p>
                                </div>
                                <span className={`push-state ${pushSubscribed ? 'active' : ''}`}><i aria-hidden="true"></i>{pushSubscribed ? 'Aktiv' : 'Inaktiv'}</span>
                            </div>
                            <dl className="push-status-list">
                                <div><dt>Browser</dt><dd>{pushSupported ? 'Unterstützt' : 'Nicht unterstützt'}</dd></div>
                                <div><dt>Berechtigung</dt><dd>{this.permissionLabel}</dd></div>
                                <div><dt>Subscription</dt><dd>{pushSubscribed ? 'Verbunden' : 'Nicht verbunden'}</dd></div>
                            </dl>
                            {pushPermission === 'denied' && <p className="settings-warning">Die Berechtigung ist blockiert. Bitte Push in den Browser- oder App-Einstellungen wieder erlauben.</p>}
                            {pushError && <p className="settings-error" role="alert">{pushError}</p>}
                            <div className="settings-actions">
                                <button className="settings-primary" type="button" onClick={this.handlePushToggle} disabled={!pushSupported || pushLoading || pushPermission === 'denied'}>
                                    {pushSubscribed ? 'Push-Benachrichtigungen deaktivieren' : 'Push-Benachrichtigungen aktivieren'}
                                </button>
                                <button className="settings-secondary" type="button" onClick={this.handlePushTest} disabled={!pushSubscribed || pushLoading}>Testnachricht senden</button>
                            </div>
                        </div>
                    </section>
                </div>

                <footer className="settings-footer">
                    <button className="settings-primary" type="button" onClick={this.handleSave}>Einstellungen speichern</button>
                    <p>Alle Änderungen lassen sich jederzeit anpassen.</p>
                </footer>
            </main>
        );
    }
}
