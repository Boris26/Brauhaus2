import {Beer} from '../../../model/Beer';

export interface HopAddition { timeSeconds: number; names: string[]; }

export const calculateHopSchedule = (aBeer: Beer): HopAddition[] => {
    const schedule = new Map<number, string[]>();
    const totalCookingTime = Number(aBeer.cookingTime);
    if (!Number.isFinite(totalCookingTime) || !aBeer.wortBoiling?.hops) return [];
    aBeer.wortBoiling.hops.forEach((hop) => {
        const timeSeconds = Math.max(0, Math.floor((totalCookingTime - Number(hop.time)) * 60));
        const names = schedule.get(timeSeconds) ?? [];
        schedule.set(timeSeconds, [...names, hop.name]);
    });
    return Array.from(schedule.entries()).map(([timeSeconds, names]) => ({timeSeconds, names})).sort((a, b) => a.timeSeconds - b.timeSeconds);
};

export const getDueHopAddition = (aSchedule: HopAddition[], aElapsedSeconds: number, aAnnouncedTimes: number[]): HopAddition | undefined =>
    aSchedule.find((addition) => addition.timeSeconds <= aElapsedSeconds && !aAnnouncedTimes.includes(addition.timeSeconds));
