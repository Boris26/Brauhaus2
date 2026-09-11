import {FermentationGatewaySensorStatus} from '../model/Fermentation';

export type FermentationGatewayMessage =
  | {type: 'FERMENTATION_GATEWAY_SNAPSHOT'; sensors: FermentationGatewaySensorStatus[]}
  | {type: 'FERMENTATION_SENSOR_STATUS_CHANGED'; sensor: FermentationGatewaySensorStatus};

export const buildFermentationGatewayWebSocketUrl = (location: Pick<Location, 'protocol' | 'host'> = window.location): string =>
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/fermentation/ui`;

export const parseFermentationGatewayMessage = (data: unknown): FermentationGatewayMessage | undefined => {
  try {
    const value = typeof data === 'string' ? JSON.parse(data) : data;
    if (value?.type === 'FERMENTATION_GATEWAY_SNAPSHOT' && Array.isArray(value.sensors)) return value;
    if (value?.type === 'FERMENTATION_SENSOR_STATUS_CHANGED' && value.sensor?.deviceUid) return value;
  } catch (_) {
    // Malformed and unknown gateway messages are deliberately non-fatal.
  }
  return undefined;
};

const reconnectDelays = [2000, 5000, 10000, 20000, 30000];

export class FermentationGatewayWebSocketController {
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private stopped = true;

  constructor(
    private readonly onMessage: (message: FermentationGatewayMessage) => void,
    private readonly onConnectionChanged: (connected: boolean) => void,
    private readonly url = buildFermentationGatewayWebSocketUrl(),
  ) {}

  connect(): void {
    this.stopped = false;
    if (this.socket || this.reconnectTimer) return;
    this.openSocket();
  }

  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
    this.onConnectionChanged(false);
  }

  private openSocket(): void {
    if (this.stopped || this.socket) return;
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.reconnectAttempt = 0;
      this.onConnectionChanged(true);
    };
    socket.onmessage = event => {
      const message = parseFermentationGatewayMessage(event.data);
      if (message) this.onMessage(message);
      else if (process.env.NODE_ENV === 'development') console.debug('Unbekannte Nachricht vom Gärsensor-Gateway ignoriert.');
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      this.onConnectionChanged(false);
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopped) return;
    const delay = reconnectDelays[Math.min(this.reconnectAttempt, reconnectDelays.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.openSocket();
    }, delay);
  }
}
