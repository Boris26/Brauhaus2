import {BaseRepository} from "./BaseRepository";
import {FinishedBrew} from "../model/FinishedBrew";

export class FinishedBeerRepository extends BaseRepository {

    static getFinishedBeers(): Promise<FinishedBrew[]> {
        return this.get<FinishedBrew[]>("finishedbeers");
    }

    static sendNewFinishedBeer(aBeer: FinishedBrew): Promise<FinishedBrew> {
        return this.post<FinishedBrew>("finishedbeer", aBeer);
    }

    static updateFinishedBeer(aBeer: FinishedBrew): Promise<FinishedBrew> {
        return this.post<FinishedBrew>("finishedbeer", aBeer);
    }

    static deleteFinishedBeer(aBeerId: string): Promise<void> {
        return this.delete(`finishedbeer/${aBeerId}`);
    }
}
