import {connect} from "react-redux";
import {BeerActions} from "../../actions/actions";
import getBeers = BeerActions.getBeers;
import {Main} from './Main';

const mapStateToProps = (state: any) => ({beers: state.beerDataReducer.beers});
const mapDispatchToProps =
    (dispatch: any) => ({
        getBeers: (isFetching: boolean) => dispatch(getBeers(isFetching))
    });



export default connect(mapStateToProps,mapDispatchToProps)(Main);
