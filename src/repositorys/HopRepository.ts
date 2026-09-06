// src/repository/HopRepository.ts
import {BaseRepository} from "./BaseRepository";
import {HopMasterData, Hops} from "../model/Hops";

export class HopRepository extends BaseRepository {

    static getHops(): Promise<Hops[]> {
        return this.get<Hops[]>("hops");
    }

    static submitHop(aHop: Omit<Hops, 'id'>): Promise<Hops> {
        return this.post<Hops>("hop", aHop);
    }

    static deleteHopById(aId: string): Promise<void> {
        return this.delete(`hop/${aId}`);
    }

    static updateHop(aId: string | number, aData: HopMasterData): Promise<Hops> {
        return this.put<Hops>(`hop/${aId}`, aData);
    }
}
