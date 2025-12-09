// src/repository/YeastRepository.ts
import {BaseRepository} from "./BaseRepository";
import {Yeasts} from "../model/Yeasts";

export class YeastRepository extends BaseRepository {

    static getYeasts(): Promise<Yeasts[]> {
        return this.get<Yeasts[]>("yeasts");
    }

    static submitYeast(aYeast: Yeasts): Promise<void> {
        return this.post("yeast", aYeast);
    }
}
