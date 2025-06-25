import {BeerDTO} from "../model/BeerDTO";
import axios from "axios";
import {ApplicationActions, BeerActions} from "../actions/actions";
import store from "../store";
import {DatabaseURL} from "../global";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {Yeasts} from "../model/Yeasts";
import {FinishedBrew} from "../model/FinishedBrew";
import {Beer} from "../model/Beer";

export class BeerRepository
{
    //region GET-Methoden
    static async getBeers(): Promise<Beer[] | undefined>
    {
        return await this._doGetBeers();
    }

    static async getMalts(): Promise<Malts[] | undefined>
    {
        return await this._doGetMalts();
    }

    static async getHops(): Promise<Hops[] | undefined>
    {
        return await this._doGetHops();
    }

    static async getYeasts(): Promise<Yeasts[] | undefined>
    {
        return await this._doGetYeasts();
    }

    static async getFinishedBeers(): Promise<FinishedBrew[] | undefined>
    {
        return await this._doGetFinishedBeers();
    }

    //region PRIVATE GET-Methoden
    private static async _doGetBeers(): Promise<Beer[] | undefined>
    {
        try {
            const response = await axios.get(DatabaseURL + 'beers');
            if(response.status === 200)
            {
                return  JSON.parse(response.data)
            }

        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }
    private static async _doGetMalts(): Promise<Malts[] | undefined>{
        try {
            const response = await axios.get(DatabaseURL+'malts');
            if (response.status === 200) {
                return  JSON.parse(response.data)

            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }
    private static async _doGetHops():Promise<Hops[] | undefined> {
        try {
            const response = await axios.get(DatabaseURL+'hops');
            if (response.status === 200) {

                return JSON.parse(response.data)

            }

        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }
    private static async _doGetYeasts(): Promise<Yeasts[] | undefined> {
        try {
            const response = await axios.get(DatabaseURL + 'yeasts');
            if (response.status === 200) {
                return  JSON.parse(response.data)

            }

        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }
    private static async _doGetFinishedBeers():Promise<FinishedBrew[] | undefined>
    {
        try {
            const response = await axios.get(DatabaseURL + 'finishedbeers');
            if(response.status === 200)
            {
                return response.data;
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }
    //endregion PRIVATE GET-Methoden
    //endregion GET-Methoden

    //region SUBMIT-Methoden
    static async submitBeer(beer: BeerDTO )
    {
        return await this._doSubmitBeer(beer);
    }

    static async submitMalt(malt: Malts)
    {
        return await this._doSubmitMalt(malt);
    }

    static async submitHop(hop: Hops)
    {
        return await this._doSubmitHop(hop);
    }

    static async submitYeast(yeast: Yeasts)
    {
        return await this._doSubmitYeast(yeast);
    }

    //region PRIVATE SUBMIT-Methoden
    private static async _doSubmitBeer(beer: BeerDTO)
    {
        try {
            const jsonstring = JSON.stringify(beer);
            const header = {headers: {'Content-Type': 'application/json'}};
            const response = await axios.post(DatabaseURL + 'beer',  jsonstring, header);
            if(response.status === 200)
            {
                store.dispatch(BeerActions.submitBeerSuccess(true));
            }
            else {
                store.dispatch(BeerActions.submitBeerSuccess(false));
            }

        } catch (error) {
            store.dispatch(BeerActions.submitBeerSuccess(false));
            console.error('Fehler beim API-Aufruf', error);

        }

    }
    private static async _doSubmitMalt(malt: Malts){
        try {
            const jsonstring = JSON.stringify(malt);
            const header = {headers: {'Content-Type': 'application/json'}};
            const response = await axios.post(DatabaseURL + 'malt',  jsonstring, header);
            if(response.status === 200)
            {
                store.dispatch(BeerActions.submitMaltSuccess(true));
            }
            else
            {
                store.dispatch(BeerActions.submitMaltSuccess(false));
            }
        }
        catch (error) {
            store.dispatch(BeerActions.submitMaltSuccess(false));
            console.error('Fehler beim API-Aufruf', error);
        }
    }
    private static async _doSubmitHop(hop: Hops){
        try {
            const jsonstring = JSON.stringify(hop);
            const header = {headers: {'Content-Type': 'application/json'}};
            const response = await axios.post(DatabaseURL + 'hop',  jsonstring, header);
            if(response.status === 200)
            {
                store.dispatch(BeerActions.submitHopSuccess(true));
            }
            else
            {
                store.dispatch(ApplicationActions.openErrorDialog(true,"Hopfen konnte nicht gespeichert werden", "Hopfen konnte nicht gespeichert werden"));

            }
        }
        catch (error) {
            store.dispatch(ApplicationActions.openErrorDialog(true,"Hopfen konnte nicht gespeichert werden", "Hopfen konnte nicht gespeichert werden"));

        }
    }
    private static async _doSubmitYeast(yeast: Yeasts){
        try {
            const jsonstring = JSON.stringify(yeast);
            const header = {headers: {'Content-Type': 'application/json'}};
            const url = DatabaseURL + 'yeast';
            const response = await axios.post(url,  jsonstring, header);
            if(response.status === 200)
            {
                store.dispatch(BeerActions.submitYeastSuccess(true));
                console.log("Yeast saved");
            }
            else
            {
                console.log("Yeast not saved");
                store.dispatch(BeerActions.isSubmitSuccessful(false, "Yeast not saved", "Yeast"));
            }
        }
        catch (error) {
            store.dispatch(BeerActions.isSubmitSuccessful(false, "Yeast not saved", "Yeast"));
        }
    }
    private static async _doSendFinishedBeer(beer: FinishedBrew)
    {
        try {
            const header = {headers: {'Content-Type': 'application/json'}};
            const response = await axios.post(DatabaseURL + 'finishedbeer',  beer, header);
            if(response.status === 200)
            {
                return response.data;
            }
            else
            {
                console.error("Failed to update finished beer");
                return null;
            }
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
            return null;
        }
    }
    //endregion PRIVATE SUBMIT-Methoden
    //endregion SUBMIT-Methoden

    //region DELETE-Methoden
    static async deleteFinishedBeer(beerId: string) {
        return await this._doDeleteFinishedBeer(beerId);
    }
    static async updateFinishedBeer(beer: FinishedBrew ){
        return await this._doSendFinishedBeer(beer);
    }
    static async sendNewFinishedBeer(beer: FinishedBrew ){
        return await this._doSendFinishedBeer(beer);
    }

    //region PRIVATE DELETE-Methoden
    private static async _doDeleteFinishedBeer(beerId: string){
        try {
            const response = await axios.delete(`${DatabaseURL}finishedbeer/${beerId}`);
            if (response.status === 200) {
                store.dispatch(BeerActions.deleteFinishedBeerSuccess(true, beerId));


            } else {
                return false; // Deletion failed
                console.error("Failed to delete finished beer");
            }
        } catch (error) {
            return false; // Error occurred during deletion
            console.error('Fehler beim API-Aufruf', error);
        }
    }
    //endregion PRIVATE DELETE-Methoden
    //endregion DELETE-Methoden
}
