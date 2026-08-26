export interface Yeasts
{
    id: number;
    name: string;
    description: string;
    temperature: number;
    type: string;
    evg: number;
}

export type YeastMasterData = Omit<Yeasts, "id">;
