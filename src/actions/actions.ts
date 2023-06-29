import {Beer} from "../model/Beer";
import {Views} from "../enums/eViews";
import {BeerDTO} from "../model/BeerDTO";

export namespace BeerActions {

    export enum ActionTypes {
        SUBMIT_BEER = 'BeerActions.SUBMIT_BEER',
        SET_SELECTED_BEER = 'BeerActions.SET_SELECTED_BEER',
        SET_VIEW = 'BeerActions.SET_VIEW'
    }


    export interface SubmitBeer {
        readonly type: ActionTypes.SUBMIT_BEER
        payload: {
            beer: BeerDTO
        }
    }

    export interface SetSelectedBeer {
        readonly type: ActionTypes.SET_SELECTED_BEER
        payload: { beer: Beer }
    }

    export interface SetView {
        readonly type: ActionTypes.SET_VIEW
        payload: { view: Views }
    }


    export type AllBeerActions =
        SubmitBeer |
        SetSelectedBeer |
        SetView
        ;

    export function submitBeer(aBeer: BeerDTO): SubmitBeer {
        return {
            type: ActionTypes.SUBMIT_BEER,
            payload: {beer: aBeer},
        }
    }

    export function setViewState(aView: Views): SetView {
        return {
            type: ActionTypes.SET_VIEW,
            payload: {view: aView},
        };
    }

    export function setSelectedBeer(aBeer:Beer): SetSelectedBeer {
        return {
            type: ActionTypes.SET_SELECTED_BEER,
            payload: {beer: aBeer}
        }
    }
}
