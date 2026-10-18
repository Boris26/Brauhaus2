import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {rootReducer} from '../../../reducers/rootReducer';
import {ProductionActions as Actions} from '../../../actions/actions';
import {parseSnapshot} from '../../../utils/brewingStatus/snapshot';
import MobileView from './MobileProductionView.connect';
import {ControlConfirmationNotice} from '../../Production/components/InlineProcessNotice/InlineProcessNotice';
import {getConfirmationRequestViewModel} from '../../../utils/brewingStatus/selectors';

jest.mock('../../../repositorys/ProductionRepository', () => ({ProductionRepository: {}}));
jest.mock('../MobileBrewingCalculationsView/MobileBrewingCalculationsView', () => () => null);

const status = (revision: number, waiting = true) => parseSnapshot({
  schemaVersion: 1, controllerEpoch: 'epoch', processInstanceId: 'run', revision, stateRevision: revision,
  status: {elapsedTime: revision, process: {state: 'ACTIVE'},
    currentStep: {index: 1, phase: 'RAST', mode: waiting ? 'WAITING' : 'HEATING'},
    waiting: {waitingFor: waiting ? 'IODINE_TEST' : 'NONE', canConfirm: waiting},
    temperature: {current: 60, target: 65}, error: {}},
})!;

it('mobile retains the accepted confirmation until a socket snapshot advances the process', () => {
  const store = configureStore({reducer: rootReducer});
  store.dispatch(Actions.setBrewingStatus(status(1), 'socket'));
  render(<Provider store={store}><MobileView /></Provider>);
  fireEvent.click(screen.getByRole('button', {name: 'Jodprobe abgeschlossen'}));
  act(() => {store.dispatch(Actions.confirmSuccess());});
  expect(screen.getByRole('button', {name: 'Wird verarbeitet …'})).toBeDisabled();
  expect(screen.getByText(/Bestätigung angenommen/)).toBeInTheDocument();
  act(() => {store.dispatch(Actions.setBrewingStatus(status(2, false), 'socket'));});
  expect(screen.queryByRole('region', {name: 'Aktion erforderlich'})).not.toBeInTheDocument();
  expect(store.getState().productionReducer.confirmation.phase).toBe('Completed');
});

it('the shared desktop notice shows synchronization without enabling a second command', () => {
  const confirm = jest.fn();
  const request = getConfirmationRequestViewModel(status(1))!;
  render(<ControlConfirmationNotice request={request} pending statusText="Controllerstatus wird synchronisiert." onConfirm={confirm} />);
  fireEvent.click(screen.getByRole('button', {name: 'Wird verarbeitet …'}));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('Controllerstatus wird synchronisiert.');
});
