import {WaterStatus} from '../../model/WaterStatus';
import {revisionValid} from './streams';

export const waterActive = (status: WaterStatus) => status.openClose || status.state === 'STARTING' || status.state === 'RUNNING';
export const parseWaterSnapshot = (value: any): WaterStatus | undefined => {
  if (!value || value.schemaVersion !== 1 || typeof value.controllerEpoch !== 'string' || !value.controllerEpoch
    || !revisionValid(value.waterFillingRevision)
    || typeof value.filledLiters !== 'number' || !Number.isFinite(value.filledLiters) || value.filledLiters < 0
    || typeof value.targetLiters !== 'number' || !Number.isFinite(value.targetLiters) || value.targetLiters < 0
    || typeof value.openClose !== 'boolean' || !['IDLE', 'STARTING', 'RUNNING', 'COMPLETED', 'STOPPED', 'ERROR'].includes(value.state)
    || !['AUTO', 'MANUAL', 'MASH', 'SPARGE'].includes(value.mode)
    || !(value.fillId === null || (typeof value.fillId === 'string' && value.fillId.length > 0))
    || ![value.reason, value.error].every(v => v === null || typeof v === 'string')) return undefined;
  return {filledLiters: value.filledLiters, targetLiters: value.targetLiters, openClose: value.openClose,
    ...(value.fillId ? {fillId: value.fillId} : {}), mode: value.mode, state: value.state, reason: value.reason, error: value.error,
    snapshotMetadata: {schemaVersion: 1, controllerEpoch: value.controllerEpoch, waterFillingRevision: value.waterFillingRevision}};
};
