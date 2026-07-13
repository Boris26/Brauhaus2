import {BeerDTO} from "../model/BeerDTO";
import axios from "axios";
import {DatabaseURL} from "../global";
import {FinishedBrew} from "../model/FinishedBrew";
import {Beer} from "../model/Beer";
import {BaseRepository} from "./BaseRepository";
import { BeerSubmissionResponse, hasPersistedBeerId, toBeerCreatePayload } from "../utils/beerSubmission";

export class BeerRepository extends BaseRepository {

    static async getBeers(): Promise<Beer[]> {
        return this.get<Beer[]>('beers')
    }

    static async submitBeer(aBeer: BeerDTO): Promise<BeerSubmissionResponse> {
        if (hasPersistedBeerId(aBeer)) {
            return this.put<BeerSubmissionResponse>(`beer/${aBeer.id}`, aBeer);
        }

        return this.post<BeerSubmissionResponse>("beer", toBeerCreatePayload(aBeer));
    }

    static async importBeer(aFile: File): Promise<any> {
        console.log(aFile)
        return this.postFile<any>("importbeer", aFile);
    }

    static async deleteBeer(aBeerId: string): Promise<void> {
        return this.delete(`beer/${aBeerId}`);
    }
}








