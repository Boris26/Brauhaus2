import {connect} from "react-redux";
import {Malts} from "../../../model/Malt";
import {MaltsActions} from "../../../actions/malt.actions";
import {MaltForm} from './CreateMaltForm';

const mapStateToProps = (state: any) => ({
    isSuccessful: state.beerDataReducer.isSubmitMaltSuccessful
});
const mapDispatchToProps = (dispatch: any) => ({
    onSubmitMalt: (malt: Malts) => dispatch(MaltsActions.submitNewMalt(malt)),

});
export default connect(mapStateToProps,mapDispatchToProps)(MaltForm);
