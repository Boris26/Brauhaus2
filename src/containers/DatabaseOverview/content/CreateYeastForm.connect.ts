import {connect} from "react-redux";
import {Yeasts} from "../../../model/Yeasts";
import {YeastActions} from "../../../actions/yeast.actions";
import {YeastForm} from './CreateYeastForm';

const mapStateToProps = (state: any) => ({
    isSuccessful: state.yeastReducer.isSubmitYeastSuccessful
});
const mapDispatchToProps = (dispatch: any) => ({
    onSubmitMalt: (yeast: Yeasts) => dispatch(YeastActions.submitNewYeast(yeast)),

});
export default connect(mapStateToProps,mapDispatchToProps)(YeastForm);
