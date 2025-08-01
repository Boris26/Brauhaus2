import { io, Socket } from 'socket.io-client';

export type MessageHandler = (event: { event: string; data: any }) => void;

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
    this.socket.on('overheat', (data: any) => {
      if (this.messageHandler) {
        this.messageHandler({ event: 'overheat', data });
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
