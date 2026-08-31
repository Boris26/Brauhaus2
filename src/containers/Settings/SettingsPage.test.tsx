import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { AudioRepository } from '../../repositorys/AudioRepository';
import { SoundType } from '../../enums/eSoundType';
import {AgitatorSettingsRepository} from '../../repositorys/AgitatorSettingsRepository';
import {PushService} from '../../utils/pushService';

jest.mock('../../repositorys/AudioRepository');
jest.mock('../../repositorys/AgitatorSettingsRepository');
jest.mock('../../utils/pushService', () => ({
    isPushSupported: jest.fn(() => true),
    getPermissionState: jest.fn(() => 'granted'),
    PushService: {
        getSubscription: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        sendTestNotification: jest.fn(),
    },
}));

const mockedTestSound = AudioRepository.testSound as jest.MockedFunction<typeof AudioRepository.testSound>;
const mockedGetAgitatorSettings = AgitatorSettingsRepository.get as jest.MockedFunction<typeof AgitatorSettingsRepository.get>;
const mockedUpdateAgitatorSettings = AgitatorSettingsRepository.update as jest.MockedFunction<typeof AgitatorSettingsRepository.update>;
const mockedPushService = PushService as jest.Mocked<typeof PushService>;

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((promiseResolve) => {
        resolve = promiseResolve;
    });
    return {promise, resolve};
};

const renderSettings = (debug = true, setDebug = jest.fn()) => render(
    <SettingsPage theme="default" setTheme={jest.fn()} debug={debug} setDebug={setDebug} />
);

