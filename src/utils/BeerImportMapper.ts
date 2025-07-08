import {Beer, FermentationSteps, Hop, Malt, Yeast} from '../model/Beer';
import { BeerDTO, MaltDTO, HopDTO, YeastDTO, FermentationStepsDTO } from '../model/BeerDTO';

/**
 * Robust: Wandelt Fremd-JSON oder BeerDTO-ähnliches JSON in ein gültiges BeerDTO um.
 * - Typkonvertierung für alle Felder
 * - Dynamische Erkennung von Malzen, Hopfen, Hefen, Rasten
 * - Korrekte Reihenfolge der Rasten
 */
export function mapImportedJsonToBeerDTO(json: any): BeerDTO {
    // Wenn das JSON bereits ein BeerDTO ist (z.B. Export aus der App), parse nur die Typen korrekt
    if (json.malts && json.wortBoiling && json.fermentationMaturation) {
        // Malze
        const malts: MaltDTO[] = (json.malts || []).map((m: any) => ({
            name: m.name,
            id: String(m.id ?? ''),
            quantity: Number(m.quantity) || 0
        }));
        // Hopfen
        const hops: HopDTO[] = (json.wortBoiling?.hops || []).map((h: any) => ({
            name: h.name,
            id: String(h.id ?? ''),
            quantity: Number(h.quantity) || 0,
            time: Number(h.time) || 0
        }));
        // Hefe
        const yeast: YeastDTO[] = (json.fermentationMaturation?.yeast || []).map((y: any) => ({
            name: y.name,
            id: String(y.id ?? ''),
            quantity: Number(y.quantity) || 0
        }));
        // Rasten
        const fermentationSteps: FermentationStepsDTO[] = (json.fermentationSteps || []).map((r: any) => ({
            type: r.type,
            temperature: Number(r.temperature) || 0,
            time: Number(r.time) || 0
        }));
        return {
            id: String(json.id ?? ''),
            name: json.name || '',
            type: json.type || '',
            color: String(json.color ?? ''),
            alcohol: Number(json.alcohol) || 0,
            originalwort: Number(json.originalwort) || 0,
            bitterness: Number(json.bitterness) || 0,
            description: json.description || '',
            rating: Number(json.rating) || 0,
            mashVolume: Number(json.mashVolume) || 0,
            spargeVolume: Number(json.spargeVolume) || 0,
            cookingTime: Number(json.cookingTime) || 0,
            cookingTemperatur: Number(json.cookingTemperatur) || 0,
            fermentationSteps,
            malts,
            wortBoiling: { totalTime: Number(json.wortBoiling?.totalTime) || 0, hops },
            fermentationMaturation: {
                fermentationTemperature: Number(json.fermentationMaturation?.fermentationTemperature) || 0,
                carbonation: Number(json.fermentationMaturation?.carbonation) || 0,
                yeast
            }
        };
    }
    // (ab hier wie bisher, dynamisch für Malz/Hopfen/Hefe/Rast)
    // Dynamisch alle Malze sammeln
    const malts: MaltDTO[] = [];
    let i = 1;
    while (json[`Malz${i}`]) {
        const name = json[`Malz${i}`];
        const menge = json[`Malz${i}_Menge`] || 0;
        const einheit = json[`Malz${i}_Einheit`] || 'g';
        malts.push({
            name,
            id: '',
            quantity: Number(menge) * (einheit === 'kg' ? 1000 : 1)
        });
        i++;
    }
    // Dynamisch alle Hopfen sammeln
    const hops: HopDTO[] = [];
    i = 1;
    while (json[`Hopfen_${i}_Sorte`]) {
        hops.push({
            name: json[`Hopfen_${i}_Sorte`],
            id: '',
            quantity: Number(json[`Hopfen_${i}_Menge`]) || 0,
            time: Number(json[`Hopfen_${i}_Kochzeit`]) || 0
        });
        i++;
    }
    // Dynamisch alle Hefen sammeln (Hefe, Hefe2, Hefe3...)
    const yeasts: YeastDTO[] = [];
    i = 1;
    if (json['Hefe']) {
        yeasts.push({ name: json['Hefe'], id: '', quantity: 0 });
    }
    while (json[`Hefe${i}`]) {
        yeasts.push({ name: json[`Hefe${i}`], id: '', quantity: 0 });
        i++;
    }
    // Rast- und Maischschritte (Reihenfolge: Einmaischen, Rast 1..n, Abmaischen)
    const fermentationSteps: FermentationStepsDTO[] = [];
    if (json.Infusion_Einmaischtemperatur) fermentationSteps.push({ type: 'Einmaischen', temperature: Number(json.Infusion_Einmaischtemperatur), time: 0 });
    for (let j = 1; j <= 20; j++) {
        if (json[`Infusion_Rasttemperatur${j}`] && json[`Infusion_Rastzeit${j}`]) {
            fermentationSteps.push({ type: `Rast ${j}`, temperature: Number(json[`Infusion_Rasttemperatur${j}`]), time: Number(json[`Infusion_Rastzeit${j}`]) });
        }
    }
    if (json.Abmaischtemperatur) fermentationSteps.push({ type: 'Abmaischen', temperature: Number(json.Abmaischtemperatur), time: 0 });
    // BeerDTO zusammenbauen
    const beerDTO: BeerDTO = {
        id: '',
        name: json.Name || '',
        type: json.Sorte || '',
        color: json.Farbe ? String(json.Farbe) : '',
        alcohol: Number(json.Alkohol) || 0,
        originalwort: Number(json.Stammwuerze) || 0,
        bitterness: Number(json.Bittere) || 0,
        description: json.Kurzbeschreibung || '',
        rating: 0,
        mashVolume: Number(json.Infusion_Hauptguss) || 0,
        spargeVolume: Number(json.Nachguss) || 0,
        cookingTime: Number(json.Kochzeit_Wuerze) || 0,
        cookingTemperatur: 100,
        fermentationSteps,
        malts,
        wortBoiling: { totalTime: Number(json.Kochzeit_Wuerze) || 0, hops },
        fermentationMaturation: {
            fermentationTemperature: Number(json.Gaertemperatur) || 0,
            carbonation: Number(json.Karbonisierung) || 0,
            yeast: yeasts
        }
    };
    return beerDTO;
}

