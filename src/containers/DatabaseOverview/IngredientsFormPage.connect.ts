import { connect } from 'react-redux';
import { Malts } from '../../model/Malt';
import { Hops } from '../../model/Hops';
import { Yeasts } from '../../model/Yeasts';
import { MaltsActions } from "../../actions/malt.actions";
import { HopsActions } from "../../actions/hops.actions";
import { YeastActions } from "../../actions/yeast.actions";
import { AdditionalIngredientsActions } from "../../actions/additionalIngredients.actions";
import {IngredientsFormPage} from './IngredientsFormPage';

const mapStateToProps = (state: any) => ({
    malts: state.maltsReducer.malts || [],
    hops: state.hopsReducer.hops || [],
    yeasts: state.yeastReducer.yeasts || [],
    additionalIngredients: state.additionalIngredientsReducer.additionalIngredients || [],
    updateStates: {
        malt: {isUpdating: state.maltsReducer.isUpdating, error: state.maltsReducer.updateError},
        hop: {isUpdating: state.hopsReducer.isUpdating, error: state.hopsReducer.updateError},
        yeast: {isUpdating: state.yeastReducer.isUpdating, error: state.yeastReducer.updateError},
        additional: {isUpdating: state.additionalIngredientsReducer.isUpdating, error: state.additionalIngredientsReducer.updateError}
    }
});

const mapDispatchToProps = (dispatch: any) => ({
    getMalt: (isFetching: boolean) => dispatch(MaltsActions.getMalts(isFetching)),
    getHop: (isFetching: boolean) => dispatch(HopsActions.getHops(isFetching)),
    getYeast: (isFetching: boolean) => dispatch(YeastActions.getYeasts(isFetching)),
    submitNewMalt: (malt: Malts) => dispatch(MaltsActions.submitNewMalt(malt)),
    submitNewHop: (hop: Hops) => dispatch(HopsActions.submitNewHop(hop)),
    submitNewYeast: (yeast: Yeasts) => dispatch(YeastActions.submitNewYeast(yeast)),
    deleteMaltById: (aId: string) => dispatch(MaltsActions.deleteMaltsById(aId)),
    deleteHopById: (aId: string) => dispatch(HopsActions.deleteHopById(aId)),
    deleteYeastById: (aId: string) => dispatch(YeastActions.deleteYeastById(aId)),
    getAdditionalIngredients: (isFetching: boolean) => dispatch(AdditionalIngredientsActions.getAdditionalIngredients(isFetching)),
    submitNewAdditionalIngredient: (aIngredient: { name: string; description?: string }) => dispatch(AdditionalIngredientsActions.submitNewAdditionalIngredient(aIngredient)),
    deleteAdditionalIngredientById: (aId: string) => dispatch(AdditionalIngredientsActions.deleteAdditionalIngredientById(aId)),
    updateIngredient: (kind: string, id: string | number, value: any) => {
        const {id: _id, ...data} = value;
        if (kind === "malt") dispatch(MaltsActions.updateMalts(id, data));
        if (kind === "hop") dispatch(HopsActions.updateHops(id, data));
        if (kind === "yeast") dispatch(YeastActions.updateYeasts(id, data));
        if (kind === "additional") dispatch(AdditionalIngredientsActions.updateAdditionalIngredient(id, data));
    },
    resetIngredientUpdate: (kind: string) => {
        if (kind === "malt") dispatch(MaltsActions.resetUpdate());
        if (kind === "hop") dispatch(HopsActions.resetUpdate());
        if (kind === "yeast") dispatch(YeastActions.resetUpdate());
        if (kind === "additional") dispatch(AdditionalIngredientsActions.resetUpdate());
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(IngredientsFormPage);
