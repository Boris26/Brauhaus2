import {ProductionActions} from '../actions/actions';
import {initialProductionState, productionReducer} from './productionReducer';

describe('productionReducer waterStatus', () => {
    it('starts with the complete new WaterStatus contract', () => {
        expect(initialProductionState.waterStatus).toEqual({filledLiters: 0, targetLiters: 0, openClose: false});
    });

    it('stores filledLiters and targetLiters without swapping fields', () => {
        const waterStatus = {filledLiters: 0.0286, targetLiters: 16.6, openClose: true};

        const nextState = productionReducer(initialProductionState, ProductionActions.setWaterStatus(waterStatus));

        expect(nextState.waterStatus).toEqual(waterStatus);
    });
});
