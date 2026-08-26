export interface Hops
{
    id: number;
    name: string;
    type: string;
    alpha: number;
    description: string;
}

export type HopMasterData = Omit<Hops, "id">;