/**
 * Wandelt beliebiges JSON (Fremdformat oder BeerDTO) in ein Beer-Objekt um und matched Malze/Hopfen/Hefe anhand Name mit den vorhandenen Listen.
 */
function mapMaltsFromJson(json: any, maltsList: Malt[]): Malt[] {
    const malts: Malt[] = [];
    let i = 1;
    console.log('Mapping malts from JSON:', json);
    while (json[`Malz${i}`]) {
        const name = json[`Malz${i}`];
        const menge = json[`Malz${i}_Menge`] || 0;
        const einheit = json[`Malz${i}_Einheit`] || 'g';
        const maltObj = maltsList.find(m => m.name === name);
        malts.push({
            id: maltObj?.id || '',
            name,
            description: maltObj?.description || '',
            EBC: maltObj?.EBC || 0,
            quantity: Number(menge) * (einheit === 'kg' ? 1000 : 1)
        });
        i++;
    }
    return malts;
}

function mapHopsFromJson(json: any, hopsList: Hop[]): Hop[] {
    const hops: Hop[] = [];
    let i = 1;
    while (json[`Hopfen_${i}_Sorte`]) {
        const name = json[`Hopfen_${i}_Sorte`];
        const hopObj = hopsList.find(h => h.name === name);
        hops.push({
            id: hopObj?.id || '',
            name,
            description: hopObj?.description || '',
            alpha: hopObj?.alpha || 0,
            quantity: Number(json[`Hopfen_${i}_Menge`]) || 0,
            time: Number(json[`Hopfen_${i}_Kochzeit`]) || 0
        });
        i++;
    }
    return hops;
}

