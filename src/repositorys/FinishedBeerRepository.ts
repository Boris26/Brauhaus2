import {BaseRepository} from "./BaseRepository";
import {FinishedBrew, FinishedBrewCreatePayload} from "../model/FinishedBrew";

export class FinishedBeerRepository extends BaseRepository {

    static getFinishedBeers(): Promise<FinishedBrew[]> {
        return this.get<FinishedBrew[]>("finishedbeers");
    }

    static sendNewFinishedBeer(aBeer: FinishedBrewCreatePayload): Promise<FinishedBrew> {
        return this.post<FinishedBrew>("finishedbeer", aBeer);
    }

    static updateFinishedBeer(aBeer: FinishedBrew): Promise<FinishedBrew> {
        return this.put<FinishedBrew>("finishedbeer", aBeer);
    }

    static deleteFinishedBeer(aBeerId: string): Promise<void> {
        return this.delete(`finishedbeer/${aBeerId}`);
    }
}
