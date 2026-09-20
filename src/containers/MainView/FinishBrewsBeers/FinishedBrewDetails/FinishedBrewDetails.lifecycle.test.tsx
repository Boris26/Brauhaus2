import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewDetailsView} from './FinishedBrewDetails';
import {eBrewState} from '../../../../enums/eBrewState';

const brew: any = {
  id: 'brew-1',
  name: 'West Coast IPA',
  startDate: '2026-09-01',
  fermentationStartedAt: '2026-09-01T12:00:00+02:00',
  liters: 20,
  originalwort: 13.2,
  residual_extract: null,
  note: '',
  active: true,
  state: eBrewState.FERMENTATION,
};

const base: any = {
  brew,
  details: {measurements: [], actions: [], devices: []},
  bubbleActivity: [],
  bubbleActivityRange: '24h',
  bubbleActivityLoading: false,
  loading: false,
  saving: false,
  savingLifecycle: false,
  completing: [],
  completeActionErrors: {},
  dismissCompleteError: jest.fn(),
  skipping: [],
  assigning: [],
  unassigning: [],
  updatingDeviceDisplayNames: [],
  deviceDisplayNameErrors: {},
  sensorsByDeviceUid: {},
  load: jest.fn(),
  loadBubbleActivity: jest.fn(),
  save: jest.fn(),
  transition: jest.fn(),
  complete: jest.fn(),
  skip: jest.fn(),
  assign: jest.fn(),
  unassign: jest.fn(),
  updateDeviceDisplayName: jest.fn(),
};

describe('measurement dashboard brew lifecycle controls', () => {
  it('offers maturation and finish during fermentation and confirms maturation', () => {
    const transition = jest.fn();
    render(<FinishedBrewDetailsView {...base} transition={transition} />);

    fireEvent.click(screen.getByRole('button', {name: 'Reifung starten'}));
    expect(screen.getByText('Reifung starten?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', {name: 'Reifung starten'})[1]);

    expect(transition).toHaveBeenCalledWith(expect.objectContaining({
      id: 'brew-1',
      state: eBrewState.MATURATION,
      active: true,
    }));
    expect(screen.getByRole('button', {name: 'Bier fertig'})).toBeInTheDocument();
  });

  it('allows direct finish from fermentation and applies the finished invariant', () => {
    const transition = jest.fn();
    render(<FinishedBrewDetailsView {...base} transition={transition} />);

    fireEvent.click(screen.getByRole('button', {name: 'Bier fertig'}));
    expect(screen.getByText(/Reifung übersprungen/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', {name: 'Bier fertig'})[1]);

    expect(transition).toHaveBeenCalledWith(expect.objectContaining({
      id: 'brew-1',
      state: eBrewState.FINISHED,
      active: false,
      endDate: expect.any(String),
    }));
  });

  it('offers only finish in maturation and no lifecycle action after finish', () => {
    const {rerender} = render(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.MATURATION}} />);

    expect(screen.queryByRole('button', {name: 'Reifung starten'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Bier fertig'})).toBeInTheDocument();

    rerender(<FinishedBrewDetailsView {...base} brew={{...brew, state: eBrewState.FINISHED, active: false}} />);
    expect(screen.queryByRole('button', {name: 'Reifung starten'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Bier fertig'})).not.toBeInTheDocument();
  });

  it('locks lifecycle and measurement actions while a status change is being saved', () => {
    render(<FinishedBrewDetailsView {...base} savingLifecycle />);

    expect(screen.getByRole('button', {name: 'Reifung starten'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Bier fertig'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Neue Messung'})).toBeDisabled();
  });
});
