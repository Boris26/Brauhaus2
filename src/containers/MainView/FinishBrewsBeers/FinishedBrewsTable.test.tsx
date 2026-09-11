import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewsTable} from './FinishedBrewsTable';
import {eBrewState} from '../../../enums/eBrewState';

const brew: any = {id: 'brew/id 1', name: 'Test IPA', startDate: '2026-09-01', liters: 20, originalwort: 13, residual_extract: 4, note: '', active: true, state: eBrewState.FERMENTATION};
const props: any = {brews: [brew], beers: [], onSave: jest.fn(), onCreate: jest.fn(), exportPdf: jest.fn(), getFinishedBrews: jest.fn(), onDelete: jest.fn(), savingFinishedBrewIds: [], finishedBrewUpdateErrors: {}, isAddingFinishedBrew: false, deletingFinishedBrewIds: [], openMeasurements: jest.fn()};

describe('FinishedBrewsTable measurement action', () => {
  it('opens measurements directly with the unchanged finished-beer id', () => {
    const openMeasurements = jest.fn();
    render(<FinishedBrewsTable {...props} openMeasurements={openMeasurements} />);
    fireEvent.click(screen.getByRole('button', {name: 'Messdaten für Test IPA'}));
    expect(openMeasurements).toHaveBeenCalledWith('brew/id 1');
  });
});
