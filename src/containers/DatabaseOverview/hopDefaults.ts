import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';

export const normalizeHopDto = (aHop: Partial<HopDTO>): HopDTO => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    const timeUnit = usage === HopUsage.BOIL
        ? HopTimeUnit.MINUTES
        : (aHop.timeUnit === HopTimeUnit.HOURS || aHop.timeUnit === HopTimeUnit.DAYS ? aHop.timeUnit : HopTimeUnit.DAYS);

    return {
        id: aHop.id ?? '',
        name: aHop.name ?? '',
        quantity: Number(aHop.quantity ?? 0),
        time: Number(aHop.time ?? 0),
        usage,
        timeUnit,
    };
};

export const updateHopUsage = (aHop: HopDTO, aUsage: HopUsage): HopDTO => {
    if (aUsage === HopUsage.DRY_HOP) {
        const nextTimeUnit = !aHop.timeUnit || aHop.timeUnit === HopTimeUnit.MINUTES
            ? HopTimeUnit.DAYS
            : aHop.timeUnit;
        return { ...aHop, usage: HopUsage.DRY_HOP, timeUnit: nextTimeUnit };
    }

    return { ...aHop, usage: HopUsage.BOIL, timeUnit: HopTimeUnit.MINUTES };
};

export const validateHopDto = (aHop: HopDTO): boolean => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    const timeUnit = aHop.timeUnit ?? HopTimeUnit.MINUTES;

    if (!(usage === HopUsage.BOIL || usage === HopUsage.DRY_HOP)) return false;
    if (Number(aHop.quantity) <= 0) return false;
    if (Number(aHop.time) <= 0) return false;

    if (usage === HopUsage.BOIL) {
        return timeUnit === HopTimeUnit.MINUTES;
    }

    return timeUnit === HopTimeUnit.HOURS || timeUnit === HopTimeUnit.DAYS;
};
