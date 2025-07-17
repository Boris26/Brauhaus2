import { createFuzzy, fuzzyFind } from './fuzzyUtil';
import {Beer, Hop, Malt, Yeast} from "../../model/Beer";
import {Yeasts} from "../../model/Yeasts";
import {Hops} from "../../model/Hops";
import {Malts} from "../../model/Malt";

type MMMFormat = Record<string, any>;

/**
 * Parst ein MaischeMalzundMehr-Rezept-Export in das Beer-Objekt.
 */
export function parseBeerJsonMMM(
    mmmJson: MMMFormat,
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

    // --- Malze extrahieren ---
    const malts: Malt[] = (mmmJson.Malze || []).map((imported: any) => {
        const found = fuzzyFind(maltFuse, imported.Name) as unknown as Malts;
        if (!found) unknownMalts.push(imported.Name);
        return found
            ? {
                id: found.id ? found.id : '',
                name: found.name,
                description: found.description,
                EBC: found.ebc,
                quantity: imported.Menge * 1000 // Umrechnung kg -> g
            }
            : {
                id: '',
                name: imported.Name,
                description: '',
                EBC: 0,
                quantity: imported.Menge * 1000 // Umrechnung kg -> g
            };
    });

    // --- Hopfen extrahieren ---
    const hops: Hop[] = (mmmJson.Hopfenkochen || []).map((imported: any) => {
        const found = fuzzyFind(hopFuse, imported.Sorte) as unknown as Hops;
        if (!found) unknownHops.push(imported.Sorte);
        return found
            ? {
                id: found.id ? found.id : '',
                name: found.name,
                description: found.description,
                alpha: Number(imported.Alpha),
                quantity: Number(imported.Menge),
                time: Number(imported.Zeit)
            }
            : {
                id: '',
                name: imported.Sorte,
                description: '',
                alpha: Number(imported.Alpha),
                quantity: Number(imported.Menge),
                time: Number(imported.Zeit)
            };
    });

    // --- Hefe extrahieren ---
    const yeastName = mmmJson.Hefe;
    const foundYeast = yeastName ? fuzzyFind(yeastFuse, yeastName) as unknown as Yeasts : undefined;
    if (yeastName && !foundYeast) unknownYeasts.push(yeastName);
    const yeasts: Yeast[] = yeastName
        ? [
            foundYeast
                ? {
                    id: String(foundYeast.id),
                    name: foundYeast.name,
                    description: foundYeast.description,
                    EVG: foundYeast.evg,
                    temperature: foundYeast.temperature,
                    type: foundYeast.type,
                    quantity: 1
                }
                : {
                    id: '',
                    name: yeastName,
                    description: '',
                    EVG: mmmJson.Endvergaerungsgrad || '',
                    temperature: mmmJson.Gaertemperatur || '',
                    type: '',
                    quantity: 1
                }
        ]
        : [];

    // --- Fermentationsschritte (Maischen + Rasten + Abmaischen) ---
    const fermentation: any[] = [];
    if (mmmJson.Einmaischtemperatur) {
        fermentation.push({
            type: 'Einmaischen',
            temperature: Number(mmmJson.Einmaischtemperatur),
            time: 0
        });
    }
    (mmmJson.Rasten || []).forEach((rast: any, idx: number) => {
        fermentation.push({
            type: `Rast${idx + 1}`,
            temperature: Number(rast.Temperatur),
            time: Number(rast.Zeit)
        });
    });
    if (mmmJson.Abmaischtemperatur) {
        fermentation.push({
            type: 'Abmaischen',
            temperature: Number(mmmJson.Abmaischtemperatur),
            time: 0
        });
    }

    const beer: Beer = {
        id: '',
        name: mmmJson.Name || '',
        type: mmmJson.Sorte || '',
        color: String(mmmJson.Farbe || ''),
        alcohol: Number(mmmJson.Alkohol || 0),
        originalwort: Number(mmmJson.Stammwuerze || 0),
        bitterness: Number(mmmJson.Bittere || 0),
        description: mmmJson.Kurzbeschreibung || '',
        rating: 0,
        mashVolume: Number(mmmJson.Hauptguss || 0),
        spargeVolume: Number(mmmJson.Nachguss || 0),
        cookingTime: Number(mmmJson.Kochzeit_Wuerze || 0),
        cookingTemperatur: 100,
        fermentation,
        malts,
        wortBoiling: {
            totalTime: Number(mmmJson.Kochzeit_Wuerze || 0),
            hops
        },
        fermentationMaturation: {
            fermentationTemperature: Number(mmmJson.Gaertemperatur || 0),
            carbonation: Number(mmmJson.Karbonisierung || 0),
            yeast: yeasts
        }
    };

    return { beer, unknownMalts, unknownHops, unknownYeasts };
}
