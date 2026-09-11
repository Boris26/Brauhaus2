import {buildFermentationGatewayWebSocketUrl, FermentationGatewayWebSocketController, parseFermentationGatewayMessage} from './FermentationGatewayWebSocketController';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: {data: string}) => void) | null = null;
  close = jest.fn(() => this.onclose?.());
  constructor(public url: string) { MockWebSocket.instances.push(this); }
}

describe('FermentationGatewayWebSocketController', () => {
  beforeEach(() => { jest.useFakeTimers(); MockWebSocket.instances = []; (global as any).WebSocket = MockWebSocket; });
  afterEach(() => jest.useRealTimers());

  it('builds same-origin ws and wss URLs without a LAN address', () => {
    expect(buildFermentationGatewayWebSocketUrl({protocol: 'http:', host: 'localhost:3000'} as Location)).toBe('ws://localhost:3000/api/fermentation/ui');
    expect(buildFermentationGatewayWebSocketUrl({protocol: 'https:', host: 'brauhaus.example'} as Location)).toBe('wss://brauhaus.example/api/fermentation/ui');
    expect(buildFermentationGatewayWebSocketUrl({protocol: 'https:', host: 'brauhaus.example'} as Location)).not.toMatch(/192\.168\./);
  });

  it('parses snapshots and status changes and ignores unknown messages', () => {
    expect(parseFermentationGatewayMessage(JSON.stringify({type: 'FERMENTATION_GATEWAY_SNAPSHOT', sensors: []}))).toEqual({type: 'FERMENTATION_GATEWAY_SNAPSHOT', sensors: []});
    expect(parseFermentationGatewayMessage(JSON.stringify({type: 'FERMENTATION_SENSOR_STATUS_CHANGED', sensor: {deviceUid: 'a', status: 'ASSIGNED'}}))?.type).toBe('FERMENTATION_SENSOR_STATUS_CHANGED');
    expect(parseFermentationGatewayMessage('{"type":"UNKNOWN"}')).toBeUndefined();
    expect(parseFermentationGatewayMessage('invalid')).toBeUndefined();
  });

  it('reconnects and resets backoff after a successful connection', () => {
    const states: boolean[] = [];
    const controller = new FermentationGatewayWebSocketController(jest.fn(), connected => states.push(connected), 'ws://host/api/fermentation/ui');
    controller.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(1999);
    expect(MockWebSocket.instances).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
    MockWebSocket.instances[1].onclose?.();
    jest.advanceTimersByTime(5000);
    expect(MockWebSocket.instances).toHaveLength(3);
    MockWebSocket.instances[2].onopen?.();
    MockWebSocket.instances[2].onclose?.();
    jest.advanceTimersByTime(2000);
    expect(MockWebSocket.instances).toHaveLength(4);
    expect(states).toContain(true);
    controller.disconnect();
  });
});
