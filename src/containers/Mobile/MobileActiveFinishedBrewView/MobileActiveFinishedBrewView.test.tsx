import {fireEvent, render, screen} from '@testing-library/react';
import {eBrewState} from '../../../enums/eBrewState';
import {FinishedBrew} from '../../../model/FinishedBrew';
import {MobileActiveFinishedBrewView} from './MobileActiveFinishedBrewView';

const brew: FinishedBrew = {id: 'brew-1', name: 'Test', startDate: '2026-08-27', liters: 10, originalwort: 12, residual_extract: 3, note: '', active: true, state: eBrewState.FERMENTATION};

it('submits numeric mobile fields as numbers and an empty residual extract as null', () => {
    const saveFinishedBrew = jest.fn();
    render(<MobileActiveFinishedBrewView finishedBrews={[brew]} saveFinishedBrew={saveFinishedBrew} />);
    fireEvent.click(screen.getByRole('button', {name: 'Bearbeiten'}));
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], {target: {name: 'originalwort', value: '13.5'}});
    fireEvent.change(numberInputs[1], {target: {name: 'residual_extract', value: ''}});
    fireEvent.change(numberInputs[2], {target: {name: 'liters', value: '19.5'}});
    fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
    expect(saveFinishedBrew).toHaveBeenCalledWith(expect.objectContaining({originalwort: 13.5, residual_extract: null, liters: 19.5}));
});

it('keeps edits open on failure and closes only after updated server data arrives', () => {
    const saveFinishedBrew = jest.fn();
    const {rerender} = render(<MobileActiveFinishedBrewView finishedBrews={[brew]} saveFinishedBrew={saveFinishedBrew} savingFinishedBrewIds={[]} finishedBrewUpdateErrors={{}} />);
    fireEvent.click(screen.getByRole('button', {name: 'Bearbeiten'}));
    fireEvent.change(screen.getAllByRole('spinbutton')[2], {target: {name: 'liters', value: '20'}});
    fireEvent.click(screen.getByRole('button', {name: 'Speichern'}));
    expect(screen.getByRole('button', {name: 'Speichern'})).toBeInTheDocument();

    rerender(<MobileActiveFinishedBrewView finishedBrews={[brew]} saveFinishedBrew={saveFinishedBrew} savingFinishedBrewIds={[]} finishedBrewUpdateErrors={{'brew-1': 'HTTP 500'}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500');
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();

    rerender(<MobileActiveFinishedBrewView finishedBrews={[{...brew, liters: 20}]} saveFinishedBrew={saveFinishedBrew} savingFinishedBrewIds={[]} finishedBrewUpdateErrors={{}} />);
    expect(screen.getByRole('button', {name: 'Bearbeiten'})).toBeInTheDocument();
});
