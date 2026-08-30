import { io } from 'socket.io-client';
import { WebSocketController } from './WebSocketController';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

type SocketListener = (data?: any) => void;

describe('WebSocketController', () => {
  const listeners: Record<string, SocketListener> = {};
  const socket = {
    on: jest.fn((event: string, listener: SocketListener) => {
      listeners[event] = listener;
      return socket;
    }),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(listeners).forEach((event) => delete listeners[event]);
    (io as jest.Mock).mockReturnValue(socket);
  });

  it('registers overheat and brew-session-running on the existing socket connection', () => {
    const controller = new WebSocketController('ws://controller');

    controller.connect();
    controller.connect();

    expect(io).toHaveBeenCalledTimes(1);
    expect(socket.on).toHaveBeenCalledWith('overheat', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('brew-session-running', expect.any(Function));
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
});
