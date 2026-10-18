import {WaterStatus} from '../model/WaterStatus';
import {monotonicNow} from '../utils/brewingStatus/streams';

export interface WaterCommunication {
  initialized: boolean;
  synchronized: boolean;
  stale: boolean;
  lastMessageAt: number;
  retiredEpochs: string[];
  retiredFillIds: string[];
  needsSync?: boolean;
}
export const initialWaterCommunication: WaterCommunication = {initialized: false, synchronized: false, stale: true,
  lastMessageAt: 0, retiredEpochs: [], retiredFillIds: []};

export const acceptWater = (previous: WaterStatus, communication: WaterCommunication, incoming: WaterStatus,
                            source: 'socket' | 'sync' | 'http', connected: boolean) => {
  const next = incoming.snapshotMetadata, old = previous.snapshotMetadata;
  if (!next && old) return {waterStatus: previous, waterCommunication: communication};
  if (next) {
    if (communication.retiredEpochs.includes(next.controllerEpoch)
      || (incoming.fillId && communication.retiredFillIds.includes(incoming.fillId))) return {waterStatus: previous, waterCommunication: communication};
    if (old && old.controllerEpoch !== next.controllerEpoch && source === 'socket') {
      return {waterStatus: previous, waterCommunication: {...communication, stale: true, synchronized: false, needsSync: true}};
    }
    if (old?.controllerEpoch === next.controllerEpoch && old.waterFillingRevision > next.waterFillingRevision) return {waterStatus: previous, waterCommunication: communication};
  }
  const same = next && old && next.controllerEpoch === old.controllerEpoch && next.waterFillingRevision === old.waterFillingRevision;
  return {waterStatus: same ? previous : incoming, waterCommunication: {...communication,
    initialized: true, needsSync: false, stale: false, synchronized: connected && source === 'socket', lastMessageAt: monotonicNow(),
    retiredEpochs: old && next && old.controllerEpoch !== next.controllerEpoch ? [...communication.retiredEpochs, old.controllerEpoch] : communication.retiredEpochs,
    retiredFillIds: previous.fillId && previous.fillId !== incoming.fillId ? [...communication.retiredFillIds, previous.fillId] : communication.retiredFillIds}};
};
