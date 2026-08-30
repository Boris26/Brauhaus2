import { io } from 'socket.io-client';
import { WebSocketController } from './WebSocketController';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

type SocketListener = (data?: any) => void;

describe('WebSocketController', () => {
  const listeners: Record<string, SocketListener> = {};
  const socket = {
    id: undefined as string | undefined,
    on: jest.fn((event: string, listener: SocketListener) => {
      listeners[event] = listener;
    }),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(listeners).forEach((event) => delete listeners[event]);
    (io as jest.Mock).mockReturnValue(socket);
    socket.id = undefined;
  });

  it('uses the current origin and default namespace for a relative REST prefix', () => {
    const controller = new WebSocketController('/api/controller');

    controller.connect();

    expect(io).toHaveBeenCalledWith({path: '/socket.io'});
  });

  it('keeps an explicit absolute socket server URL while using the standard transport path', () => {
    const controller = new WebSocketController('ws://controller');

    controller.connect();

    expect(io).toHaveBeenCalledWith('ws://controller', {path: '/socket.io'});
  });

  it('registers overheat and brew-session-running on the existing socket connection', () => {
    const controller = new WebSocketController('ws://controller');

    controller.connect();
    controller.connect();

    expect(io).toHaveBeenCalledTimes(1);
    expect(socket.on).toHaveBeenCalledWith('overheat', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('brew-session-running', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('heating-running-changed', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('agitator-state-changed', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('alarm-state-changed', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('temperature-sensor-state-changed', expect.any(Function));
  });

  it('forwards brew-session-running with its payload to the message handler', () => {
    const handler = jest.fn();
    const controller = new WebSocketController('ws://controller');
    controller.onMessage(handler);
    controller.connect();

    listeners['brew-session-running']({session: 'active'});

    expect(handler).toHaveBeenCalledWith({event: 'brew-session-running', data: {session: 'active'}});
  });

  it('forwards brew-session-running when the server sends no payload', () => {
    const handler = jest.fn();
    const controller = new WebSocketController('ws://controller');
    controller.onMessage(handler);
    controller.connect();

    listeners['brew-session-running']();

    expect(handler).toHaveBeenCalledWith({event: 'brew-session-running', data: undefined});
  });

  it('forwards connect and disconnect with the current technical socket id', () => {
    const handler = jest.fn();
    const controller = new WebSocketController('ws://controller');
    controller.onMessage(handler);
    controller.connect();
    socket.id = 'abc123';
    listeners.connect();
    listeners.disconnect();

    expect(handler).toHaveBeenNthCalledWith(1, {event: 'connection-status', data: {connected: true, socketId: 'abc123'}});
    expect(handler).toHaveBeenNthCalledWith(2, {event: 'connection-status', data: {connected: false, socketId: undefined}});
  });

  it('uses only the new socket id after a reconnect', () => {
    const handler = jest.fn();
    const controller = new WebSocketController('ws://controller');
    controller.onMessage(handler);
    controller.connect();
    socket.id = 'abc123';
    listeners.connect();
    listeners.disconnect();
    socket.id = 'xyz789';
    listeners.connect();

    expect(handler).toHaveBeenLastCalledWith({event: 'connection-status', data: {connected: true, socketId: 'xyz789'}});
  });
});
