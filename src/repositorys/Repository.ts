import {BeerDTO} from "../model/BeerDTO";
import {Observable} from "rxjs";

export class Repository
{
    static submitBeer$(beer: BeerDTO ):Promise<string | null>
    {
        console.log("Repository.submitBeer$");
        return this._doSubmitBeer(beer);
    }
    private static async _doSubmitBeer(beer: BeerDTO): Promise<string | null>
    {
const request =  {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(beer),
        };

            const responseJson = await fetch('http://localhost:5000/beer', request);
            if (responseJson.status === 200) {
                return responseJson.json();
            }
            return null;

}}
