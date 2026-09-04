import {CreateFermentationMeasurement, FermentationDetails} from '../model/Fermentation';

export enum FermentationActionTypes {
  LOAD = 'Fermentation.LOAD', LOAD_SUCCESS = 'Fermentation.LOAD_SUCCESS', LOAD_FAILURE = 'Fermentation.LOAD_FAILURE',
  CREATE_MEASUREMENT = 'Fermentation.CREATE_MEASUREMENT', CREATE_MEASUREMENT_SUCCESS = 'Fermentation.CREATE_MEASUREMENT_SUCCESS', CREATE_MEASUREMENT_FAILURE = 'Fermentation.CREATE_MEASUREMENT_FAILURE',
  COMPLETE_ACTION = 'Fermentation.COMPLETE_ACTION', COMPLETE_ACTION_SUCCESS = 'Fermentation.COMPLETE_ACTION_SUCCESS', COMPLETE_ACTION_FAILURE = 'Fermentation.COMPLETE_ACTION_FAILURE',
  ASSIGN_DEVICE = 'Fermentation.ASSIGN_DEVICE', ASSIGN_DEVICE_SUCCESS = 'Fermentation.ASSIGN_DEVICE_SUCCESS', ASSIGN_DEVICE_FAILURE = 'Fermentation.ASSIGN_DEVICE_FAILURE',
}
export const FermentationActions = {
  load: (brewId: string) => ({type: FermentationActionTypes.LOAD, payload: {brewId}}),
  loadSuccess: (brewId: string, details: FermentationDetails) => ({type: FermentationActionTypes.LOAD_SUCCESS, payload: {brewId, details}}),
  loadFailure: (brewId: string, error: string) => ({type: FermentationActionTypes.LOAD_FAILURE, payload: {brewId, error}}),
  createMeasurement: (measurement: CreateFermentationMeasurement) => ({type: FermentationActionTypes.CREATE_MEASUREMENT, payload: {measurement}}),
  createMeasurementSuccess: (brewId: string) => ({type: FermentationActionTypes.CREATE_MEASUREMENT_SUCCESS, payload: {brewId}}),
  createMeasurementFailure: (brewId: string, error: string) => ({type: FermentationActionTypes.CREATE_MEASUREMENT_FAILURE, payload: {brewId, error}}),
  completeAction: (brewId: string, actionId: string) => ({type: FermentationActionTypes.COMPLETE_ACTION, payload: {brewId, actionId}}),
  completeActionSuccess: (brewId: string, actionId: string) => ({type: FermentationActionTypes.COMPLETE_ACTION_SUCCESS, payload: {brewId, actionId}}),
  completeActionFailure: (brewId: string, actionId: string, error: string) => ({type: FermentationActionTypes.COMPLETE_ACTION_FAILURE, payload: {brewId, actionId, error}}),
  assignDevice: (deviceId: string, brewId: string) => ({type: FermentationActionTypes.ASSIGN_DEVICE, payload: {deviceId, brewId}}),
  assignDeviceSuccess: (deviceId: string, brewId: string) => ({type: FermentationActionTypes.ASSIGN_DEVICE_SUCCESS, payload: {deviceId, brewId}}),
  assignDeviceFailure: (deviceId: string, brewId: string, error: string) => ({type: FermentationActionTypes.ASSIGN_DEVICE_FAILURE, payload: {deviceId, brewId, error}}),
};
