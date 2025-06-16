import { brixToPlatoLookup } from './brixPlatoLookup';


/**
 * Interpolates a value within a table of x-y pairs.
 * @param table - Array of objects containing x and y values, e.g. [{ brix: 2.0, plato: 1.92 }, ...].
 * @param value - The value to interpolate (e.g. Brix or Plato).
 * @param xKey - The key representing the x-axis in the table objects (e.g. 'brix' or 'plato').
 * @param yKey - The key representing the y-axis in the table objects (e.g. 'plato' or 'brix').
 * @returns The interpolated y value corresponding to the given x value.
 */
function interpolate<T extends Record<string, number>>(
    table: T[],
    value: number,
    xKey: keyof T,
    yKey: keyof T
): number {
    if (value <= table[0][xKey]) return table[0][yKey];
    if (value >= table[table.length - 1][xKey]) return table[table.length - 1][yKey];
    for (let i = 0; i < table.length - 1; i++) {
        const a = table[i];
        const b = table[i + 1];
        if (value >= a[xKey] && value <= b[xKey]) {
            return a[yKey] + ((value - a[xKey]) / (b[xKey] - a[xKey])) * (b[yKey] - a[yKey]);
        }
    }
    return value;
}

/**
 * Converts a Brix value to Plato using a lookup table.
 * @param aBrix - The Brix value to convert.
 * @returns The corresponding Plato value.
 */
export function brixToPlato(aBrix: number): number {
    return interpolate(brixToPlatoLookup, aBrix, 'brix', 'plato');
}

/**
 * Converts a Plato value to Brix using a lookup table.
 * @param aPlato - The Plato value to convert.
 * @returns The corresponding Brix value.
 */
export function platoToBrix(aPlato: number): number {
    return interpolate(brixToPlatoLookup, aPlato, 'plato', 'brix');
}

const TEMP_CORRECTION_QUADRATIC = 0.00257; // empirischer Faktor für (T-Ref)^2
const TEMP_CORRECTION_LINEAR = 0.048;      // empirischer Faktor für (T-Ref)
const TEMP_CORRECTION_REFERENCE = 20;      // Referenztemperatur in °C

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
 * Berechnet den scheinbaren Restextrakt nach Terrill-Korrektur (Brix).
 * @param ogBrix Stammwürze in Brix
 * @param fgBrix Restextrakt in Brix
 * @returns scheinbarer Restextrakt (Brix)
 */
export function correctedBrixTerrill(ogBrix: number, fgBrix: number): number {
  return (
    1.0000 -
    0.00085683 * ogBrix +
    0.0034941 * fgBrix +
    0.0000138 * fgBrix * fgBrix
  );
}

export function correctedBrixNovotny(ogBrix: number, fgBrix: number): number {
    return (
        1.0000 -
        0.0044993 * ogBrix +
        0.011774 * fgBrix +
        0.00027581 * fgBrix * fgBrix -
        0.0000012717 * fgBrix * fgBrix * fgBrix
    );
}
