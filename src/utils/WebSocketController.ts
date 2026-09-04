import { io, Socket } from 'socket.io-client';

export interface SocketConnectionStatus {
  connected: boolean;
  socketId?: string;
}

export type MessageHandler = (event: { event: string; data?: any }) => void;
const realtimeEvents = ['heating-running-changed', 'agitator-state-changed', 'alarm-state-changed', 'warning-state-changed', 'temperature-sensor-state-changed', 'agitator-defaults-changed', 'brew-recovery-state-changed'] as const;

export class WebSocketController {
  private socket: Socket | null = null;
  private messageHandler: MessageHandler | null = null;
  private serverUrl?: string;

  constructor(url?: string) {
    // Relative values such as /api/controller are REST prefixes, not Socket.IO
    // namespaces. In that case Socket.IO must use the current origin and the
    // default namespace. Absolute URLs remain supported for explicit hosts.
    this.serverUrl = url && !url.startsWith('/') ? url : undefined;
  }

  connect() {
    if (this.socket) return;

    const socketOptions = { path: '/socket.io' };
    this.socket = this.serverUrl
      ? io(this.serverUrl, socketOptions)
      : io(socketOptions);

    this.socket.on('connect', () => {
      if (this.messageHandler) {
        this.messageHandler({
          event: 'connection-status',
          data: {connected: true, socketId: this.socket?.id},
        });
      }
    });
    this.socket.on('disconnect', () => {
      if (this.messageHandler) {
        this.messageHandler({
          event: 'connection-status',
          data: {connected: false, socketId: undefined},
        });
      }
    });
    this.socket.on('overheat', (data: any) => {
      if (this.messageHandler) {
        this.messageHandler({ event: 'overheat', data });
      }
    });
    this.socket.on('brew-session-running', (data?: any) => {
      if (this.messageHandler) {
        this.messageHandler({ event: 'brew-session-running', data });
      }
    });
    realtimeEvents.forEach((event) => this.socket!.on(event, (data: unknown) => {
      this.messageHandler?.({event, data});
    }));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
