import {connect} from "react-redux";
import {Hops} from "../../../model/Hops";
import {HopsActions} from "../../../actions/hops.actions";
import {HopForm} from './CreateHopForm';

const mapStateToProps = (state: any) => ({
    isSuccessful: state.hopsReducer.isSubmitHopSuccessful
});

const mapDispatchToProps = (dispatch: any) => ({
    onSubmitHop: (hop: Hops) => dispatch(HopsActions.submitNewHop(hop))
});

export default connect(mapStateToProps, mapDispatchToProps)(HopForm);
