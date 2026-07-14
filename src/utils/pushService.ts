import axios from 'axios';
import { BaseURL } from '../global';

export interface PushPublicKeyResponse {
    publicKey: string;
}

const PUBLIC_KEY_URL = `${BaseURL}/push/public-key`;
const SUBSCRIPTIONS_URL = `${BaseURL}/push/subscriptions`;
const TEST_URL = `${BaseURL}/push/test`;

export const isPushSupported = (): boolean => (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'Notification' in window
    && 'PushManager' in window
);

export const getPermissionState = (): NotificationPermission => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'default';
    }
    return Notification.permission;
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
};

const getReadyRegistration = async (): Promise<ServiceWorkerRegistration> => {
    if (!isPushSupported()) {
        throw new Error('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.');
    }
    return await navigator.serviceWorker.ready;
};

const loadPublicKey = async (): Promise<string> => {
    const response = await axios.get<PushPublicKeyResponse>(PUBLIC_KEY_URL);
    if (!response.data || typeof response.data.publicKey !== 'string' || response.data.publicKey.trim() === '') {
        throw new Error('Der Controller hat keinen gültigen VAPID Public Key geliefert.');
    }
    return response.data.publicKey;
};

export const getSubscription = async (): Promise<PushSubscription | null> => {
    const registration = await getReadyRegistration();
    return await registration.pushManager.getSubscription();
};

export const subscribe = async (): Promise<PushSubscription> => {
    const registration = await getReadyRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        await axios.post(SUBSCRIPTIONS_URL, existingSubscription.toJSON());
        return existingSubscription;
    }

    if (Notification.permission === 'denied') {
        throw new Error('Push-Berechtigungen sind blockiert. Bitte in den Browser- oder App-Einstellungen wieder erlauben.');
    }

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
        throw new Error('Push-Benachrichtigungen wurden nicht erlaubt.');
    }

    const publicKey = await loadPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
    });

    await axios.post(SUBSCRIPTIONS_URL, subscription.toJSON());
    return subscription;
};

export const unsubscribe = async (): Promise<void> => {
    const registration = await getReadyRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        return;
    }

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscriptionJson.endpoint || subscription.endpoint;
    let backendError: unknown = null;

    if (endpoint) {
        try {
            await axios.delete(SUBSCRIPTIONS_URL, { data: { endpoint } });
        } catch (error) {
            backendError = error;
        }
    }

    await subscription.unsubscribe();

    if (backendError) {
        throw new Error('Die lokale Subscription wurde entfernt, aber der Controller konnte nicht aktualisiert werden.');
    }
};

export const sendTestNotification = async (): Promise<void> => {
    await axios.post(TEST_URL);
};

export const PushService = {
    isPushSupported,
    getPermissionState,
    getSubscription,
    subscribe,
    unsubscribe,
    sendTestNotification,
};
