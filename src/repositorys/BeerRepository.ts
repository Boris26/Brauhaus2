import {BeerDTO} from "../model/BeerDTO";
import {Beer} from "../model/Beer";
import {BaseRepository} from "./BaseRepository";
import { BeerSubmissionResponse, hasPersistedBeerId, toBeerCreatePayload } from "../utils/beerSubmission";
import {RecipeImportRequest, RecipeImportResult} from '../model/RecipeImport';

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

    static async importBeer(request: RecipeImportRequest): Promise<RecipeImportResult> {
        return this.post<RecipeImportResult>("importbeer", request, {
            headers: {'Content-Type': 'application/json'},
        });
    }

    static async deleteBeer(aBeerId: string): Promise<void> {
        return this.delete(`beer/${aBeerId}`);
    }
}