function mapYeastsFromJson(json: any, yeastsList: Yeast[]): Yeast[] {
    const yeasts: Yeast[] = [];
    let i = 1;
    if (json['Hefe']) {
        const yeastObj = yeastsList.find(y => y.name === json['Hefe']);
        yeasts.push({
            id: yeastObj?.id || '',
            name: json['Hefe'],
            description: yeastObj?.description || '',
            EVG: yeastObj?.EVG || '',
            temperature: yeastObj?.temperature || '',
            type: yeastObj?.type || '',
            quantity: 0
        });
    }
    while (json[`Hefe${i}`]) {
        const yeastObj = yeastsList.find(y => y.name === json[`Hefe${i}`]);
        yeasts.push({
            id: yeastObj?.id || '',
            name: json[`Hefe${i}`],
            description: yeastObj?.description || '',
            EVG: yeastObj?.EVG || '',
            temperature: yeastObj?.temperature || '',
            type: yeastObj?.type || '',
            quantity: 0
        });
        i++;
    }
    return yeasts;
}

function mapFermentationStepsFromJson(json: any): FermentationSteps[] {
    const fermentation: FermentationSteps[] = [];
    if (json.Infusion_Einmaischtemperatur) fermentation.push({ type: 'Einmaischen', temperature: Number(json.Infusion_Einmaischtemperatur), time: 0 });
    for (let j = 1; j <= 20; j++) {
        if (json[`Infusion_Rasttemperatur${j}`] && json[`Infusion_Rastzeit${j}`]) {
            fermentation.push({ type: `Rast ${j}`, temperature: Number(json[`Infusion_Rasttemperatur${j}`]), time: Number(json[`Infusion_Rastzeit${j}`]) });
        }
    }
    if (json.Abmaischtemperatur) fermentation.push({ type: 'Abmaischen', temperature: Number(json.Abmaischtemperatur), time: 0 });
    return fermentation;
}

function mapBeerObjectToBeer(json: any): Beer {
    return {
        id: String(json.id ?? ''),
        name: json.name || '',
        type: json.type || '',
        color: String(json.color ?? ''),
        alcohol: Number(json.alcohol) || 0,
        originalwort: Number(json.originalwort) || 0,
        bitterness: Number(json.bitterness) || 0,
        description: json.description || '',
        rating: Number(json.rating) || 0,
        mashVolume: Number(json.mashVolume) || 0,
        spargeVolume: Number(json.spargeVolume) || 0,
        cookingTime: Number(json.cookingTime) || 0,
        cookingTemperatur: Number(json.cookingTemperatur) || 0,
        fermentation: (json.fermentation || []).map((r: any) => ({
            type: r.type,
            temperature: Number(r.temperature) || 0,
            time: Number(r.time) || 0
        })),
        malts: (json.malts || []).map((m: any) => ({
            id: String(m.id ?? ''),
            name: m.name,
            description: m.description || '',
            EBC: Number(m.EBC) || 0,
            quantity: Number(m.quantity) || 0
        })),
        wortBoiling: {
            totalTime: Number(json.wortBoiling?.totalTime) || 0,
            hops: (json.wortBoiling?.hops || []).map((h: any) => ({
                id: String(h.id ?? ''),
                name: h.name,
                description: h.description || '',
                alpha: Number(h.alpha) || 0,
                quantity: Number(h.quantity) || 0,
                time: Number(h.time) || 0
            }))
        },
        fermentationMaturation: {
            fermentationTemperature: Number(json.fermentationMaturation?.fermentationTemperature) || 0,
            carbonation: Number(json.fermentationMaturation?.carbonation) || 0,
            yeast: (json.fermentationMaturation?.yeast || []).map((y: any) => ({
                id: String(y.id ?? ''),
                name: y.name,
                description: y.description || '',
                EVG: y.EVG || '',
                temperature: y.temperature || '',
                type: y.type || '',
                quantity: Number(y.quantity) || 0
            }))
        }
    };
}

