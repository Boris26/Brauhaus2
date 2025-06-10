import {BeerDTO} from "../model/BeerDTO";
import axios from "axios";
import {ApplicationActions, BeerActions} from "../actions/actions";
import store from "../store";
import {DatabaseURL} from "../global";
import {Malts} from "../model/Malt";
import {Hops} from "../model/Hops";
import {Yeasts} from "../model/Yeast";

export class BeerRepository
{
    static async submitBeer(beer: BeerDTO )
    {
        return await BeerRepository._doSubmitBeer(beer);
    }

    static async submitMalt(malt: Malts)
    {
        return await BeerRepository._doSubmitMalt(malt);
    }

    static async submitHop(hop: Hops)
    {
        return await BeerRepository._doSubmitHop(hop);
    }

    static async submitYeast(yeast: Yeasts)
    {
        return await BeerRepository._doSubmitYeast(yeast);
    }

    static async getBeers()
    {
        return await BeerRepository._doGetBeers();
    }

    static async getMalts()
    {
        return await BeerRepository._doGetMalts();
    }

    static async getHops()
    {
        return await BeerRepository._doGetHops();
    }

    static async getYeasts()
    {
        return await BeerRepository._doGetYeasts();
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

    private static async _doGetYeasts() {
        try {
            const response = await axios.get(DatabaseURL + 'yeasts');
            if (response.status === 200) {
               const object = JSON.parse(response.data)
               store.dispatch(BeerActions.getYeastsSuccess(object, true));
            }
            else {
                store.dispatch(BeerActions.getYeastsSuccess(null, false));
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doGetHops() {
        try {
            const response = await axios.get(DatabaseURL+'hops');
            if (response.status === 200) {

                const object = JSON.parse(response.data)
                store.dispatch(BeerActions.getHopsSuccess(object, true));
            }
            else {
                store.dispatch(BeerActions.getHopsSuccess(null, false));
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

    private static async _doGetMalts() {
        try {
            const response = await axios.get(DatabaseURL+'malts');
            if (response.status === 200) {
                console.log(response.data);
                const object = JSON.parse(response.data)
                store.dispatch(BeerActions.getMaltsSuccess(object, true));
            }
            else {
                store.dispatch(BeerActions.getMaltsSuccess(null, false));
            }
        }
        catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }
    }

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
    private static async _doGetBeers()
    {
        try {
            const response = await axios.get(DatabaseURL + 'beers');
            if(response.status === 200)
            {
               const object = JSON.parse(response.data)
               store.dispatch(BeerActions.getBeersSuccess(object));
            }


            return response.data;
        } catch (error) {
            console.error('Fehler beim API-Aufruf', error);
        }

    }
}


