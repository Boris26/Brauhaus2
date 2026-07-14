import fs from 'fs';
import path from 'path';
import vm from 'vm';

type Listener = (event: any) => void;

const loadServiceWorker = () => {
    const listeners: Record<string, Listener> = {};
    const showNotification = jest.fn().mockResolvedValue(undefined);
    const matchAll = jest.fn().mockResolvedValue([]);
    const openWindow = jest.fn().mockResolvedValue(undefined);
    const context: any = {
        console: {
            debug: jest.fn(),
            error: jest.fn(),
        },
        URL,
    };
    context.self = {
        location: { origin: 'https://192.168.178.72' },
        registration: { showNotification },
        clients: {
            claim: jest.fn().mockResolvedValue(undefined),
            matchAll,
            openWindow,
        },
        addEventListener: (type: string, listener: Listener) => {
            listeners[type] = listener;
        },
    };

    const serviceWorkerPath = path.resolve(__dirname, '../../public/service-worker.js');
    const code = fs.readFileSync(serviceWorkerPath, 'utf8');
    vm.runInNewContext(code, context);

    return { listeners, showNotification, matchAll, openWindow, context };
};

describe('service-worker push handling', () => {
    it('shows a notification for a valid JSON payload and binds the promise to waitUntil', async () => {
        const { listeners, showNotification } = loadServiceWorker();
        const waitUntil = jest.fn();
        const data = {
            title: 'Abmaischen',
            body: 'Bitte bestätigen.',
            url: '/production?step=6',
            tag: 'brew-confirmation-6',
            data: { waitingFor: 'MASHING_OUT_CONFIRMATION' },
        };

        listeners.push({
            data: { json: () => data },
            waitUntil,
        });

        expect(showNotification).toHaveBeenCalledWith('Abmaischen', expect.objectContaining({
            body: 'Bitte bestätigen.',
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: 'brew-confirmation-6',
            renotify: true,
            data: expect.objectContaining({
                url: '/production?step=6',
                waitingFor: 'MASHING_OUT_CONFIRMATION',
                serviceWorkerVersion: 'brauhaus-push-v2',
            }),
        }));
        expect(waitUntil).toHaveBeenCalledTimes(1);
        await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
    });

    it('shows a fallback notification for invalid payloads', () => {
        const { listeners, showNotification, context } = loadServiceWorker();
        const waitUntil = jest.fn();

        listeners.push({
            data: { json: () => { throw new Error('invalid json'); } },
            waitUntil,
        });

        expect(context.console.error).toHaveBeenCalledWith('[ServiceWorker] Push payload parsing failed', expect.any(Error));
        expect(showNotification).toHaveBeenCalledWith('Brauhaus', expect.objectContaining({
            body: 'Eine neue Brauhaus-Benachrichtigung ist eingegangen.',
            tag: 'brauhaus-push',
            data: expect.objectContaining({ url: '/' }),
        }));
        expect(waitUntil).toHaveBeenCalledTimes(1);
    });

    it('shows a fallback notification for empty payloads without requiring an open client', () => {
        const { listeners, showNotification, matchAll } = loadServiceWorker();
        const waitUntil = jest.fn();

        listeners.push({ waitUntil });

        expect(showNotification).toHaveBeenCalledWith('Brauhaus', expect.objectContaining({
            body: 'Eine neue Brauhaus-Benachrichtigung ist eingegangen.',
        }));
        expect(matchAll).not.toHaveBeenCalled();
        expect(waitUntil).toHaveBeenCalledTimes(1);
    });

    it('focuses an existing same-origin window on notification click', async () => {
        const { listeners, matchAll, openWindow } = loadServiceWorker();
        const focus = jest.fn().mockResolvedValue(undefined);
        matchAll.mockResolvedValue([{ url: 'https://192.168.178.72/', focus }]);
        const waitUntil = jest.fn();
        const close = jest.fn();

        listeners.notificationclick({
            notification: { close, data: { url: '/production' } },
            waitUntil,
        });

        expect(close).toHaveBeenCalledTimes(1);
        expect(waitUntil).toHaveBeenCalledTimes(1);
        await waitUntil.mock.calls[0][0];
        expect(focus).toHaveBeenCalledTimes(1);
        expect(openWindow).not.toHaveBeenCalled();
    });

    it('opens only same-origin fallback URLs when no client exists', async () => {
        const { listeners, matchAll, openWindow } = loadServiceWorker();
        matchAll.mockResolvedValue([]);
        const waitUntil = jest.fn();

        listeners.notificationclick({
            notification: { close: jest.fn(), data: { url: 'https://example.invalid/phishing' } },
            waitUntil,
        });

        await waitUntil.mock.calls[0][0];
        expect(openWindow).toHaveBeenCalledWith('/');
    });
});
