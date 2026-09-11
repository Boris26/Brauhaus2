import {getFermentationGatewayWarning} from './fermentationGatewayStatus';
import {FermentationGatewaySensorStatus} from '../model/Fermentation';

const sensor = (status: FermentationGatewaySensorStatus['status'], deviceName = 'FERM-123'): FermentationGatewaySensorStatus => ({
  deviceUid: 'device-1', deviceName, status, updatedAt: '2026-09-11T07:25:11Z',
});

it('shows UNASSIGNED and DISCONNECTED gateway warnings', () => {
  expect(getFermentationGatewayWarning(true, {'device-1': sensor('UNASSIGNED')})).toBe('Gärsensor FERM-123 ist keinem Bier zugeordnet.');
  expect(getFermentationGatewayWarning(true, {'device-1': sensor('DISCONNECTED')})).toBe('Gärsensor FERM-123 ist nicht verbunden.');
});

it('removes the UNASSIGNED warning as soon as the sensor is ASSIGNED', () => {
  expect(getFermentationGatewayWarning(true, {'device-1': sensor('ASSIGNED')})).toBeUndefined();
});

it('shows a disconnected gateway without producing repeated messages', () => {
  expect(getFermentationGatewayWarning(false, {})).toBe('Gärsensor-Gateway nicht erreichbar.');
});
