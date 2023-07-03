import {BeerDTO} from "../model/BeerDTO";
import axios from "axios";
import {BeerActions} from "../actions/actions";
import store from "../store";

export class Repository
{
    static async submitBeer(beer: BeerDTO )
    {
        return await Repository._doSubmitBeer(beer);
    }

    static async getBeers()
    {
        return await Repository._doGetBeers();
    }

    static async getMalts()
    {
        return await Repository._doGetMalts();
    }

    static async getHops()
    {
        return await Repository._doGetHops();
    }

    static async getYeasts()
    {
        return await Repository._doGetYeasts();
    }

    private static async _doGetYeasts() {
        try {
            const response = await axios.get('http://localhost:5000/yeasts');
            if (response.status == 200) {
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
            const response = await axios.get('http://localhost:5000/hops');
            if (response.status == 200) {
                console.log(response.data);
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
            const response = await axios.get('http://localhost:5000/malts');
            if (response.status == 200) {
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
            const response = await axios.post('http://localhost:5000/beers',  jsonstring, header);
            if(response.status == 200)
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
            const response = await axios.get('http://localhost:5000/beers');
            if(response.status == 200)
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