describe('Settings sound tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedTestSound.mockResolvedValue();
        mockedGetAgitatorSettings.mockResolvedValue({speed: 32, intervalOnMinutes: 2.5, intervalOffMinutes: 7});
        mockedUpdateAgitatorSettings.mockImplementation(async (settings) => settings);
        mockedPushService.getSubscription.mockResolvedValue(null);
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
        mockedGetAgitatorSettings.mockResolvedValue({speed: 32, intervalOnMinutes: 2.5, intervalOffMinutes: 7});
        mockedUpdateAgitatorSettings.mockImplementation(async (settings) => settings);
        mockedPushService.getSubscription.mockResolvedValue(null);
    });

    it('loads and displays the complete controller snapshot without frontend defaults', async () => {
        renderSettings(false);
        expect(mockedGetAgitatorSettings).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/werden geladen/)).toBeInTheDocument();
        expect(await screen.findByDisplayValue('32')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
        expect(screen.getByDisplayValue('7')).toBeInTheDocument();
    });

    it('retries a failed GET without displaying invented values', async () => {
        mockedGetAgitatorSettings.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({speed: 37, intervalOnMinutes: 2, intervalOffMinutes: 8});
        renderSettings(false);
        expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden');
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Erneut versuchen'}));
        expect(await screen.findByDisplayValue('37')).toBeInTheDocument();
        expect(mockedGetAgitatorSettings).toHaveBeenCalledTimes(2);
    });

    it('PUTs exactly all three fields in minutes and adopts the response', async () => {
        mockedUpdateAgitatorSettings.mockResolvedValueOnce({speed: 41, intervalOnMinutes: 4.25, intervalOffMinutes: 8.5});
        renderSettings(false);
        const speed = await screen.findByLabelText('Geschwindigkeit');
        fireEvent.change(speed, {target: {value: '40'}});
        fireEvent.change(screen.getByLabelText('Laufzeit'), {target: {value: '3.5'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        await waitFor(() => expect(mockedUpdateAgitatorSettings).toHaveBeenCalledWith({speed: 40, intervalOnMinutes: 3.5, intervalOffMinutes: 7}));
        expect(await screen.findByDisplayValue('41')).toBeInTheDocument();
        expect(screen.getByDisplayValue('4.25')).toBeInTheDocument();
        expect(screen.getByDisplayValue('8.5')).toBeInTheDocument();
    });

    it('keeps edited values and shows a backend PUT error', async () => {
        mockedUpdateAgitatorSettings.mockRejectedValueOnce({response: {data: {error: 'Ungültige Werte'}}});
        renderSettings(false);
        fireEvent.change(await screen.findByLabelText('Pausenzeit'), {target: {value: '3.75'}});
        fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
        expect(await screen.findByRole('alert')).toHaveTextContent('Ungültige Werte');
        expect(screen.getByDisplayValue('3.75')).toBeInTheDocument();
    });

    it('prevents invalid integer speed and non-positive intervals', async () => {
        renderSettings(false);
        fireEvent.change(await screen.findByLabelText('Geschwindigkeit'), {target: {value: '20.5'}});
        expect(screen.getByRole('button', {name: 'Speichern'})).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Ganzzahl');
        expect(mockedUpdateAgitatorSettings).not.toHaveBeenCalled();
    });

    it('adopts socket snapshots when clean without another GET', async () => {
        const view = render(<SettingsPage theme="default" setTheme={jest.fn()} debug={false} setDebug={jest.fn()} />);
        await screen.findByDisplayValue('32');
        view.rerender(<SettingsPage theme="default" setTheme={jest.fn()} debug={false} setDebug={jest.fn()} agitatorDefaultsSnapshot={{speed: 75, intervalOnMinutes: 5, intervalOffMinutes: 2}} />);
        expect(screen.getByDisplayValue('75')).toBeInTheDocument();
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
        expect(mockedGetAgitatorSettings).toHaveBeenCalledTimes(1);
    });

    it('does not silently overwrite dirty inputs with a socket snapshot', async () => {
        const view = render(<SettingsPage theme="default" setTheme={jest.fn()} debug={false} setDebug={jest.fn()} />);
        fireEvent.change(await screen.findByLabelText('Geschwindigkeit'), {target: {value: '44'}});
        view.rerender(<SettingsPage theme="default" setTheme={jest.fn()} debug={false} setDebug={jest.fn()} agitatorDefaultsSnapshot={{speed: 75, intervalOnMinutes: 5, intervalOffMinutes: 2}} />);
        expect(screen.getByDisplayValue('44')).toBeInTheDocument();
        expect(screen.getByText(/extern geändert/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Externe Werte übernehmen'}));
        expect(screen.getByDisplayValue('75')).toBeInTheDocument();
    });
});

describe('Settings async lifecycle', () => {
    let page: SettingsPage | null = null;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockedGetAgitatorSettings.mockResolvedValue({speed: 32, intervalOnMinutes: 2.5, intervalOffMinutes: 7});
        mockedPushService.getSubscription.mockResolvedValue(null);
    });

    const renderWithRef = () => render(
        <SettingsPage ref={(instance) => { page = instance; }} theme="default" setTheme={jest.fn()} debug setDebug={jest.fn()} />
    );

    const expectNoPostUnmountState = async (start: () => Promise<void>, settle: () => void) => {
        const view = renderWithRef();
        await waitFor(() => expect(mockedGetAgitatorSettings).toHaveBeenCalled());
        const instance = page!;
        const setState = jest.spyOn(instance, 'setState');
        const request = start();
        view.unmount();
        setState.mockClear();
        settle();
        await request;
        expect(setState).not.toHaveBeenCalled();
    };

    it('does not update state after unmount during a push-state refresh', async () => {
        const request = deferred<PushSubscription | null>();
        mockedPushService.getSubscription.mockReturnValue(request.promise);
        await expectNoPostUnmountState(() => page!.refreshPushState(), () => request.resolve(null));
    });

    it('does not update state after unmount during a push toggle', async () => {
        const request = deferred<PushSubscription>();
        mockedPushService.subscribe.mockReturnValue(request.promise);
        await expectNoPostUnmountState(() => page!.handlePushToggle(), () => request.resolve({} as PushSubscription));
    });

    it('does not update state after unmount during a push test', async () => {
        const request = deferred<void>();
        mockedPushService.sendTestNotification.mockReturnValue(request.promise);
        await expectNoPostUnmountState(() => page!.handlePushTest(), () => request.resolve());
    });

    it('does not update state after unmount during a sound test', async () => {
        const request = deferred<void>();
        mockedTestSound.mockReturnValue(request.promise);
        await expectNoPostUnmountState(() => page!.handleSoundTest(SoundType.ALARM), () => request.resolve());
    });
});
