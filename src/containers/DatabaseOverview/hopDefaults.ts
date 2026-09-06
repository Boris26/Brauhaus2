import { HopTimeUnit } from '../../enums/eHopTimeUnit';
import { HopUsage } from '../../enums/eHopUsage';
import { HopDTO } from '../../model/BeerDTO';
import {clearRecipeAction, hasRecipeAction, normalizeRecipeAction} from '../../model/FermentationRecipeAction';

export const hopTimeUnitsByUsage: Record<HopUsage, readonly HopTimeUnit[]> = {
    [HopUsage.FIRST_WORT]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.BOIL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.WHIRLPOOL]: [HopTimeUnit.MINUTES, HopTimeUnit.HOURS],
    [HopUsage.DRY_HOP]: [],
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
    const hasTime = usage !== HopUsage.DRY_HOP && aHop.additionTime !== undefined && aHop.additionTime !== null;
    const timeUnit = hasTime ? getValidTimeUnit(usage, aHop.timeUnit) : undefined;

    const {additionTime: _additionTime, timeUnit: _timeUnit, ...hopWithoutBrewDayTime} = aHop;
    const normalized = normalizeRecipeAction({
        ...(usage === HopUsage.DRY_HOP ? hopWithoutBrewDayTime : aHop),
        id: aHop.id ?? '',
        quantity: Number(aHop.quantity ?? 0),
        ...(hasTime ? { additionTime: Number(aHop.additionTime) } : {}),
        usage,
        ...(timeUnit ? { timeUnit } : {}),
    });
    return usage === HopUsage.DRY_HOP && aHop.triggerType ? normalized : clearRecipeAction(normalized);
};

export const updateHopUsage = (aHop: HopDTO, aUsage: HopUsage): HopDTO => {
    const hasTime = aUsage !== HopUsage.DRY_HOP && aHop.additionTime !== undefined && aHop.additionTime !== null;
    const {additionTime: _additionTime, timeUnit: _timeUnit, ...hopWithoutBrewDayTime} = aHop;
    const updated = {
        ...(aUsage === HopUsage.DRY_HOP ? hopWithoutBrewDayTime : aHop),
        usage: aUsage,
        ...(aUsage !== HopUsage.DRY_HOP && aHop.additionTime !== undefined ? {additionTime: aHop.additionTime} : {}),
        timeUnit: hasTime ? getValidTimeUnit(aUsage, aHop.timeUnit) : undefined,
    };
    return clearRecipeAction(updated);
};

export const validateHopDto = (aHop: HopDTO): boolean => {
    const usage = aHop.usage ?? HopUsage.BOIL;
    if (!Object.values(HopUsage).includes(usage)) return false;
    if (!Number.isFinite(Number(aHop.quantity)) || Number(aHop.quantity) <= 0) return false;
    if (usage === HopUsage.DRY_HOP && (aHop.additionTime !== undefined || aHop.timeUnit !== undefined || !hasRecipeAction(aHop))) return false;

    const hasTime = usage !== HopUsage.DRY_HOP && aHop.additionTime !== undefined && aHop.additionTime !== null;
    const hasTimeUnit = aHop.timeUnit !== undefined && aHop.timeUnit !== null;
    if (hasTime !== hasTimeUnit) return false;
    if (!hasTime) return true;

    return Number.isFinite(Number(aHop.additionTime))
        && Number(aHop.additionTime) >= 0
        && hopTimeUnitsByUsage[usage].includes(aHop.timeUnit as HopTimeUnit);
};
