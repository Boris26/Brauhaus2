import {BeerDTO} from "../model/BeerDTO";
import axios from "axios";
import {DatabaseURL} from "../global";
import {FinishedBrew} from "../model/FinishedBrew";
import {Beer} from "../model/Beer";
import {BaseRepository} from "./BaseRepository";

export class BeerRepository extends BaseRepository {

    static async getBeers(): Promise<Beer[]> {
        return this.get<Beer[]>('beers')
    }

    static async submitBeer(aBeer: BeerDTO): Promise<Beer> {
        console.log(aBeer);
        return this.post<Beer>("beer", aBeer);
    }

    static async importBeer(aFile: File): Promise<any> {
        console.log(aFile)
        return this.postFile<any>("importbeer", aFile);
    }
}









