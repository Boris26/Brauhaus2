import React from 'react';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import {SettingsAccordion} from '../SettingsAccordion/SettingsAccordion';
import {SettingsNumberField} from '../SettingsNumberField/SettingsNumberField';
import {FermentationNotificationSettingsRepository} from '../../../../repositorys/FermentationNotificationSettingsRepository';
import {FermentationNotificationSettings as Settings} from '../../../../model/FermentationNotificationSettings';
import {FermentationTimeUnit, fermentationTimeToSeconds, secondsToFermentationTime} from '../../../../utils/fermentationNotificationTime';

type Field = keyof Settings;
type Draft = Record<Field, {value: string; unit: FermentationTimeUnit}>;

interface State {
    settings?: Settings;
    draft?: Draft;
    loading: boolean;
    saving: boolean;
    error: string | null;
}

const fields: Array<{field: Field; label: string; description: string}> = [
    {field: 'fermentationActionWarningSeconds', label: 'Vorwarnzeit', description: 'Wie lange vor einer geplanten Gärungsaktion eine Benachrichtigung angezeigt werden soll.'},
    {field: 'fermentationActionReminderIntervalSeconds', label: 'Erinnerungsintervall', description: 'Wie häufig nach einer fälligen Gärungsaktion erneut erinnert werden soll, solange die Zugabe nicht bestätigt wurde.'},
];

interface Props {
    onSaved?: () => void;
}

export class FermentationNotificationSettings extends React.Component<Props, State> {
    state: State = {loading: true, saving: false, error: null};
    private mounted = false;

    componentDidMount() {
        this.mounted = true;
        void this.load();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    private createDraft = (settings: Settings): Draft => ({
        fermentationActionWarningSeconds: secondsToFermentationTime(settings.fermentationActionWarningSeconds),
        fermentationActionReminderIntervalSeconds: secondsToFermentationTime(settings.fermentationActionReminderIntervalSeconds),
    });

    load = async () => {
        this.setState({loading: true, error: null, settings: undefined, draft: undefined});
        try {
            const settings = await FermentationNotificationSettingsRepository.getSettings();
            if (this.mounted) this.setState({settings, draft: this.createDraft(settings), loading: false});
        } catch {
            if (this.mounted) this.setState({loading: false, error: 'Gärungsbenachrichtigungen konnten nicht geladen werden.'});
        }
    };

    private secondsFor = (field: Field): number | null => {
        const value = this.state.draft?.[field];
        return value ? fermentationTimeToSeconds(value.value, value.unit) : null;
    };

    private validationError = (): string | null => {
        const warning = this.secondsFor('fermentationActionWarningSeconds');
        const reminder = this.secondsFor('fermentationActionReminderIntervalSeconds');
        if (warning === null || warning < 0) return 'Die Vorwarnzeit muss 0 oder größer sein und ganzen Sekunden entsprechen.';
        if (reminder === null || reminder <= 0) return 'Das Erinnerungsintervall muss größer als 0 sein und ganzen Sekunden entsprechen.';
        return null;
    };

    private isDirty = () => Boolean(this.state.settings && (
        this.secondsFor('fermentationActionWarningSeconds') !== this.state.settings.fermentationActionWarningSeconds
        || this.secondsFor('fermentationActionReminderIntervalSeconds') !== this.state.settings.fermentationActionReminderIntervalSeconds
    ));

    private updateDraft = (field: Field, update: Partial<Draft[Field]>) => {
        this.setState((state) => state.draft ? ({draft: {...state.draft, [field]: {...state.draft[field], ...update}}, error: null}) : null);
    };

    private changeUnit = (field: Field, unit: FermentationTimeUnit) => {
        const seconds = this.secondsFor(field);
        const divisor = unit === 'hours' ? 3600 : 60;
        this.updateDraft(field, {unit, value: seconds === null ? this.state.draft![field].value : String(seconds / divisor)});
    };

    save = async () => {
        if (this.state.saving || this.validationError()) return;
        const warning = this.secondsFor('fermentationActionWarningSeconds')!;
        const reminder = this.secondsFor('fermentationActionReminderIntervalSeconds')!;
        this.setState({saving: true, error: null});
        try {
            const update: Partial<Settings> = {};
            if (warning !== this.state.settings?.fermentationActionWarningSeconds) update.fermentationActionWarningSeconds = warning;
            if (reminder !== this.state.settings?.fermentationActionReminderIntervalSeconds) update.fermentationActionReminderIntervalSeconds = reminder;
            const confirmed = await FermentationNotificationSettingsRepository.update(update);
            if (this.mounted) this.setState({settings: confirmed, draft: this.createDraft(confirmed), saving: false}, this.props.onSaved);
        } catch (error: any) {
            const data = error?.response?.data;
            const message = data?.error?.message ?? data?.error ?? data?.message ?? data?.detail;
            if (this.mounted) this.setState({saving: false, error: typeof message === 'string' && message.trim() ? message : 'Gärungsbenachrichtigungen konnten nicht gespeichert werden.'});
        }
    };

    render() {
        const {loading, settings, draft, saving, error} = this.state;
        const validationError = draft ? this.validationError() : null;
        return <SettingsAccordion icon={<NotificationsActiveOutlinedIcon/>} title="Gärungsbenachrichtigungen" description="Zeitpunkte für Hinweise zu geplanten Gärungsaktionen.">
            {loading && <p className="agitator-settings-state" role="status">Gärungsbenachrichtigungen werden geladen…</p>}
            {!loading && !settings && <div className="agitator-settings-state"><p className="settings-error" role="alert">{error}</p><button className="settings-secondary" type="button" onClick={this.load}>Erneut versuchen</button></div>}
            {settings && draft && <div className="operational-fields fermentation-notification-fields">
                {fields.map(({field, label, description}) => <div className="fermentation-time-field" key={field}>
                    <SettingsNumberField value={draft[field].value} label={label} description={description} step={draft[field].unit === 'hours' ? 1 : 30} min={0} disabled={saving} invalid={field === 'fermentationActionWarningSeconds' ? this.secondsFor(field) === null || this.secondsFor(field)! < 0 : this.secondsFor(field) === null || this.secondsFor(field)! <= 0} onChange={(value) => this.updateDraft(field, {value})}/>
                    <label className="fermentation-unit-label">Einheit<span className="visually-hidden"> für {label}</span><select className="settings-select fermentation-unit-select" aria-label={`Einheit für ${label}`} value={draft[field].unit} disabled={saving} onChange={(event) => this.changeUnit(field, event.target.value as FermentationTimeUnit)}><option value="minutes">Minuten</option><option value="hours">Stunden</option></select></label>
                </div>)}
                {validationError && <p className="settings-error" role="alert">{validationError}</p>}
                {error && <p className="settings-error" role="alert">{error}</p>}
                <div className="settings-actions"><button className="settings-primary" type="button" disabled={saving || Boolean(validationError) || !this.isDirty()} onClick={this.save}>{saving ? 'Wird gespeichert…' : 'Speichern'}</button></div>
            </div>}
        </SettingsAccordion>;
    }
}