function mapBeerDtoToBeer(json: any): Beer {
    return {
        id: String(json.id ?? ''),
        name: json.name || '',
        type: json.type || '',
        color: String(json.color ?? ''),
        alcohol: Number(json.alcohol) || 0,
        originalwort: Number(json.originalwort) || 0,
        bitterness: Number(json.bitterness) || 0,
        description: json.description || '',
        rating: Number(json.rating) || 0,
        mashVolume: Number(json.mashVolume) || 0,
        spargeVolume: Number(json.spargeVolume) || 0,
        cookingTime: Number(json.cookingTime) || 0,
        cookingTemperatur: Number(json.cookingTemperatur) || 0,
        fermentation: (json.fermentationSteps || []).map((r: any) => ({
            type: r.type,
            temperature: Number(r.temperature) || 0,
            time: Number(r.time) || 0
        })),
        malts: (json.malts || []).map((m: any) => ({
            id: String(m.id ?? ''),
            name: m.name,
            description: '',
            EBC: 0,
            quantity: Number(m.quantity) || 0
        })),
        wortBoiling: {
            totalTime: Number(json.wortBoiling?.totalTime) || 0,
            hops: (json.wortBoiling?.hops || []).map((h: any) => ({
                id: String(h.id ?? ''),
                name: h.name,
                description: '',
                alpha: 0,
                quantity: Number(h.quantity) || 0,
                time: Number(h.time) || 0
            }))
        },
        fermentationMaturation: {
            fermentationTemperature: Number(json.fermentationMaturation?.fermentationTemperature) || 0,
            carbonation: Number(json.fermentationMaturation?.carbonation) || 0,
            yeast: (json.fermentationMaturation?.yeast || []).map((y: any) => ({
                id: String(y.id ?? ''),
                name: y.name,
                description: '',
                EVG: '',
                temperature: '',
                type: '',
                quantity: Number(y.quantity) || 0
            }))
        }
    };
}

function mapForeignJsonToBeer(json: any, maltsList: Malt[], hopsList: Hop[], yeastsList: Yeast[]): Beer {
    const malts = mapMaltsFromJson(json, maltsList);
    const hops = mapHopsFromJson(json, hopsList);
    const yeasts = mapYeastsFromJson(json, yeastsList);
    const fermentation = mapFermentationStepsFromJson(json);
    return {
        id: '',
        name: json.Name || '',
        type: json.Sorte || '',
        color: json.Farbe ? String(json.Farbe) : '',
        alcohol: Number(json.Alkohol) || 0,
        originalwort: Number(json.Stammwuerze) || 0,
        bitterness: Number(json.Bittere) || 0,
        description: json.Kurzbeschreibung || '',
        rating: 0,
        mashVolume: Number(json.Infusion_Hauptguss) || 0,
        spargeVolume: Number(json.Nachguss) || 0,
        cookingTime: Number(json.Kochzeit_Wuerze) || 0,
        cookingTemperatur: 100,
        fermentation,
        malts,
        wortBoiling: { totalTime: Number(json.Kochzeit_Wuerze) || 0, hops },
        fermentationMaturation: {
            fermentationTemperature: Number(json.Gaertemperatur) || 0,
            carbonation: Number(json.Karbonisierung) || 0,
            yeast: yeasts
        }
    };
}

export function mapImportedJsonToBeer(json: any, maltsList: Malt[], hopsList: Hop[], yeastsList: Yeast[]): Beer {
    // Wenn das JSON bereits ein Beer-Objekt ist (z.B. Export aus der App), parse nur die Typen korrekt
    if (json.malts && json.wortBoiling && json.fermentationMaturation && json.fermentation) {
        return mapBeerObjectToBeer(json);
    }
    // Wenn das JSON ein BeerDTO ist, mappe es auf Beer
    if (json.malts && json.wortBoiling && json.fermentationMaturation) {
        return mapBeerDtoToBeer(json);
    }
    // Fremdformat-Mapping:
    return mapForeignJsonToBeer(json, maltsList, hopsList, yeastsList);
}
