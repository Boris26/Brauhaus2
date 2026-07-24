import { connect } from 'react-redux';
import { FinishedBrew } from '../../../model/FinishedBrew';
import { finishedBrewsTestData } from '../../../model/finishedBrewsTestData';
import { BeerActions } from '../../../actions/actions';
import {MobileActiveFinishedBrewView} from './MobileActiveFinishedBrewView';

const mapStateToProps = (state: any) => ({
    finishedBrews: state.beerDataReducer?.finishedBrews?.filter((brew: FinishedBrew) => brew.active) || finishedBrewsTestData.filter((brew: FinishedBrew) => brew.active)
});

const mapDispatchToProps = (dispatch: any) => ({
    getFinishedBrews: (isFetching: boolean) => {
        dispatch(BeerActions.getFinishedBeers(isFetching));
    },
    saveFinishedBrew: (brew: FinishedBrew) => {
        dispatch(BeerActions.updateActiveBeer(brew));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(MobileActiveFinishedBrewView);
