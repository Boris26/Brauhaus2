import axios from 'axios';
import { getPermissionState, isPushSupported, subscribe, unsubscribe, urlBase64ToUint8Array } from './pushService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const originalNotification = window.Notification;

const defineNavigatorProperty = (name: string, value: unknown) => {
    Object.defineProperty(navigator, name, {
        configurable: true,
        value,
    });
};

const defineWindowProperty = (name: string, value: unknown) => {
    Object.defineProperty(window, name, {
        configurable: true,
        value,
    });
};

describe('pushService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        defineNavigatorProperty('serviceWorker', undefined);
        defineWindowProperty('PushManager', undefined);
        defineWindowProperty('Notification', originalNotification);
    });

    it('detects unsupported browsers', () => {
        expect(isPushSupported()).toBe(false);
        expect(getPermissionState()).toBe('default');
    });

    it('converts base64url public keys to Uint8Array', () => {
        expect(Array.from(urlBase64ToUint8Array('AQIDBA'))).toEqual([1, 2, 3, 4]);
    });

    it('requests permission only while subscribing and registers the subscription at the backend', async () => {
        const requestPermission = jest.fn().mockResolvedValue('granted');
        const subscription = {
            endpoint: 'https://push.example/subscription-1',
            toJSON: () => ({
                endpoint: 'https://push.example/subscription-1',
                keys: { p256dh: 'key', auth: 'auth' },
            }),
            unsubscribe: jest.fn(),
        };
        const pushManager = {
            getSubscription: jest.fn().mockResolvedValue(null),
            subscribe: jest.fn().mockResolvedValue(subscription),
        };

        defineWindowProperty('Notification', {
            permission: 'default',
            requestPermission,
        });
        defineWindowProperty('PushManager', function PushManager() {});
        defineNavigatorProperty('serviceWorker', {
            ready: Promise.resolve({ pushManager }),
        });
        mockedAxios.get.mockResolvedValue({ data: { publicKey: 'AQIDBA' } });
        mockedAxios.post.mockResolvedValue({ status: 201 });

        expect(requestPermission).not.toHaveBeenCalled();

        await expect(subscribe()).resolves.toBe(subscription as unknown as PushSubscription);

        expect(requestPermission).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/controller/push/public-key');
        expect(pushManager.subscribe).toHaveBeenCalledWith({
            userVisibleOnly: true,
            applicationServerKey: new Uint8Array([1, 2, 3, 4]),
        });
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/controller/push/subscriptions', {
            endpoint: 'https://push.example/subscription-1',
            keys: { p256dh: 'key', auth: 'auth' },
        });
    });


    it('reuses an existing subscription from navigator.serviceWorker.ready and registers it at the backend', async () => {
        const requestPermission = jest.fn();
        const subscription = {
            endpoint: 'https://push.example/existing',
            toJSON: () => ({
                endpoint: 'https://push.example/existing',
                keys: { p256dh: 'existing-key', auth: 'existing-auth' },
            }),
            unsubscribe: jest.fn(),
        };
        const pushManager = {
            getSubscription: jest.fn().mockResolvedValue(subscription),
            subscribe: jest.fn(),
        };

        defineWindowProperty('Notification', { permission: 'granted', requestPermission });
        defineWindowProperty('PushManager', function PushManager() {});
        defineNavigatorProperty('serviceWorker', {
            ready: Promise.resolve({ pushManager }),
        });
        mockedAxios.post.mockResolvedValue({ status: 201 });

        await expect(subscribe()).resolves.toBe(subscription as unknown as PushSubscription);

        expect(pushManager.getSubscription).toHaveBeenCalledTimes(1);
        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(requestPermission).not.toHaveBeenCalled();
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/controller/push/subscriptions', {
            endpoint: 'https://push.example/existing',
            keys: { p256dh: 'existing-key', auth: 'existing-auth' },
        });
    });

    it('does not resolve as active when backend registration of an existing subscription fails', async () => {
        const subscription = {
            endpoint: 'https://push.example/existing',
            toJSON: () => ({ endpoint: 'https://push.example/existing' }),
            unsubscribe: jest.fn(),
        };
        defineWindowProperty('Notification', { permission: 'granted', requestPermission: jest.fn() });
        defineWindowProperty('PushManager', function PushManager() {});
        defineNavigatorProperty('serviceWorker', {
            ready: Promise.resolve({
                pushManager: {
                    getSubscription: jest.fn().mockResolvedValue(subscription),
                    subscribe: jest.fn(),
                },
            }),
        });
        mockedAxios.post.mockRejectedValue(new Error('backend unavailable'));

        await expect(subscribe()).rejects.toThrow('backend unavailable');
    });

    it('does not request permission when permission is denied', async () => {
        const requestPermission = jest.fn();
        defineWindowProperty('Notification', {
            permission: 'denied',
            requestPermission,
        });
        defineWindowProperty('PushManager', function PushManager() {});
        defineNavigatorProperty('serviceWorker', {
            ready: Promise.resolve({
                pushManager: {
                    getSubscription: jest.fn().mockResolvedValue(null),
                },
            }),
        });

        await expect(subscribe()).rejects.toThrow('blockiert');
        expect(requestPermission).not.toHaveBeenCalled();
    });

    it('removes backend and local subscriptions while unsubscribing', async () => {
        const unsubscribeLocal = jest.fn().mockResolvedValue(true);
        const subscription = {
            endpoint: 'https://push.example/subscription-1',
            toJSON: () => ({ endpoint: 'https://push.example/subscription-1' }),
            unsubscribe: unsubscribeLocal,
        };
        defineWindowProperty('Notification', { permission: 'granted', requestPermission: jest.fn() });
        defineWindowProperty('PushManager', function PushManager() {});
        defineNavigatorProperty('serviceWorker', {
            ready: Promise.resolve({
                pushManager: {
                    getSubscription: jest.fn().mockResolvedValue(subscription),
                },
            }),
        });
        mockedAxios.delete.mockResolvedValue({ status: 204 });

        await unsubscribe();

        expect(mockedAxios.delete).toHaveBeenCalledWith('/api/controller/push/subscriptions', {
            data: { endpoint: 'https://push.example/subscription-1' },
        });
        expect(unsubscribeLocal).toHaveBeenCalledTimes(1);
    });
});
