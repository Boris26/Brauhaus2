import { createFuzzy, fuzzyFind } from './fuzzyUtil';
import {Malts} from "../../model/Malt";
import {Hops} from "../../model/Hops";
import {Yeasts} from "../../model/Yeasts";
import {Beer, Hop, Malt, Yeast} from '../../model/Beer';

type ForeignFormat = Record<string, any>;

/**
 * Parst ein Fremdformat-Objekt in das Beer-Format.
 */
export function parseBeerJsonForeign(
    foreignJson: ForeignFormat,
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

    const malts: Malt[] = [];
    for (let i = 1; i <= 5; i++) {
        const name = foreignJson[`Malz${i}`];
        const quantity = foreignJson[`Malz${i}_Menge`];
        if (name && quantity) {
            const found = fuzzyFind(maltFuse, name) as Malts;
            if (!found) unknownMalts.push(name);
            malts.push(
                found
                    ? { id: found.id,name: found.name,description: found.description, EBC: found.ebc ,quantity: Number(quantity*1000) }
                    : { id: '', name, description: '', EBC: 0, quantity: Number(quantity*1000) }
            );
        }
    }

    const hops: Hop[] = [];
    for (let i = 1; i <= 5; i++) {
        const name = foreignJson[`Hopfen_${i}_Sorte`];
        const quantity = foreignJson[`Hopfen_${i}_Menge`];
        const alpha = foreignJson[`Hopfen_${i}_alpha`];
        const time = foreignJson[`Hopfen_${i}_Kochzeit`];
        if (name && quantity && time) {
            const found = fuzzyFind(hopFuse, name) as Hops;
            if (!found) unknownHops.push(name);
            hops.push(
                found
                    ? {
                        id: String(found.id),
                        name: found.name,
                        description: found.description,
                        alpha: Number(alpha),
                        quantity: Number(quantity),
                        time: Number(time)
                    }
                    : {
                        id: '',
                        name,
                        description: '',
                        alpha: Number(alpha),
                        quantity: Number(quantity),
                        time: Number(time)
                    }
            );
        }
    }

    const yeastName = foreignJson["Hefe"];
    const foundYeast = yeastName ? fuzzyFind(yeastFuse, yeastName) as Yeasts : undefined;
    if (yeastName && !foundYeast) unknownYeasts.push(yeastName);
    const yeasts: Yeast[] = yeastName
        ? [
            foundYeast
                ? { id: String(foundYeast.id), name: foundYeast.name, description: foundYeast.description, EVG: foundYeast.evg, temperature: foundYeast.temperature, type: foundYeast.type, quantity: 1 }
                : { id: '', name: yeastName, description: '', EVG: foreignJson["Endvergaerungsgrad"] || '', temperature: foreignJson["Gaertemperatur"] || '', type: '', quantity: 1 }
        ]
        : [];

    // Einmaischen
    const fermentation: any[] = [];
    if (foreignJson['Infusion_Einmaischtemperatur']) {
        fermentation.push({
            type: 'Einmaischen',
            temperature: Number(foreignJson['Infusion_Einmaischtemperatur']),
            time: 0
        });
    }
    for (let i = 1; i <= 4; i++) {
        const temp = foreignJson[`Infusion_Rasttemperatur${i}`];
        const time = foreignJson[`Infusion_Rastzeit${i}`];
        if (temp && time) {
            fermentation.push({
                type: `Rast${i}`,
                temperature: Number(temp),
                time: Number(time)
            });
        }
    }
    if (foreignJson['Abmaischtemperatur']) {
        fermentation.push({
            type: 'Abmaischen',
            temperature: Number(foreignJson['Abmaischtemperatur']),
            time: 0
        });
    }

    const beer: Beer = {
        id: '',
        name: foreignJson["Name"] || '',
        type: foreignJson["Sorte"] || '',
        color: foreignJson["Farbe"] || '',
        alcohol: Number(foreignJson["Alkohol"] || 0),
        originalwort: Number(foreignJson["Stammwuerze"] || 0),
        bitterness: Number(foreignJson["Bittere"] || 0),
        description: foreignJson["Kurzbeschreibung"] || '',
        rating: 0,
        mashVolume: Number(foreignJson["Infusion_Hauptguss"] || 0),
        spargeVolume: Number(foreignJson["Nachguss"] || 0),
        cookingTime: Number(foreignJson["Kochzeit_Wuerze"] || 0),
        cookingTemperatur: 100,
        fermentation,
        malts,
        wortBoiling: {
            totalTime: Number(foreignJson["Kochzeit_Wuerze"] || 0),
            hops
        },
        fermentationMaturation: {
            fermentationTemperature: Number(foreignJson["Gaertemperatur"] || 0),
            carbonation: Number(foreignJson["Karbonisierung"] || 0),
            yeast: yeasts
        }
    };

    return { beer, unknownMalts, unknownHops, unknownYeasts };
}
