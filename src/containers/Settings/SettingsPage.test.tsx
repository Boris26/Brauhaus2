import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { AudioRepository } from '../../repositorys/AudioRepository';
import { SoundType } from '../../enums/eSoundType';

jest.mock('../../repositorys/AudioRepository');

const mockedTestSound = AudioRepository.testSound as jest.MockedFunction<typeof AudioRepository.testSound>;

const renderSettings = (debug = true, setDebug = jest.fn()) => render(
    <SettingsPage theme="default" setTheme={jest.fn()} debug={debug} setDebug={setDebug} />
);

describe('Settings sound tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedTestSound.mockResolvedValue();
    });

    it('hides sound tests outside debug mode and enables debug centrally', () => {
        const setDebug = jest.fn();
        renderSettings(false, setDebug);

        expect(screen.queryByText('Sounds')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Debug-Modus' }));
        expect(setDebug).toHaveBeenCalledWith(true);
    });

    it('renders all six user-friendly sound labels', () => {
        renderSettings();

        ['Alarm', 'Warnung', 'Bestätigung', 'Rast beendet', 'Brauvorgang beendet', 'Erfolgreich']
            .forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    });

    it('passes the selected logical sound values to the repository', async () => {
        renderSettings();

        fireEvent.click(screen.getByRole('button', { name: 'Alarm testen' }));
        await waitFor(() => expect(mockedTestSound).toHaveBeenCalledWith(SoundType.ALARM));

        fireEvent.click(screen.getByRole('button', { name: 'Brauvorgang beendet testen' }));
        await waitFor(() => expect(mockedTestSound).toHaveBeenCalledWith(SoundType.BREW_FINISHED));
    });

    it('disables every sound button and prevents parallel requests while playing', async () => {
        let resolveRequest!: () => void;
        mockedTestSound.mockImplementationOnce(() => new Promise<void>((resolve) => {
            resolveRequest = resolve;
        }));
        renderSettings();

        const alarmButton = screen.getByRole('button', { name: 'Alarm testen' });
        fireEvent.click(alarmButton);
        fireEvent.click(screen.getByRole('button', { name: 'Warnung testen' }));

        expect(screen.getAllByRole('button', { name: /testen$/i })).toHaveLength(6);
        screen.getAllByRole('button', { name: /testen$/i }).forEach((button) => expect(button).toBeDisabled());
        expect(alarmButton).toHaveTextContent('Wird abgespielt…');
        expect(mockedTestSound).toHaveBeenCalledTimes(1);

        resolveRequest();
        await waitFor(() => expect(alarmButton).toBeEnabled());
    });

    it('shows an error, clears loading, and allows retrying', async () => {
        mockedTestSound.mockRejectedValueOnce(new Error('playback failed')).mockResolvedValueOnce();
        renderSettings();

        const warningButton = screen.getByRole('button', { name: 'Warnung testen' });
        fireEvent.click(warningButton);

        expect(await screen.findByRole('alert')).toHaveTextContent('Sound konnte nicht abgespielt werden.');
        await waitFor(() => expect(warningButton).toBeEnabled());

        fireEvent.click(warningButton);
        await waitFor(() => expect(mockedTestSound).toHaveBeenCalledTimes(2));
    });
});
