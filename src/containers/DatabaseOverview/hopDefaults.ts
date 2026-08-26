import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';

export const hopTimeUnitsByUsage: Record<HopUsage, readonly HopTimeUnit[]> = {
    [HopUsage.FIRST_WORT]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.BOIL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.WHIRLPOOL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.DRY_HOP]: [HopTimeUnit.HOURS, HopTimeUnit.DAYS],
};

const defaultHopTimeUnitByUsage: Record<HopUsage, HopTimeUnit> = {
    [HopUsage.FIRST_WORT]: HopTimeUnit.MINUTES,
    [HopUsage.BOIL]: HopTimeUnit.MINUTES,
    [HopUsage.WHIRLPOOL]: HopTimeUnit.MINUTES,
    [HopUsage.DRY_HOP]: HopTimeUnit.DAYS,
};

const getValidTimeUnit = (usage: HopUsage, timeUnit?: HopTimeUnit): HopTimeUnit =>
    timeUnit && hopTimeUnitsByUsage[usage].includes(timeUnit)
        ? timeUnit
        : defaultHopTimeUnitByUsage[usage];

export const normalizeHopDto = (aHop: Partial<HopDTO>): HopDTO => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    const hasTime = aHop.time !== undefined && aHop.time !== null;
    const timeUnit = hasTime ? getValidTimeUnit(usage, aHop.timeUnit) : undefined;

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
    const hasTime = aHop.time !== undefined && aHop.time !== null;
    return {
        ...aHop,
        usage: aUsage,
        timeUnit: hasTime ? getValidTimeUnit(aUsage, aHop.timeUnit) : undefined,
    };
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
        && hopTimeUnitsByUsage[usage].includes(aHop.timeUnit as HopTimeUnit);
};
