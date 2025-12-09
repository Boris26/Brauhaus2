import {Beer, Hop, Malt, Yeast} from "../../model/Beer";


// ---------------------------------------------------------
// USER-Input
// ---------------------------------------------------------
export interface scalingValues {
    beer: Beer;
    volume: number;
    brewhouseEfficiency: number;
}

// ---------------------------------------------------------
// Equipment-Profil – Realistische Standardwerte wie BräuReKa
// ---------------------------------------------------------
export interface EquipmentProfile {
    mashThicknessLPerKg: number;
    grainAbsorptionLPerKg: number;
    boilOffRateLPerHour: number;
    boilTimeMinutes: number;
    trubLossLiters: number;
    kettleDeadspaceLiters: number;
    lauterDeadspaceLiters: number;
}

// Default-Profil (für deinen Einkocher)
const DEFAULT_PROFILE: EquipmentProfile = {
    mashThicknessLPerKg: 3.0,
    grainAbsorptionLPerKg: 0.8,
    boilOffRateLPerHour: 3.0,
    boilTimeMinutes: 92,
    trubLossLiters: 1.5,
    kettleDeadspaceLiters: 0.5,
    lauterDeadspaceLiters: 1.0
};

// ---------------------------------------------------------
// WASSERBERECHNUNG (BräuReKa Logik)
// ---------------------------------------------------------
class WaterProfileCalculator {

    static calculate(malts: Malt[], targetVolumeL: number, profile: EquipmentProfile) {

        // 1) Schüttung in kg
        const grainKg = malts.reduce((sum, m) => sum + m.quantity / 1000, 0);

        // 2) Hauptguss aus MashThickness
        const hauptguss = grainKg * profile.mashThicknessLPerKg;

        // 3) Treberverlust
        const absorptionLoss = grainKg * profile.grainAbsorptionLPerKg;

        // 4) Verdampfung
        const boilOff = (profile.boilOffRateLPerHour * (profile.boilTimeMinutes / 60));

        // 5) Fixe Verluste
        const fixedLoss =
            profile.trubLossLiters +
            profile.kettleDeadspaceLiters +
            profile.lauterDeadspaceLiters;

        // 6) Gesamtwasserbedarf
        const totalWater =
            targetVolumeL +
            absorptionLoss +
            boilOff +
            fixedLoss;

        // 7) Nachguss
        const nachguss = Math.max(totalWater - hauptguss, 0);

        return {
            hauptguss: Number(hauptguss.toFixed(2)),
            nachguss: Number(nachguss.toFixed(2)),
            totalWater: Number(totalWater.toFixed(2))
        };
    }
}


// ---------------------------------------------------------
// BeerRecipeScaler – Jetzt MIT realistischer Wasserlogik
// ---------------------------------------------------------
export class BeerRecipeScaler {

    static readonly BASE_VOLUME = 10;
    static readonly BASE_EFFICIENCY = 52;

    static scale(aValues: scalingValues, aProfile: EquipmentProfile = DEFAULT_PROFILE): Beer {

        const aBeer = aValues.beer;
        const targetVolume = aValues.volume;
        if(aValues.beer.cookingTime)
        {
            aProfile.boilTimeMinutes = aValues.beer.cookingTime
        }


        const userEfficiency =
            aValues.brewhouseEfficiency > 0
                ? aValues.brewhouseEfficiency
                : BeerRecipeScaler.BASE_EFFICIENCY;

        // VOLUMENFAKTOR
        const volumeFactor = targetVolume / BeerRecipeScaler.BASE_VOLUME;

        // AUSBEUTEFAKTOR (nur für Malz)
        const efficiencyFactor = BeerRecipeScaler.BASE_EFFICIENCY / userEfficiency;

        // ---------------------------
        // MALZ (Dreisatz × SHA)
        // ---------------------------
        const scaledMalts: Malt[] = aBeer.malts.map(m => ({
            ...m,
            quantity: Number((m.quantity * volumeFactor * efficiencyFactor).toFixed(2))
        }));

        // ---------------------------
        // HOPFEN (nur Dreisatz)
        // ---------------------------
        const scaledHops: Hop[] = aBeer.wortBoiling.hops.map(h => ({
            ...h,
            quantity: Number((h.quantity * volumeFactor).toFixed(2))
        }));

        // ---------------------------
        // HEFE (nur Dreisatz)
        // ---------------------------
        const scaledYeast: Yeast[] =
            aBeer.fermentationMaturation.yeast.map(y => ({
                ...y,
                quantity: y.quantity != null
                    ? Number((y.quantity * volumeFactor).toFixed(2))
                    : 0
            }));

        // ---------------------------
        // REALISTISCHE WASSERBERECHNUNG
        // ---------------------------
        const water = WaterProfileCalculator.calculate(scaledMalts, targetVolume, aProfile);

        const mashVolume = water.hauptguss;
        const spargeVolume = water.nachguss;

        // ---------------------------
        // FERTIGES SKALIERTES BIER
        // ---------------------------
        return {
            ...aBeer,

            mashVolume,
            spargeVolume,

            // Charakterwerte bleiben
            alcohol: aBeer.alcohol,
            bitterness: aBeer.bitterness,
            color: aBeer.color,
            originalwort: aBeer.originalwort,

            malts: scaledMalts,
            wortBoiling: {
                ...aBeer.wortBoiling,
                hops: scaledHops
            },
            fermentationMaturation: {
                ...aBeer.fermentationMaturation,
                yeast: scaledYeast
            }
        };
    }
}
