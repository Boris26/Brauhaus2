import {fireEvent, render, screen} from '@testing-library/react';
import {FermentationMeasurementsPageView} from './FermentationMeasurementsPage';

describe('FermentationMeasurementsPage', () => {
  beforeEach(() => window.history.replaceState(null, '', '/finished-brews/brew-1/measurements'));

  it('loads the finished brews once when direct navigation has no brew data yet', () => {
    const loadFinishedBrews = jest.fn();
    render(<FermentationMeasurementsPageView finishedBrews={undefined} isFetching={false} loadFinishedBrews={loadFinishedBrews} close={jest.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Messdaten werden geladen …');
    expect(loadFinishedBrews).toHaveBeenCalledTimes(1);
  });

  it('shows a controlled empty state for an unknown selected beer and navigates back', () => {
    const close = jest.fn();
    render(<FermentationMeasurementsPageView finishedBrews={[]} isFetching={false} loadFinishedBrews={jest.fn()} close={close} />);

    expect(screen.getByRole('heading', {name: 'Keine Messdaten gefunden'})).toBeInTheDocument();
    expect(screen.queryByText(/HTTP|404|undefined/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Zurück zu den fertigen Bieren'));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
