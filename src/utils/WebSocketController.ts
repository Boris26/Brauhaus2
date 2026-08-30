import { io, Socket } from 'socket.io-client';

export interface SocketConnectionStatus {
  connected: boolean;
  socketId?: string;
}

export type MessageHandler = (event: { event: string; data?: any }) => void;

export class WebSocketController {
  private socket: Socket | null = null;
  private messageHandler: MessageHandler | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.socket) return;
    this.socket = io(this.url);
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
