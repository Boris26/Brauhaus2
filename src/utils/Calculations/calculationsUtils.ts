import { brixToPlatoLookup } from './brixPlatoLookup';
import { eSugarTypes } from "../../enums/eSugerTypes";
import {BrixPlatoSgEntry, brixPlatoSgTable} from './brix_plato_sg_table';

const TEMP_CORRECTION_QUADRATIC = 0.00257; // empirical factor for (T-Ref)^2
const TEMP_CORRECTION_LINEAR = 0.048;      // empirical factor for (T-Ref)
const TEMP_CORRECTION_REFERENCE = 20;      // reference temperature in °C
const ML_TO_L_CONVERSION = 1000;
const SUCROSE_YIELD_FACTOR = 0.512;
const GLUCOSE_YIELD_FACTOR = 0.443;
const DEFAULT_REST_CO2 = 1.7;

/**
 * Interpolates a value within a table of x-y pairs.
 * @param table - Array of objects containing x and y values, e.g. [{ brix: 2.0, plato: 1.92 }, ...].
 * @param value - The value to interpolate (e.g. Brix or Plato).
 * @param xKey - The key representing the x-axis in the table objects (e.g. 'brix' or 'plato').
 * @param yKey - The key representing the y-axis in the table objects (e.g. 'plato' or 'brix').
 * @returns The interpolated y value corresponding to the given x value.
 */
export function lookupInterpolated<T extends keyof BrixPlatoSgEntry, U extends keyof BrixPlatoSgEntry>(
    input: number,
    inputKey: T,
    outputKey: U
): number {
    for (let i = 1; i < brixPlatoSgTable.length; i++) {
        const prev = brixPlatoSgTable[i - 1];
        const curr = brixPlatoSgTable[i];
        if (input >= prev[inputKey] && input <= curr[inputKey]) {
            // lineare Interpolation zwischen prev und curr
            const x0 = prev[inputKey];
            const y0 = prev[outputKey];
            const x1 = curr[inputKey];
            const y1 = curr[outputKey];
            if (x1 === x0) return y0 as number;
            return y0 + ((input - x0) * (y1 - y0)) / (x1 - x0);
        }
    }
    return NaN;
}

export function lookupInterpolatedFlexible<T extends keyof BrixPlatoSgEntry, U extends keyof BrixPlatoSgEntry>(
    input: number,
    inputKey: T,
    outputKey: U
): number {
    // Alle Paare suchen, die input umschließen
    let closestPair: [BrixPlatoSgEntry, BrixPlatoSgEntry] | null = null;
    let minDelta = Infinity;

    for (let i = 1; i < brixPlatoSgTable.length; i++) {
        const prev = brixPlatoSgTable[i - 1];
        const curr = brixPlatoSgTable[i];
        if (
            (input >= prev[inputKey] && input <= curr[inputKey]) ||
            (input <= prev[inputKey] && input >= curr[inputKey])
        ) {
            // Dieses Paar umschließt den Wert
            const delta = Math.abs(prev[inputKey] - curr[inputKey]);
            if (delta < minDelta) {
                minDelta = delta;
                closestPair = [prev, curr];
            }
        }
    }

    if (closestPair) {
        const [prev, curr] = closestPair;
        const x0 = prev[inputKey];
        const y0 = prev[outputKey];
        const x1 = curr[inputKey];
        const y1 = curr[outputKey];
        if (x1 === x0) return y0 as number;
        return y0 + ((input - x0) * (y1 - y0)) / (x1 - x0);
    }

    return NaN;
}



/**
 * Converts a Brix value to Plato using a lookup table.
 * @param aBrix - The Brix value to convert.
 * @returns The corresponding Plato value.
 */
export function brixToPlato(aBrix: number): number {
    return lookupInterpolated(aBrix, 'brix', 'plato');
}

/**
 * Converts a Plato value to Brix using a lookup table.
 * @param aPlato - The Plato value to convert.
 * @returns The corresponding Brix value.
 */
export function platoToBrix(aPlato: number): number {
    return lookupInterpolated(aPlato, 'plato', 'brix');
}

export function brixToSg(aBrix: number): number {
    return lookupInterpolated(aBrix, 'brix', 'sg');
}

export function platoToSg(aPlato: number): number {
    return lookupInterpolated(aPlato, 'plato', 'sg');
}

export function sgToBrix(aSg: number): number {
    return lookupInterpolatedFlexible(aSg, 'sg', 'brix');
}

