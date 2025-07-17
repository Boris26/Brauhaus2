import { createFuzzy, fuzzyFind } from './fuzzyUtil';
import {Malts} from "../../model/Malt";
import {Hops} from "../../model/Hops";
import {Yeasts} from "../../model/Yeasts";
import {Beer, Hop, Malt, Yeast} from '../../model/Beer';
/**
 * Parst ein Beer-Objekt im Standardformat – Zutaten werden via Fuzzy mit den globalen Listen abgeglichen,
 * dabei wird jeweils die ganze Instanz (inkl. id) übernommen und nur Menge/Zeit/Alpha etc. überschrieben.
 */
export function parseBeerJsonStandard(
    json: any,
    allMalts: Malts[],
    allHops: Hops[],
    allYeasts: Yeasts[]
): { beer: Beer; unknownMalts: string[]; unknownHops: string[]; unknownYeasts: string[] } {
    const maltFuse = createFuzzy(allMalts);
    const hopFuse = createFuzzy(allHops);
    const yeastFuse = createFuzzy(allYeasts);

    const unknownMalts: string[] = [];
    const unknownHops: string[] = [];
    const unknownYeasts: string[] = [];

    // Malze: Fuzzy finden, dann Menge aus Rezept übernehmen, Rest aus DB
    const malts: Malt[] = (json.malts || []).map((imported: any) => {
        const found = fuzzyFind(maltFuse, imported.name);
        if (!found) unknownMalts.push(imported.name);
        return found
            ? { ...found, quantity: imported.quantity }
            : { id: '', name: imported.name, description: imported.description ?? '', EBC: imported.EBC ?? 0, quantity: imported.quantity };
    });

    // Hopfen: Fuzzy finden, Menge/Zeit/Alpha übernehmen, Rest aus DB
    const hops: Hop[] = ((json.wortBoiling && json.wortBoiling.hops) || []).map((imported: any) => {
        const found = fuzzyFind(hopFuse, imported.name);
        if (!found) unknownHops.push(imported.name);
        return found
            ? { ...found, quantity: imported.quantity, time: imported.time, alpha: imported.alpha }
            : { id: '', name: imported.name, description: imported.description ?? '', alpha: imported.alpha ?? 0, quantity: imported.quantity, time: imported.time };
    });

    // Hefe: Fuzzy finden, Menge übernehmen, Rest aus DB
    const yeasts: Yeast[] = ((json.fermentationMaturation && json.fermentationMaturation.yeast) || []).map((imported: any) => {
        const found = fuzzyFind(yeastFuse, imported.name);
        if (!found) unknownYeasts.push(imported.name);
        return found
            ? { ...found, quantity: imported.quantity }
            : { id: '', name: imported.name, description: imported.description ?? '', EVG: imported.EVG ?? '', temperature: imported.temperature ?? '', type: imported.type ?? '', quantity: imported.quantity };
    });

    const beer: Beer = {
        ...json,
        malts,
        wortBoiling: { ...json.wortBoiling, hops },
        fermentationMaturation: { ...json.fermentationMaturation, yeast: yeasts }
    };

    return { beer, unknownMalts, unknownHops, unknownYeasts };
}
