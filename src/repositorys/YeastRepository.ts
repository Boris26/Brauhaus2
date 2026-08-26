// src/repository/YeastRepository.ts
import {BaseRepository} from "./BaseRepository";
import {YeastMasterData, Yeasts} from "../model/Yeasts";

export class YeastRepository extends BaseRepository {

    static getYeasts(): Promise<Yeasts[]> {
        return this.get<Yeasts[]>("yeasts");
    }

    static submitYeast(aYeast: Yeasts): Promise<void> {
        return this.post("yeast", aYeast);
    }

    static deleteYeastById(aId: string): Promise<void> {
        return this.delete(`yeast/${aId}`);
    }

    static updateYeast(aId: string | number, aData: YeastMasterData): Promise<Yeasts> {
        return this.put<Yeasts>(`yeast/${aId}`, aData);
    }
}
