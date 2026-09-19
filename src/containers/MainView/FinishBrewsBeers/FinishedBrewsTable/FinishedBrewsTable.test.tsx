import {fireEvent, render, screen} from '@testing-library/react';
import {FinishedBrewsTable} from './FinishedBrewsTable';
import {eBrewState} from '../../../../enums/eBrewState';

const brew: any = {id: 'brew/id 1', name: 'Test IPA', startDate: '2026-09-01', liters: 20, originalwort: 13, residual_extract: 4, note: '', active: true, state: eBrewState.FERMENTATION};
const props: any = {brews: [brew], beers: [], onSave: jest.fn(), onCreate: jest.fn(), exportPdf: jest.fn(), getFinishedBrews: jest.fn(), onDelete: jest.fn(), savingFinishedBrewIds: [], finishedBrewUpdateErrors: {}, isAddingFinishedBrew: false, deletingFinishedBrewIds: [], openMeasurements: jest.fn()};

describe('FinishedBrewsTable measurement action', () => {
  it('opens measurements directly with the unchanged finished-beer id', () => {
    const openMeasurements = jest.fn();
    render(<FinishedBrewsTable {...props} openMeasurements={openMeasurements} />);
    fireEvent.click(screen.getByRole('button', {name: 'Messdaten für Test IPA'}));
    expect(openMeasurements).toHaveBeenCalledWith('brew/id 1');
  });

  it('renders the requested read-only overview with a compact active marker', () => {
    const {container} = render(<FinishedBrewsTable {...props} />);

    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Name', 'Zeitraum', 'Volumen', 'Stammwürze', 'Alkohol', 'Status', 'Beschreibung', 'Aktionen'
    ]);
    expect(screen.getByText('01.09.2026 – –')).toBeInTheDocument();
    expect(screen.getByText('20 l')).toBeInTheDocument();
    expect(screen.getByText('13 °P')).toBeInTheDocument();
    expect(screen.getByText('4.50 %')).toBeInTheDocument();
    expect(screen.getByText('Gärung')).toHaveClass('brew-status-badge', 'is-active');
    expect(screen.getByLabelText('Aktives Bier')).toHaveClass('active-brew-dot');
    expect(container.querySelector('.active-row')).not.toHaveStyle({backgroundColor: 'var(--color-success-alt)'});
    expect(screen.getByRole('table').querySelector('input')).toBeNull();
  });

  it('uses placeholders and a neutral badge for completed beers', () => {
    const completed = {...brew, active: false, state: eBrewState.FINISHED, liters: undefined, originalwort: undefined, residual_extract: null, note: '', endDate: undefined};
    render(<FinishedBrewsTable {...props} brews={[completed]} />);

    expect(screen.getAllByText('–').length).toBeGreaterThan(0);
    expect(screen.getByText('Fertig')).toHaveClass('brew-status-badge');
    expect(screen.getByText('Fertig')).not.toHaveClass('is-active');
    expect(screen.queryByLabelText('Aktives Bier')).not.toBeInTheDocument();
  });
});
