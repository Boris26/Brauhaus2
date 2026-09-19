import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {FermentationNotificationSettings} from './FermentationNotificationSettings';
import {FermentationNotificationSettingsRepository} from '../../../../repositorys/FermentationNotificationSettingsRepository';

jest.mock('../../../../repositorys/FermentationNotificationSettingsRepository');
const repository = FermentationNotificationSettingsRepository as jest.Mocked<typeof FermentationNotificationSettingsRepository>;
const backendSettings = {fermentationActionWarningSeconds: 10800, fermentationActionReminderIntervalSeconds: 7200};

describe('FermentationNotificationSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        repository.getSettings.mockResolvedValue(backendSettings);
        repository.update.mockImplementation(async (update) => ({...backendSettings, ...update}));
    });

    const open = async () => {
        render(<FermentationNotificationSettings/>);
        expect(repository.getSettings).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', {name: /Gärungsbenachrichtigungen/}));
        await screen.findByDisplayValue('3');
    };

    it('loads GET config values and displays 3 and 2 hours without frontend defaults', async () => {
        await open();
        expect(screen.getByLabelText('Vorwarnzeit')).toHaveValue(3);
        expect(screen.getByLabelText('Erinnerungsintervall')).toHaveValue(2);
        expect(screen.getAllByRole('combobox')).toHaveLength(2);
        screen.getAllByRole('combobox').forEach((select) => expect(select).toHaveValue('hours'));
    });

    it('sends only a changed 6-hour warning with the exact backend field name', async () => {
        repository.update.mockResolvedValueOnce({...backendSettings, fermentationActionWarningSeconds: 21600});
        await open();
        fireEvent.change(screen.getByLabelText('Vorwarnzeit'), {target: {value: '6'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(repository.update).toHaveBeenCalledWith({fermentationActionWarningSeconds: 21600}));
        expect(screen.getByLabelText('Vorwarnzeit')).toHaveValue(6);
    });

    it('converts a changed 30-minute reminder and adopts the canonical response', async () => {
        repository.update.mockResolvedValueOnce({fermentationActionWarningSeconds: 14400, fermentationActionReminderIntervalSeconds: 1800});
        await open();
        fireEvent.change(screen.getByLabelText('Einheit für Erinnerungsintervall'), {target: {value: 'minutes'}});
        fireEvent.change(screen.getByLabelText('Erinnerungsintervall'), {target: {value: '30'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(repository.update).toHaveBeenCalledWith({fermentationActionReminderIntervalSeconds: 1800}));
        expect(screen.getByLabelText('Vorwarnzeit')).toHaveValue(4);
        expect(screen.getByLabelText('Erinnerungsintervall')).toHaveValue(30);
    });

    it('allows warning zero but prevents reminder zero', async () => {
        await open();
        fireEvent.change(screen.getByLabelText('Vorwarnzeit'), {target: {value: '0'}});
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeEnabled();
        fireEvent.change(screen.getByLabelText('Erinnerungsintervall'), {target: {value: '0'}});
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('größer als 0');
    });

    it('keeps the draft and does not show success after a failed save', async () => {
        const onSaved = jest.fn();
        repository.update.mockRejectedValueOnce({response: {data: {error: {message: 'Backend-Validierung'}}}});
        render(<FermentationNotificationSettings onSaved={onSaved}/>);
        fireEvent.click(screen.getByRole('button', {name: /Gärungsbenachrichtigungen/}));
        fireEvent.change(await screen.findByLabelText('Vorwarnzeit'), {target: {value: '6'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('Backend-Validierung');
        expect(screen.getByLabelText('Vorwarnzeit')).toHaveValue(6);
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('offers retry after a failed load and never renders invented values', async () => {
        repository.getSettings.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(backendSettings);
        render(<FermentationNotificationSettings/>);
        fireEvent.click(screen.getByRole('button', {name: /Gärungsbenachrichtigungen/}));
        const alert = await screen.findByRole('alert');
        expect(within(alert.closest('div')!).queryByRole('spinbutton')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Erneut versuchen'}));
        expect(await screen.findByDisplayValue('3')).toBeInTheDocument();
    });
});