export function sgToPlato(aSg: number): number {
    return lookupInterpolatedFlexible(aSg, 'sg', 'plato');
}

/**
 * Applies a temperature correction to a given Brix or Plato scale value.
 * @param aBx_P_scale - The original Brix or Plato scale value.
 * @param aTemperature - The current temperature in degrees Celsius.
 * @param refTemp - The reference temperature in degrees Celsius (default is 20°C).
 * @returns The corrected Brix or Plato scale value.
 */
export function temperatureCorrection(aBx_P_scale: number, aTemperature: number, refTemp = TEMP_CORRECTION_REFERENCE): number {
    const correction = TEMP_CORRECTION_QUADRATIC * Math.pow(aTemperature - refTemp, 2) + TEMP_CORRECTION_LINEAR * (aTemperature - refTemp);
    return aBx_P_scale + correction;
}



/**
 * Calculates the required sugar amount for carbonation.
 * @param volumeBeerL - Volume of beer in liters.
 * @param targetCO2_gL - Target CO₂ in g/L.
 * @param waterVolumeMl - Water volume in milliliters (optional, default 1000ml).
 * @param sugarType - Sugar type (eSugarTypes.Sucrose or eSugarTypes.Glucose).
 * @returns Sugar amount in grams.
 */
export function calculateSugarAmount(
    volumeBeerL: number,
    targetCO2_gL: number,
    waterVolumeMl: number = 1000,
    sugarType: eSugarTypes = eSugarTypes.Sucrose
): number {
    const volumeWaterL = waterVolumeMl / ML_TO_L_CONVERSION;
    const totalVolumeL = volumeBeerL + volumeWaterL;
    const deltaCO2 = targetCO2_gL * totalVolumeL - DEFAULT_REST_CO2 * volumeBeerL;
    if (isNaN(deltaCO2) || deltaCO2 <= 0) return 0;
    const factor = sugarType === eSugarTypes.Sucrose ? 1 / SUCROSE_YIELD_FACTOR : 1 / GLUCOSE_YIELD_FACTOR;
    const sugarGrams = deltaCO2 * factor;
    return Math.round(sugarGrams * 100) / 100;
}

export interface RefractometerResult {
    finalGravitySG: number;             // korrigierte Enddichte (SG)
    apparentExtractPlato: number;      // scheinbarer Restextrakt (°P)
    realExtractPlato: number;          // tatsächlicher Restextrakt (°P)
    attenuationApparentPct: number;    // scheinbarer EVG (%)
    attenuationRealPct: number;        // tatsächlicher EVG (%)
    alcoholContentVolPct: number;      // Alkoholgehalt (%vol)
}

export function calculateFromRefractometer(
    ogBrix: number,
    fgBrix: number,
    wcf = 1.03
): RefractometerResult {
    // Korrigierte Stammwürze (nur OG, noch kein Alkohol)
    const stammwuerzePlato = ogBrix / wcf;

    // Korrigierter FG-Wert: Brix nach Alkohol-Gärung → erst FG berechnen!
    const BIa = ogBrix / wcf;
    const BIe = fgBrix;

    // Korrigierte Enddichte (SG, z.B. 1.012) - Sean Terrill Formel
    const sg =
        1.001843
        - 0.002318474 * BIa
        - 0.000007775 * Math.pow(BIa, 2)
        - 0.000000034 * Math.pow(BIa, 3)
        + 0.00574 * BIe
        + 0.00003344 * Math.pow(BIe, 2)
        + 0.000000086 * Math.pow(BIe, 3);

    // Apparent Extract (scheinbarer Restextrakt, °Plato, berechnet aus SG)
    const apparentPlato = sgToPlato(sg);

    // Real Extract (tatsächlicher Restextrakt, °Plato, Berechnungsformel)
    const realPlato =
        0.1808 * stammwuerzePlato +
        0.8192 * apparentPlato;

    // EVG
    const evgApparent = (1 - apparentPlato / stammwuerzePlato) * 100;
    const evgReal     = (1 - realPlato     / stammwuerzePlato) * 100;

    // Alkoholgehalt
    const alcoholByWeight = (stammwuerzePlato - realPlato) / (2.0665 - 0.010665 * stammwuerzePlato);
    const alcoholByVolume = alcoholByWeight / 0.79;

    return {
        finalGravitySG: sg,
        apparentExtractPlato: apparentPlato,
        realExtractPlato: realPlato,
        attenuationApparentPct: evgApparent,
        attenuationRealPct: evgReal,
        alcoholContentVolPct: alcoholByVolume
    };
}


