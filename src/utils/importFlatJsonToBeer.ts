import { Beer, Malt, Hop, FermentationSteps, Yeast } from '../model/Beer';

/**
 * Parser für flache JSON-Struktur (z.B. aus Excel-Export) zu Beer-Objekt
 */
export function importFlatJsonToBeer(json: any): Beer {
    // Malze sammeln
    const malts: Malt[] = [];
    for (let i = 1; i <= 10; i++) {
        const name = json[`Malz${i}`];
        const menge = json[`Malz${i}_Menge`];
        const einheit = json[`Malz${i}_Einheit`];
        if (name && menge) {
            malts.push({
                id: String(i),
                name: name,
                description: '',
                EBC: 0,
                quantity: einheit === 'g' ? Number(menge) / 1000 : Number(menge)
            });
        }
    }

    // Hopfen sammeln
    const hops: Hop[] = [];
    for (let i = 1; i <= 10; i++) {
        const sorte = json[`Hopfen_${i}_Sorte`];
        const menge = json[`Hopfen_${i}_Menge`];
        const alpha = json[`Hopfen_${i}_alpha`];
        const zeit = json[`Hopfen_${i}_Kochzeit`];
        if (sorte && menge) {
            hops.push({
                id: String(i),
                name: sorte,
                description: '',
                alpha: alpha ? Number(alpha) : 0,
                quantity: Number(menge),
                time: zeit ? Number(zeit) : 0
            });
        }
    }

    // Rasten sammeln
    const fermentation: FermentationSteps[] = [];
    for (let i = 1; i <= 10; i++) {
        const temp = json[`Infusion_Rasttemperatur${i}`];
        const time = json[`Infusion_Rastzeit${i}`];
        if (temp && time) {
            fermentation.push({
                type: '',
                temperature: Number(temp),
                time: Number(time)
            });
        }
    }

    // Hefe
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
        alcohol: json.Alkohol ? Number(json.Alkohol) : 0,
        originalwort: json.Stammwuerze ? Number(json.Stammwuerze) : 0,
        bitterness: json.Bittere ? Number(json.Bittere) : 0,
        description: json.Kurzbeschreibung ?? '',
        rating: 0,
        mashVolume: json.Infusion_Hauptguss ? Number(json.Infusion_Hauptguss) : 0,
        spargeVolume: json.Nachguss ? Number(json.Nachguss) : 0,
        cookingTime: json.Kochzeit_Wuerze ? Number(json.Kochzeit_Wuerze) : 0,
        cookingTemperatur: json.Abmaischtemperatur ? Number(json.Abmaischtemperatur) : 0,
        fermentation,
        malts,
        wortBoiling: {
            totalTime: json.Kochzeit_Wuerze ? Number(json.Kochzeit_Wuerze) : 0,
            hops
        },
        fermentationMaturation: {
            fermentationTemperature: json.Gaertemperatur ? Number(json.Gaertemperatur) : 0,
            carbonation: json.Karbonisierung ? Number(json.Karbonisierung) : 0,
            yeast
        }
    };
}

