import {ofType} from 'redux-observable';
import {from} from 'rxjs';
import {distinctUntilChanged, map, mergeMap} from 'rxjs/operators';
import {ApplicationActions, ProductionActions} from '../actions/actions';
import {FermentationActions} from '../actions/fermentation.actions';

/** Start infrastructure that belongs to the application rather than a rendered view. */
export const applicationStartupEpic$ = (action$: any) => action$.pipe(
  ofType(ApplicationActions.ActionTypes.APPLICATION_START),
  mergeMap(() => from([
    ProductionActions.checkIsBackenAvailable(),
    FermentationActions.gatewayConnect(),
  ])),
);

/** Keep the controller socket aligned with the latest availability transition. */
export const controllerSocketLifecycleEpic$ = (action$: any) => action$.pipe(
  ofType(ProductionActions.ActionTypes.IS_BACKEND_AVAILABLE),
  map((action: ProductionActions.IsBackendAvailable) => action.payload.isBackenAvailable.isBackenAvailable),
  distinctUntilChanged(),
  map((isAvailable: boolean) => isAvailable
    ? ProductionActions.webSocketConnect()
    : ProductionActions.webSocketDisconnect()),
);

export const applicationEpics = [applicationStartupEpic$, controllerSocketLifecycleEpic$];
