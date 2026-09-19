import {fireEvent, render, screen} from '@testing-library/react';
import {eBrewState} from '../../enums/eBrewState';
import {ManualMeasurementDialogView} from './ManualMeasurementDialog';

const props: any = {open: true, beerId: 'brew-1', onClose: jest.fn(), brewState: eBrewState.FERMENTATION, saving: false, saveMeasurement: jest.fn()};

describe('ManualMeasurementDialog', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-09-19T10:15:00Z')); });
  afterEach(() => jest.useRealTimers());

  it('uses the current time again on every opening and allows changing it', () => {
    const {rerender} = render(<ManualMeasurementDialogView {...props} />);
    expect(screen.getByLabelText('Datum / Uhrzeit')).toHaveValue('2026-09-19T10:15');
    fireEvent.change(screen.getByLabelText('Datum / Uhrzeit'), {target: {value: '2026-09-18T08:00'}});
    rerender(<ManualMeasurementDialogView {...props} open={false} />);
    jest.setSystemTime(new Date('2026-09-19T11:45:00Z'));
    rerender(<ManualMeasurementDialogView {...props} open />);
    expect(screen.getByLabelText('Datum / Uhrzeit')).toHaveValue('2026-09-19T11:45');
  });

  it('submits all manual fields during fermentation', () => {
    render(<ManualMeasurementDialogView {...props} />);
    fireEvent.change(screen.getByLabelText('Biertemperatur °C'), {target: {value: '18.4'}});
    fireEvent.change(screen.getByLabelText('Außentemperatur °C'), {target: {value: '16.2'}});
    fireEvent.change(screen.getByLabelText('Plato °P'), {target: {value: '5.1'}});
    fireEvent.change(screen.getByLabelText('Notiz'), {target: {value: 'Kontrollmessung'}});
    fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
    expect(props.saveMeasurement).toHaveBeenCalledWith(expect.objectContaining({finishedBeerId: 'brew-1', beerTemperatureC: 18.4, ambientTemperatureC: 16.2, plato: 5.1, note: 'Kontrollmessung'}));
  });

  it.each([eBrewState.MATURATION, eBrewState.FINISHED])('blocks saving in %s', brewState => {
    render(<ManualMeasurementDialogView {...props} brewState={brewState} />);
    expect(screen.getByRole('button', {name: 'Speichern'})).toBeDisabled();
    expect(screen.getByText('Manuelle Messungen sind nur während der aktiven Gärung möglich.')).toBeInTheDocument();
  });

  it('closes after success but stays open after an error', () => {
    const onClose = jest.fn();
    const {rerender} = render(<ManualMeasurementDialogView {...props} onClose={onClose} saving />);
    rerender(<ManualMeasurementDialogView {...props} onClose={onClose} saving={false} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    onClose.mockClear();
    rerender(<ManualMeasurementDialogView {...props} onClose={onClose} saving />);
    rerender(<ManualMeasurementDialogView {...props} onClose={onClose} saving={false} error="HTTP 500" />);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Die Messung konnte nicht gespeichert werden. Bitte erneut versuchen.')).toBeInTheDocument();
  });
});
