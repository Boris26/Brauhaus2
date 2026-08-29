import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AGITATOR_SETTINGS_SPEED_DEBOUNCE_MS, SettingsPage } from './SettingsPage';
import { AudioRepository } from '../../repositorys/AudioRepository';
import { SoundType } from '../../enums/eSoundType';
import {AgitatorSettingsRepository} from '../../repositorys/AgitatorSettingsRepository';

jest.mock('../../repositorys/AudioRepository');
jest.mock('../../repositorys/AgitatorSettingsRepository');

const mockedTestSound = AudioRepository.testSound as jest.MockedFunction<typeof AudioRepository.testSound>;
const mockedGetAgitatorSettings = AgitatorSettingsRepository.get as jest.MockedFunction<typeof AgitatorSettingsRepository.get>;
const mockedUpdateAgitatorSettings = AgitatorSettingsRepository.update as jest.MockedFunction<typeof AgitatorSettingsRepository.update>;

const renderSettings = (debug = true, setDebug = jest.fn()) => render(
    <SettingsPage theme="default" setTheme={jest.fn()} debug={debug} setDebug={setDebug} />
);

describe('Settings sound tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedTestSound.mockResolvedValue();
        mockedGetAgitatorSettings.mockResolvedValue({speedPercent: 32, runningMinutes: 2, breakMinutes: 7});
        mockedUpdateAgitatorSettings.mockImplementation(async (settings) => settings);
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

describe('Settings agitator defaults', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedTestSound.mockResolvedValue();
        mockedGetAgitatorSettings.mockResolvedValue({speedPercent: 32, runningMinutes: 2, breakMinutes: 7});
        mockedUpdateAgitatorSettings.mockImplementation(async (settings) => settings);
    });

    const loadSettings = async () => {
        renderSettings(false);
        await screen.findByText('32 %');
    };

    const step = async (testId: string, name: RegExp) => {
        fireEvent.mouseDown(within(screen.getByTestId(testId)).getByRole('button', {name}));
        fireEvent.mouseUp(within(screen.getByTestId(testId)).getByRole('button', {name}));
        await waitFor(() => expect(mockedUpdateAgitatorSettings).toHaveBeenCalled());
    };

    it('shows exactly the values returned by the controller and has no UI defaults', async () => {
        mockedGetAgitatorSettings.mockResolvedValueOnce({speedPercent: 40, runningMinutes: 3, breakMinutes: 9});
        renderSettings(false);

        expect(await screen.findByText('40 %')).toBeInTheDocument();
        expect(within(screen.getByTestId('settings-running-minutes-stepper')).getByText('3')).toBeInTheDocument();
        expect(within(screen.getByTestId('settings-break-minutes-stepper')).getByText('9')).toBeInTheDocument();
        expect(screen.queryByText('25 %')).not.toBeInTheDocument();
    });

    it.each<[string, RegExp, {speedPercent: number; runningMinutes: number; breakMinutes: number}]>([
        ['settings-running-minutes-stepper', /Laufzeit erhöhen/, {speedPercent: 32, runningMinutes: 3, breakMinutes: 7}],
        ['settings-running-minutes-stepper', /Laufzeit verringern/, {speedPercent: 32, runningMinutes: 1, breakMinutes: 7}],
        ['settings-break-minutes-stepper', /Pausenzeit erhöhen/, {speedPercent: 32, runningMinutes: 2, breakMinutes: 8}],
        ['settings-break-minutes-stepper', /Pausenzeit verringern/, {speedPercent: 32, runningMinutes: 2, breakMinutes: 6}],
    ])('sends the complete configuration for %s %s', async (testId, buttonName, expected) => {
        await loadSettings();
        await step(testId, buttonName);
        expect(mockedUpdateAgitatorSettings).toHaveBeenCalledWith(expected);
    });

    it('does not decrement below zero or permit a zero/zero interval', async () => {
        mockedGetAgitatorSettings.mockResolvedValueOnce({speedPercent: 32, runningMinutes: 0, breakMinutes: 1});
        renderSettings(false);
        await screen.findByText('32 %');

        fireEvent.mouseDown(within(screen.getByTestId('settings-running-minutes-stepper')).getByRole('button', {name: /verringern/}));
        fireEvent.mouseDown(within(screen.getByTestId('settings-break-minutes-stepper')).getByRole('button', {name: /verringern/}));
        expect(mockedUpdateAgitatorSettings).not.toHaveBeenCalled();
    });

    it('debounces speed changes and adopts the controller-confirmed response', async () => {
        mockedUpdateAgitatorSettings.mockResolvedValueOnce({speedPercent: 41, runningMinutes: 4, breakMinutes: 8});
        await loadSettings();
        jest.useFakeTimers();
        const slider = screen.getByRole('slider', {name: 'Standard-Geschwindigkeit'});

        fireEvent.change(slider, {target: {value: '40'}});
        expect(screen.getByText('40 %')).toBeInTheDocument();
        expect(mockedUpdateAgitatorSettings).not.toHaveBeenCalled();
        await act(async () => {
            jest.advanceTimersByTime(AGITATOR_SETTINGS_SPEED_DEBOUNCE_MS);
            await Promise.resolve();
        });

        expect(mockedUpdateAgitatorSettings).toHaveBeenCalledWith({speedPercent: 40, runningMinutes: 2, breakMinutes: 7});
        expect(screen.getByText('41 %')).toBeInTheDocument();
        expect(within(screen.getByTestId('settings-running-minutes-stepper')).getByText('4')).toBeInTheDocument();
        jest.useRealTimers();
    });

    it('rolls back an unconfirmed value after a failed PUT', async () => {
        mockedUpdateAgitatorSettings.mockRejectedValueOnce(new Error('failed'));
        await loadSettings();
        await step('settings-running-minutes-stepper', /Laufzeit erhöhen/);

        expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht gespeichert werden');
        expect(within(screen.getByTestId('settings-running-minutes-stepper')).getByText('2')).toBeInTheDocument();
    });

    it('shows a loading/error state without invented values and retries GET', async () => {
        mockedGetAgitatorSettings.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({speedPercent: 37, runningMinutes: 2, breakMinutes: 8});
        renderSettings(false);

        expect(screen.getByText(/werden geladen/)).toBeInTheDocument();
        expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden');
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Erneut versuchen'}));
        expect(await screen.findByText('37 %')).toBeInTheDocument();
        expect(mockedGetAgitatorSettings).toHaveBeenCalledTimes(2);
    });

    it('loads controller values again after remounting the page', async () => {
        const first = renderSettings(false);
        await screen.findByText('32 %');
        first.unmount();
        mockedGetAgitatorSettings.mockResolvedValueOnce({speedPercent: 35, runningMinutes: 5, breakMinutes: 6});

        renderSettings(false);
        expect(await screen.findByText('35 %')).toBeInTheDocument();
        expect(mockedGetAgitatorSettings).toHaveBeenCalledTimes(2);
    });
});
