import {BaseRepository} from "./BaseRepository";
import {Malts} from "../model/Malt";

export class MaltRepository extends BaseRepository {

    static getMalts(): Promise<Malts[]> {
        return this.get<Malts[]>("malts");
    }

    static submitMalt(aMalt: Malts): Promise<void> {
        return this.post("malt", aMalt);
    }
}
