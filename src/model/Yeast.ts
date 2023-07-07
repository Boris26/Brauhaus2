import {YeastEVG} from "../enums/eYeastType";

export interface Yeasts
{
    id: number;
    name: string;
    description: string;
    temperature: string;
    type: string;
    evg: string;
}
