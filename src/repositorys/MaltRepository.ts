import {BaseRepository} from "./BaseRepository";
import {MaltMasterData, Malts} from "../model/Malt";

export class MaltRepository extends BaseRepository {

    static getMalts(): Promise<Malts[]> {
        return this.get<Malts[]>("malts");
    }

    static submitMalt(aMalt: Omit<Malts, 'id'>): Promise<Malts> {
        return this.post<Malts>("malt", aMalt);
    }

    static deleteMaltById(aId: string): Promise<void> {
        return this.delete(`malt/${aId}`);
    }

    static updateMalt(aId: string | number, aData: MaltMasterData): Promise<Malts> {
        return this.put<Malts>(`malt/${aId}`, aData);
    }
}
