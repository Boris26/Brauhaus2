import {FermentationActionTypes} from '../actions/fermentation.actions';
import {FermentationDetails, FermentationGatewaySensorStatus} from '../model/Fermentation';

export interface FermentationState { byBrewId: Record<string, FermentationDetails>; loadingIds: string[]; savingMeasurementIds: string[]; completingActionIds: string[]; skippingActionIds: string[]; assigningDeviceIds: string[]; errors: Record<string, string>; gatewayConnected: boolean; sensorsByDeviceUid: Record<string, FermentationGatewaySensorStatus>; }
export const initialFermentationState: FermentationState = {byBrewId: {}, loadingIds: [], savingMeasurementIds: [], completingActionIds: [], skippingActionIds: [], assigningDeviceIds: [], errors: {}, gatewayConnected: false, sensorsByDeviceUid: {}};
const add = (xs: string[], id: string) => xs.includes(id) ? xs : [...xs, id];
const remove = (xs: string[], id: string) => xs.filter(value => value !== id);
export const fermentationReducer = (state = initialFermentationState, action: any): FermentationState => {
  const p = action.payload || {};
  switch (action.type) {
    case FermentationActionTypes.LOAD: return {...state, loadingIds: add(state.loadingIds, p.brewId), errors: {...state.errors, [p.brewId]: ''}};
    case FermentationActionTypes.LOAD_SUCCESS: return {...state, loadingIds: remove(state.loadingIds, p.brewId), byBrewId: {...state.byBrewId, [p.brewId]: p.details}};
    case FermentationActionTypes.LOAD_FAILURE: return {...state, loadingIds: remove(state.loadingIds, p.brewId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.CREATE_MEASUREMENT: return {...state, savingMeasurementIds: add(state.savingMeasurementIds, p.measurement.finishedBeerId), errors: {...state.errors, [p.measurement.finishedBeerId]: ''}};
    case FermentationActionTypes.CREATE_MEASUREMENT_SUCCESS: return {...state, savingMeasurementIds: remove(state.savingMeasurementIds, p.brewId)};
    case FermentationActionTypes.CREATE_MEASUREMENT_FAILURE: return {...state, savingMeasurementIds: remove(state.savingMeasurementIds, p.brewId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.COMPLETE_ACTION: return {...state, completingActionIds: add(state.completingActionIds, p.actionId)};
    case FermentationActionTypes.COMPLETE_ACTION_SUCCESS: return {...state, completingActionIds: remove(state.completingActionIds, p.actionId)};
    case FermentationActionTypes.COMPLETE_ACTION_FAILURE: return {...state, completingActionIds: remove(state.completingActionIds, p.actionId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.SKIP_ACTION: return {...state, skippingActionIds: add(state.skippingActionIds, p.actionId)};
    case FermentationActionTypes.SKIP_ACTION_SUCCESS: return {...state, skippingActionIds: remove(state.skippingActionIds, p.actionId)};
    case FermentationActionTypes.SKIP_ACTION_FAILURE: return {...state, skippingActionIds: remove(state.skippingActionIds, p.actionId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.ASSIGN_DEVICE: return {...state, assigningDeviceIds: add(state.assigningDeviceIds, p.deviceId)};
    case FermentationActionTypes.ASSIGN_DEVICE_SUCCESS: return {...state, assigningDeviceIds: remove(state.assigningDeviceIds, p.deviceId)};
    case FermentationActionTypes.ASSIGN_DEVICE_FAILURE: return {...state, assigningDeviceIds: remove(state.assigningDeviceIds, p.deviceId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.GATEWAY_CONNECTION_CHANGED: return {...state, gatewayConnected: p.connected};
    case FermentationActionTypes.GATEWAY_SNAPSHOT_RECEIVED: return {...state, sensorsByDeviceUid: Object.fromEntries((p.sensors || []).map((sensor: FermentationGatewaySensorStatus) => [sensor.deviceUid, sensor]))};
    case FermentationActionTypes.GATEWAY_SENSOR_STATUS_CHANGED: return p.sensor?.deviceUid ? {...state, sensorsByDeviceUid: {...state.sensorsByDeviceUid, [p.sensor.deviceUid]: p.sensor}} : state;
    default: return state;
  }
};
