import {connect} from "react-redux";
import {FinishedBrew, FinishedBrewCreatePayload} from "../../../model/FinishedBrew";
import {finishedBrewsTestData} from "../../../model/finishedBrewsTestData";
import {BeerActions} from "../../../actions/actions";
import {FinishedBrewsTable} from './FinishedBrewsTable';

const mapStateToProps = (state: any) => ({
    brews: state.beerDataReducer.finishedBrews || finishedBrewsTestData,
    beers: state.beerDataReducer.beers || [],
    savingFinishedBrewIds: state.beerDataReducer.savingFinishedBrewIds || [],
    finishedBrewUpdateErrors: state.beerDataReducer.finishedBrewUpdateErrors || {},
    isAddingFinishedBrew: Boolean(state.beerDataReducer.isAddingFinishedBrew),
    addFinishedBrewError: state.beerDataReducer.addFinishedBrewError,
});

const mapDispatchToProps = (dispatch: any) => ({
    onSave: (brew: FinishedBrew) => {
        dispatch(BeerActions.updateActiveBeer(brew));
    },
    onCreate: (brew: FinishedBrewCreatePayload) => {
        dispatch(BeerActions.addFinishedBrew(brew));
    },
    exportPdf: (brews: FinishedBrew[]) => {
        dispatch(BeerActions.generateFinishedBrewsPdf(brews));
    },
    getFinishedBrews: (isFetching: boolean) => {
        dispatch(BeerActions.getFinishedBeers(isFetching));
    },
    onDelete: (id: string) => {
        dispatch(BeerActions.deleteFinishedBeer(id));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(FinishedBrewsTable);
