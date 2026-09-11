import {FermentationGatewaySensorStatus} from '../model/Fermentation';

export const getFermentationGatewayWarning = (
  connected: boolean,
  sensorsByDeviceUid: Record<string, FermentationGatewaySensorStatus>,
): string | undefined => {
  if (!connected) return 'Gärsensor-Gateway nicht erreichbar.';
  const sensors = Object.values(sensorsByDeviceUid);
  if (sensors.some(sensor => sensor.status === 'BACKEND_UNAVAILABLE')) return 'Gärsensor-Gateway kann BeerDataStore nicht erreichen.';
  if (sensors.some(sensor => sensor.status === 'BACKEND_ERROR')) return 'Fehler bei der Verarbeitung von Gärsensordaten.';
  const disconnected = sensors.find(sensor => sensor.status === 'DISCONNECTED');
  if (disconnected) return `Gärsensor ${disconnected.deviceName || disconnected.deviceUid} ist nicht verbunden.`;
  const unassigned = sensors.find(sensor => sensor.status === 'UNASSIGNED');
  if (unassigned) return `Gärsensor ${unassigned.deviceName || unassigned.deviceUid} ist keinem Bier zugeordnet.`;
  return undefined;
};
