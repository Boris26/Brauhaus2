export interface Malts {
    id: string | number;
    name: string;
    description: string;
    ebc: number;
}

export type MaltMasterData = Omit<Malts, "id">;
