import { io, Socket } from 'socket.io-client';

export interface SocketConnectionStatus {
  connected: boolean;
  socketId?: string;
}

export type MessageHandler = (event: { event: string; data?: any }) => void;
const realtimeEvents = ['heating-running-changed', 'agitator-state-changed', 'alarm-state-changed', 'warning-state-changed', 'temperature-sensor-state-changed', 'agitator-defaults-changed', 'brew-recovery-state-changed', 'brewing-status-changed', 'brewing-telemetry', 'brewing-status-heartbeat'] as const;

export class WebSocketController {
  private socket: Socket | null = null;
  private messageHandler: MessageHandler | null = null;
  private serverUrl?: string;
  private reconnectListener = () => this.messageHandler?.({event: 'connection-error'});
  private offlineListener = () => this.socket?.disconnect();
  private onlineListener = () => this.socket?.connect();

  constructor(url?: string) {
    // Relative values such as /api/controller are REST prefixes, not Socket.IO
    // namespaces. In that case Socket.IO must use the current origin and the
    // default namespace. Absolute URLs remain supported for explicit hosts.
    this.serverUrl = url && !url.startsWith('/') ? url : undefined;
  }

  connect() {
    if (this.socket) return;

    const socketOptions = {path: '/socket.io', reconnection: true,
      reconnectionDelay: 1000, reconnectionDelayMax: 30000, randomizationFactor: 0.5, timeout: 8000};
    this.socket = this.serverUrl
      ? io(this.serverUrl, socketOptions)
      : io(socketOptions);

    const socket = this.socket;
    window.addEventListener('offline', this.offlineListener);
    window.addEventListener('online', this.onlineListener);
    socket.io?.on('reconnect_attempt', this.reconnectListener);
    socket.on('connect_error', this.reconnectListener);
    this.socket.on('connect', () => {
      if (this.socket === socket && this.messageHandler) {
        this.messageHandler({
          event: 'connection-status',
          data: {connected: true, socketId: this.socket?.id},
        });
      }
    });
    this.socket.on('disconnect', () => {
      if (this.socket === socket && this.messageHandler) {
        this.messageHandler({
          event: 'connection-status',
          data: {connected: false, socketId: undefined},
        });
      }
    });
    this.socket.on('overheat', (data: any) => {
      if (this.socket === socket && this.messageHandler) {
        this.messageHandler({ event: 'overheat', data });
      }
    });
    this.socket.on('brew-session-running', (data?: any) => {
      if (this.socket === socket && this.messageHandler) {
        this.messageHandler({ event: 'brew-session-running', data });
      }
    });
    realtimeEvents.forEach((event) => this.socket!.on(event, (data: unknown) => {
      if (this.socket === socket) this.messageHandler?.({event, data});
    }));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  disconnect() {
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      window.removeEventListener('offline', this.offlineListener);
      window.removeEventListener('online', this.onlineListener);
      socket.io?.off('reconnect_attempt', this.reconnectListener);
      socket.removeAllListeners?.();
      socket.disconnect();
    }
  }
}
