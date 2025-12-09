// src/repository/HopRepository.ts
import {BaseRepository} from "./BaseRepository";
import {Hops} from "../model/Hops";

export class HopRepository extends BaseRepository {

    static getHops(): Promise<Hops[]> {
        return this.get<Hops[]>("hops");
    }

    static submitHop(aHop: Hops): Promise<void> {
        return this.post("hop", aHop);
    }
}
