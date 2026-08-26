import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';

export const normalizeHopDto = (aHop: Partial<HopDTO>): HopDTO => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    const hasTime = aHop.time !== undefined && aHop.time !== null;
    let timeUnit = aHop.timeUnit;

    // Keep the documented defaults only for timed legacy records. Untimed v1
    // records must not gain a unit merely because of their usage.
    if (hasTime && !timeUnit && usage === HopUsage.BOIL) {
        timeUnit = HopTimeUnit.MINUTES;
    } else if (hasTime && !timeUnit && usage === HopUsage.DRY_HOP) {
        timeUnit = HopTimeUnit.DAYS;
    }

    return {
        id: aHop.id ?? '',
        name: aHop.name ?? '',
        quantity: Number(aHop.quantity ?? 0),
        ...(hasTime ? { time: Number(aHop.time) } : {}),
        usage,
        ...(timeUnit ? { timeUnit } : {}),
    };
};

export const updateHopUsage = (aHop: HopDTO, aUsage: HopUsage): HopDTO => {
    return { ...aHop, usage: aUsage };
};

export const validateHopDto = (aHop: HopDTO): boolean => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    if (!Object.values(HopUsage).includes(usage)) return false;
    if (!Number.isFinite(Number(aHop.quantity)) || Number(aHop.quantity) <= 0) return false;

    const hasTime = aHop.time !== undefined && aHop.time !== null;
    const hasTimeUnit = aHop.timeUnit !== undefined && aHop.timeUnit !== null;
    if (hasTime !== hasTimeUnit) return false;
    if (!hasTime) return true;

    return Number.isFinite(Number(aHop.time))
        && Number(aHop.time) >= 0
        && Object.values(HopTimeUnit).includes(aHop.timeUnit as HopTimeUnit);
};
