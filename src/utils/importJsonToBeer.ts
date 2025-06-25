import {Beer, FermentationSteps, Hop, Malt, Yeast} from "../model/Beer";


/**
 * Wandelt ein JSON-Objekt (z.B. aus MMum) in ein Beer-Objekt um.
 */
export function importJsonToBeer(json: any): Beer {
    const malts: Malt[] = (json.Malze || []).map((m: any, idx: number) => ({
        id: String(idx),
        name: m.Name ?? '',
        description: '',
        EBC: 0,
        quantity: m.Menge ??  0 // g → kg
    }));

    const hops: Hop[] = (json.Hopfenkochen || []).map((h: any, idx: number) => ({
        id: String(idx),
        name: h.Sorte ?? '',
        description: '',
        alpha: h.Alpha ?? 0,
        quantity: h.Menge ?? 0,
        time: h.Zeit ?? 0
    }));

    // Einmaischen Schritt hinzufügen, falls vorhanden
    const fermentation: FermentationSteps[] = [];
    if (json.Einmaischtemperatur !== undefined) {
        fermentation.push({
            type: 'Einmaischen',
            temperature: json.Einmaischtemperatur,
            time: 0
        });
    }

    // Rasten mit Typ "Rast1", "Rast2", ...
    (json.Rasten || []).forEach((r: any, idx: number) => {
        fermentation.push({
            type: `Rast ${idx + 1}`,
            temperature: r.Temperatur ?? 0,
            time: r.Zeit ?? 0
        });
    });

    // Abmaischen Schritt hinzufügen, falls vorhanden
    if (json.Abmaischtemperatur !== undefined) {
        fermentation.push({
            type: 'Abmaischen',
            temperature: json.Abmaischtemperatur,
            time: 0
        });
    }

    // Kochen Schritt hinzufügen, falls vorhanden
    if (json.Kochzeit_Wuerze !== undefined) {
        fermentation.push({
            type: 'Kochen',
            temperature: 98, // Standard-Kochtemperatur, kann ggf. angepasst werden
            time: json.Kochzeit_Wuerze
        });
    }

    const yeast: Yeast[] = [{
        id: '0',
        name: json.Hefe ?? '',
        description: '',
        EVG: json.Endvergaerungsgrad ? String(json.Endvergaerungsgrad) : '',
        temperature: json.Gaertemperatur ? String(json.Gaertemperatur) : '',
        type: '',
        quantity: 0
    }];

    return {
        id: Date.now(),
        name: json.Name ?? '',
        type: json.Sorte ?? '',
        color: String(json.Farbe ?? ''),
        alcohol: json.Alkohol ?? 0,
        originalwort: json.Stammwuerze ?? 0,
        bitterness: json.Bittere ?? 0,
        description: json.Kurzbeschreibung ?? '',
        rating: 0,
        mashVolume: json.Infusion_Hauptguss ?? 0,
        spargeVolume: json.Nachguss ?? 0,
        cookingTime: json.Kochzeit_Wuerze ?? 0,
        cookingTemperatur: 98,
        fermentation,
        malts,
        wortBoiling: {
            totalTime: json.Kochzeit_Wuerze ?? 0,
            hops
        },
        fermentationMaturation: {
            fermentationTemperature: Number(json.Gaertemperatur ?? 0),
            carbonation: json.Karbonisierung ?? 0,
            yeast
        }
    };
}
