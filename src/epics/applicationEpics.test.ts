import {Subject} from 'rxjs';
import {take, toArray} from 'rxjs/operators';
import {ApplicationActions, ProductionActions} from '../actions/actions';
import {FermentationActionTypes} from '../actions/fermentation.actions';
import {applicationStartupEpic$, controllerSocketLifecycleEpic$} from './applicationEpics';

const availability = (isAvailable: boolean) => ProductionActions.isBackenAvailable({
  isBackenAvailable: isAvailable,
  statusText: '',
});

describe('application startup', () => {
  it('starts availability discovery and the independent fermentation gateway, but not the controller socket', done => {
    const action$ = new Subject<any>();
    applicationStartupEpic$(action$).pipe(take(2), toArray()).subscribe(actions => {
      expect(actions.map(action => action.type)).toEqual([
        ProductionActions.ActionTypes.CHECK_IS_BACKEND_AVAILABLE,
        FermentationActionTypes.GATEWAY_CONNECT,
      ]);
      expect(actions).not.toContainEqual(ProductionActions.webSocketConnect());
      done();
    });

    action$.next(ApplicationActions.applicationStart());
  });
});

describe('controller socket availability lifecycle', () => {
  it('keeps the socket disconnected while the backend is unavailable', done => {
    const action$ = new Subject<any>();
    controllerSocketLifecycleEpic$(action$).pipe(take(1)).subscribe(action => {
      expect(action).toEqual(ProductionActions.webSocketDisconnect());
      done();
    });
    action$.next(availability(false));
  });

  it('connects once for repeated available results, disconnects on failure, and reconnects after recovery', done => {
    const action$ = new Subject<any>();
    controllerSocketLifecycleEpic$(action$).pipe(take(4), toArray()).subscribe(actions => {
      expect(actions).toEqual([
        ProductionActions.webSocketDisconnect(),
        ProductionActions.webSocketConnect(),
        ProductionActions.webSocketDisconnect(),
        ProductionActions.webSocketConnect(),
      ]);
      done();
    });

    [false, true, true, false, true].forEach(value => action$.next(availability(value)));
  });
});
