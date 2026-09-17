import {FermentationActionTypes} from '../actions/fermentation.actions';
import {BubbleActivity, BubbleActivityRange, FermentationDetails, FermentationGatewaySensorStatus, FermentationMeasurement} from '../model/Fermentation';

export interface BubbleActivityState {activity: BubbleActivity[]; loading: boolean; error?: string; selectedRange: BubbleActivityRange;}
export interface FermentationState { byBrewId: Record<string, FermentationDetails>; bubbleActivityByBrewId: Record<string, BubbleActivityState>; loadingIds: string[]; savingMeasurementIds: string[]; completingActionIds: string[]; completeActionErrors: Record<string, string>; skippingActionIds: string[]; assigningDeviceIds: string[]; unassigningDeviceIds: string[]; updatingDeviceDisplayNameIds: string[]; deviceDisplayNameErrors: Record<string, string>; assignmentErrors: Record<string, string>; unassignmentErrors: Record<string, string>; errors: Record<string, string>; gatewayConnected: boolean; sensorsByDeviceUid: Record<string, FermentationGatewaySensorStatus>; }
export const initialFermentationState: FermentationState = {byBrewId: {}, bubbleActivityByBrewId: {}, loadingIds: [], savingMeasurementIds: [], completingActionIds: [], completeActionErrors: {}, skippingActionIds: [], assigningDeviceIds: [], unassigningDeviceIds: [], updatingDeviceDisplayNameIds: [], deviceDisplayNameErrors: {}, assignmentErrors: {}, unassignmentErrors: {}, errors: {}, gatewayConnected: false, sensorsByDeviceUid: {}};
const add = (xs: string[], id: string) => xs.includes(id) ? xs : [...xs, id];
const remove = (xs: string[], id: string) => xs.filter(value => value !== id);
const appendMeasurements = (current: FermentationMeasurement[], incoming: FermentationMeasurement[]) => {
  const knownIds = new Set(current.map(measurement => measurement.id));
  const additions = incoming.filter(measurement => !knownIds.has(measurement.id));
  return additions.length === 0 ? current : [...current, ...additions].sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt));
};
export const fermentationActionRequestId = (brewId: string, actionId: string) => `${brewId}/${actionId}`;
export const fermentationReducer = (state = initialFermentationState, action: any): FermentationState => {
  const p = action.payload || {};
  switch (action.type) {
    case FermentationActionTypes.LOAD: return {...state, loadingIds: add(state.loadingIds, p.brewId), errors: {...state.errors, [p.brewId]: ''}};
    case FermentationActionTypes.LOAD_SUCCESS: return {...state, loadingIds: remove(state.loadingIds, p.brewId), byBrewId: {...state.byBrewId, [p.brewId]: p.details}};
    case FermentationActionTypes.LOAD_FAILURE: return {...state, loadingIds: remove(state.loadingIds, p.brewId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.CREATE_MEASUREMENT: return {...state, savingMeasurementIds: add(state.savingMeasurementIds, p.measurement.finishedBeerId), errors: {...state.errors, [p.measurement.finishedBeerId]: ''}};
    case FermentationActionTypes.CREATE_MEASUREMENT_SUCCESS: {
      const details = state.byBrewId[p.brewId];
      return {...state, savingMeasurementIds: remove(state.savingMeasurementIds, p.brewId), byBrewId: details ? {...state.byBrewId, [p.brewId]: {...details, measurements: appendMeasurements(details.measurements, [p.measurement])}} : state.byBrewId};
    }
    case FermentationActionTypes.CREATE_MEASUREMENT_FAILURE: return {...state, savingMeasurementIds: remove(state.savingMeasurementIds, p.brewId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.COMPLETE_ACTION: {
      const requestId = fermentationActionRequestId(p.brewId, p.actionId); const completeActionErrors = {...state.completeActionErrors}; delete completeActionErrors[requestId];
      return {...state, completingActionIds: add(state.completingActionIds, requestId), completeActionErrors};
    }
    case FermentationActionTypes.COMPLETE_ACTION_SUCCESS: {
      const requestId = fermentationActionRequestId(p.brewId, p.actionId); const details = state.byBrewId[p.brewId];
      const canonicalDetails = details
        ? {...details, actions: details.actions.some(item => item.actionId === p.actionId) ? details.actions.map(item => item.actionId === p.actionId ? p.action : item) : [...details.actions, p.action]}
        : {actions: [p.action], measurements: [], devices: []};
      return {...state, completingActionIds: remove(state.completingActionIds, requestId), byBrewId: {...state.byBrewId, [p.brewId]: canonicalDetails}};
    }
    case FermentationActionTypes.COMPLETE_ACTION_FAILURE: {
      const requestId = fermentationActionRequestId(p.brewId, p.actionId);
      return {...state, completingActionIds: remove(state.completingActionIds, requestId), completeActionErrors: {...state.completeActionErrors, [requestId]: p.error}};
    }
    case FermentationActionTypes.DISMISS_COMPLETE_ACTION_ERROR: {
      const completeActionErrors = {...state.completeActionErrors}; delete completeActionErrors[fermentationActionRequestId(p.brewId, p.actionId)]; return {...state, completeActionErrors};
    }
    case FermentationActionTypes.SKIP_ACTION: return {...state, skippingActionIds: add(state.skippingActionIds, p.actionId)};
    case FermentationActionTypes.SKIP_ACTION_SUCCESS: return {...state, skippingActionIds: remove(state.skippingActionIds, p.actionId)};
    case FermentationActionTypes.SKIP_ACTION_FAILURE: return {...state, skippingActionIds: remove(state.skippingActionIds, p.actionId), errors: {...state.errors, [p.brewId]: p.error}};
    case FermentationActionTypes.ASSIGN_DEVICE: return {...state, assigningDeviceIds: add(state.assigningDeviceIds, p.deviceId), assignmentErrors: {...state.assignmentErrors, [p.brewId]: ''}};
    case FermentationActionTypes.ASSIGN_DEVICE_SUCCESS: return {...state, assigningDeviceIds: remove(state.assigningDeviceIds, p.deviceId)};
    case FermentationActionTypes.ASSIGN_DEVICE_FAILURE: return {...state, assigningDeviceIds: remove(state.assigningDeviceIds, p.deviceId), assignmentErrors: {...state.assignmentErrors, [p.brewId]: p.error}};
    case FermentationActionTypes.UNASSIGN_DEVICE: return {...state, unassigningDeviceIds: add(state.unassigningDeviceIds, p.deviceId), unassignmentErrors: {...state.unassignmentErrors, [p.brewId]: ''}};
    case FermentationActionTypes.UNASSIGN_DEVICE_SUCCESS: return {...state, unassigningDeviceIds: remove(state.unassigningDeviceIds, p.deviceId)};
    case FermentationActionTypes.UNASSIGN_DEVICE_FAILURE: return {...state, unassigningDeviceIds: remove(state.unassigningDeviceIds, p.deviceId), unassignmentErrors: {...state.unassignmentErrors, [p.brewId]: p.error}};
    case FermentationActionTypes.UPDATE_DEVICE_DISPLAY_NAME: return {...state, updatingDeviceDisplayNameIds: add(state.updatingDeviceDisplayNameIds, p.deviceUid), deviceDisplayNameErrors: {...state.deviceDisplayNameErrors, [p.deviceUid]: ''}};
    case FermentationActionTypes.UPDATE_DEVICE_DISPLAY_NAME_SUCCESS: return {...state, updatingDeviceDisplayNameIds: remove(state.updatingDeviceDisplayNameIds, p.deviceUid)};
    case FermentationActionTypes.UPDATE_DEVICE_DISPLAY_NAME_FAILURE: return {...state, updatingDeviceDisplayNameIds: remove(state.updatingDeviceDisplayNameIds, p.deviceUid), deviceDisplayNameErrors: {...state.deviceDisplayNameErrors, [p.deviceUid]: p.error || 'Sensor-Alias konnte nicht gespeichert werden.'}};
    case FermentationActionTypes.GATEWAY_CONNECTION_CHANGED: return {...state, gatewayConnected: p.connected};
    case FermentationActionTypes.GATEWAY_SNAPSHOT_RECEIVED: return {...state, sensorsByDeviceUid: Object.fromEntries((p.sensors || []).map((sensor: FermentationGatewaySensorStatus) => [sensor.deviceUid, sensor]))};
    case FermentationActionTypes.GATEWAY_SENSOR_STATUS_CHANGED: return p.sensor?.deviceUid ? {...state, sensorsByDeviceUid: {...state.sensorsByDeviceUid, [p.sensor.deviceUid]: p.sensor}} : state;
    case FermentationActionTypes.GATEWAY_SENSOR_RUNTIME_CHANGED: {
      const sensor = state.sensorsByDeviceUid[p.deviceUid];
      return sensor ? {...state, sensorsByDeviceUid: {...state.sensorsByDeviceUid, [p.deviceUid]: {...sensor, measurementState: p.measurementState, updatedAt: p.updatedAt}}} : state;
    }
    case FermentationActionTypes.MEASUREMENTS_RECEIVED: {
      const details = state.byBrewId[p.brewId];
      if (!details) return state;
      const measurements = appendMeasurements(details.measurements, p.measurements || []);
      return measurements === details.measurements ? state : {...state, byBrewId: {...state.byBrewId, [p.brewId]: {...details, measurements}}};
    }
    case FermentationActionTypes.BUBBLE_ACTIVITY_RECEIVED: {
      const bubble = state.bubbleActivityByBrewId[p.brewId];
      if (!bubble || bubble.activity.some(item => item.deviceId === p.activity.deviceId && item.sequence === p.activity.sequence)) return state;
      return {...state, bubbleActivityByBrewId: {...state.bubbleActivityByBrewId, [p.brewId]: {...bubble, activity: [...bubble.activity, p.activity]}}};
    }
    case FermentationActionTypes.LOAD_BUBBLE_ACTIVITY: return {...state, bubbleActivityByBrewId: {...state.bubbleActivityByBrewId, [p.brewId]: {activity: state.bubbleActivityByBrewId[p.brewId]?.activity ?? [], loading: true, selectedRange: p.range}}};
    case FermentationActionTypes.LOAD_BUBBLE_ACTIVITY_SUCCESS:
      if (state.bubbleActivityByBrewId[p.brewId]?.selectedRange !== p.range) return state;
      return {...state, bubbleActivityByBrewId: {...state.bubbleActivityByBrewId, [p.brewId]: {activity: p.activity, loading: false, selectedRange: p.range}}};
    case FermentationActionTypes.LOAD_BUBBLE_ACTIVITY_FAILURE:
      if (state.bubbleActivityByBrewId[p.brewId]?.selectedRange !== p.range) return state;
      return {...state, bubbleActivityByBrewId: {...state.bubbleActivityByBrewId, [p.brewId]: {activity: [], loading: false, error: p.error, selectedRange: p.range}}};
    default: return state;
  }
};
