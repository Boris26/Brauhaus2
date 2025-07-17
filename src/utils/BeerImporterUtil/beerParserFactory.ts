import { Hops } from '../../model/Hops';
import { Malts } from '../../model/Malt';
import { parseBeerJsonMMM } from './beerParserMMM';
import {Yeasts} from "../../model/Yeasts";
import {parseBeerJsonForeign} from "./parseBeerJsonForeign";
import {parseBeerJsonStandard} from "./parseBeerJsonStandard";

// ...davor bleibt alles gleich

export function parseBeerWithFactory(
    json: any,
    allMalts: Malts[],
    allHops: Hops[],
    allYeasts: Yeasts[]
) {
    console.debug(allMalts, allHops, allYeasts);
    // Standardformat
    if ('malts' in json && 'wortBoiling' in json) {
        console.debug("Parsing Beer JSON im Standardformat");
        return parseBeerJsonStandard(json, allMalts, allHops, allYeasts);
    }
    // Fremdformat 1
    if ('Name' in json && 'Malz1' in json) {
        console.debug("Parsing Beer JSON im Fremdformat 1");
        return parseBeerJsonForeign(json, allMalts, allHops, allYeasts);
    }
    // MMM-Format
    if ('Rezeptquelle' in json && 'Malze' in json && 'Hopfenkochen' in json) {
        console.debug("Parsing Beer JSON im MMM-Format");
        return parseBeerJsonMMM(json, allMalts, allHops, allYeasts);
    }
    throw new Error("Unbekanntes JSON-Format!");
}
