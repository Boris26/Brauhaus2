import React, {useEffect} from 'react';
import {connect} from 'react-redux';
import {ApplicationActions, BeerActions} from '../../../actions/actions';
import {FinishedBrew} from '../../../model/FinishedBrew';
import {getFinishedBeerIdFromPath} from '../../../utils/viewRoutes';
import {Views} from '../../../enums/eViews';
import FinishedBrewDetails from './FinishedBrewDetails';
import './FermentationDetails.css';

interface Props {
  finishedBrews?: FinishedBrew[];
  isFetching: boolean;
  loadFinishedBrews: () => void;
  close: () => void;
}

export const FermentationMeasurementsPageView: React.FC<Props> = ({finishedBrews, isFetching, loadFinishedBrews, close}) => {
  const finishedBeerId = typeof window === 'undefined' ? undefined : getFinishedBeerIdFromPath(window.location.pathname);
  useEffect(() => { if (finishedBrews === undefined) loadFinishedBrews(); }, [finishedBrews, loadFinishedBrews]);
  const brew = finishedBrews?.find(value => value.id === finishedBeerId);

  if (finishedBrews === undefined || isFetching) return <main className="fermentation-route-state" role="status">Messdaten werden geladen …</main>;
  if (!finishedBeerId || !brew) return <main className="fermentation-route-state"><h2>Keine Messdaten gefunden</h2><p>Das ausgewählte Bier ist nicht verfügbar.</p><button onClick={close}>Zurück zu den fertigen Bieren</button></main>;

  return <main className="fermentation-measurements-route"><FinishedBrewDetails brew={brew} viewMode="measurements" closeMeasurements={close} /></main>;
};

const mapState = (state: any) => ({
  finishedBrews: state.beerDataReducer.finishedBrews,
  isFetching: Boolean(state.beerDataReducer.isFetching),
});
const mapDispatch = (dispatch: any) => ({
  loadFinishedBrews: () => dispatch(BeerActions.getFinishedBeers(true)),
  close: () => dispatch(ApplicationActions.setViewState(Views.FINISHED_BREWS)),
});
export default connect(mapState, mapDispatch)(FermentationMeasurementsPageView);
