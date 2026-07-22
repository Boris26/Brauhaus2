import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { Beer } from '../../model/Beer';
import { FinishedBrew } from '../../model/FinishedBrew';
import { eBrewState } from '../../enums/eBrewState';
import { BrewingStatus, ProcessMode, ProcessPhase, ProcessState, WaitingFor } from '../../model/brewingStatus.types';

const beer: Beer = {
  id: 'beer-1',
  name: 'Boris Kellerbräu',
  type: 'Kellerbier',
  color: 'bernstein',
  alcohol: 5,
  originalwort: 12,
  bitterness: 25,
  description: '',
  rating: 5,
  mashVolume: 20,
  spargeVolume: 10,
  cookingTime: 60,
  cookingTemperatur: 99,
  fermentation: [],
  malts: [{ id: 'm1', name: 'Pilsner Malz', description: '', EBC: 4, quantity: 5000 }],
  wortBoiling: { totalTime: 60, hops: [{ id: 'h1', name: 'Hallertau', description: '', alpha: 4, quantity: 50, time: 60 }] },
  fermentationMaturation: { fermentationTemperature: 18, carbonation: 5, yeast: [{ id: 'y1', name: 'US-05', description: '', EVG: '75', temperature: '18', type: 'Obergärig', quantity: 1 }] },
  additionalIngredients: [],
};

const brew: FinishedBrew = {
  id: 'finished-1',
  name: 'Boris Kellerbräu',
  beer_id: 'beer-1',
  startDate: '2026-07-01',
  liters: 20,
  originalwort: 12,
  residual_extract: 3,
  note: 'läuft gut',
  active: true,
  state: eBrewState.FERMENTATION,
};

const activeStatus: BrewingStatus = {
  elapsedTime: 300,
  currentTime: 1783885211,
  process: { state: ProcessState.ACTIVE },
  currentStep: { phase: ProcessPhase.RAST, mode: ProcessMode.TIMER_RUNNING, name: 'Maltoserast', duration: 600, elapsedTime: 300, remainingTime: 300 },
  temperature: { current: 64.2, target: 65 },
  hardware: { heater: 'ON', agitator: 'ON' },
  waiting: { waitingFor: WaitingFor.NONE, canConfirm: false },
  error: { code: null, details: null },
};

const renderDashboard = (overrides: Partial<React.ComponentProps<typeof DashboardPage>> = {}) => render(
  <DashboardPage
    beers={[beer]}
    finishedBrews={[brew]}
    isFetching={false}
    beerToBrew={beer}
    brewingStatus={undefined}
    isBackendAvailable={true}
    getBeers={jest.fn()}
    getFinishedBrews={jest.fn()}
    {...overrides}
  />
);

describe('DashboardPage', () => {
  it('renders KPI cards and empty production status', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Rezepte')).toBeInTheDocument();
    expect(screen.getByText('Gesamt gebraut')).toBeInTheDocument();
    expect(screen.getByText('Kein aktiver Brauvorgang.')).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('renders an active production as compact status card', () => {
    renderDashboard({ brewingStatus: activeStatus });

    expect(screen.getAllByText('Boris Kellerbräu').length).toBeGreaterThan(0);
    expect(screen.getByText(/Maltoserast/)).toBeInTheDocument();
    expect(screen.getByText('Heizung')).toBeInTheDocument();
    expect(screen.getByText('Rührwerk')).toBeInTheDocument();
    expect(screen.getByText('Fortschritt 50 %')).toBeInTheDocument();
  });

  it('keeps partial backend errors local to production card', () => {
    renderDashboard({ isBackendAvailable: false, brewingStatus: undefined });

    expect(screen.getByText('Der aktuelle Produktionsstatus konnte nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Top 5 Malze')).toBeInTheDocument();
  });

  it('loads missing recipes and finished brews through existing actions', () => {
    const getBeers = jest.fn();
    const getFinishedBrews = jest.fn();
    renderDashboard({ beers: undefined, finishedBrews: undefined, getBeers, getFinishedBrews });

    expect(getBeers).toHaveBeenCalledWith(true);
    expect(getFinishedBrews).toHaveBeenCalledWith(true);
  });
});
