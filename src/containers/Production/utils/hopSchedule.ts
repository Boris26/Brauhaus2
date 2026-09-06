import {Beer} from '../../../model/Beer';

export interface HopAddition { timeSeconds: number; names: string[]; }

export const calculateHopSchedule = (aBeer: Beer, masterHops: Array<{id: string | number; name: string}> = []): HopAddition[] => {
    const schedule = new Map<number, string[]>();
    const totalCookingTime = Number(aBeer.cookingTime);
    if (!Number.isFinite(totalCookingTime) || !aBeer.wortBoiling?.hops) return [];
    aBeer.wortBoiling.hops.forEach((hop) => {
        const timeSeconds = Math.max(0, Math.floor((totalCookingTime - Number(hop.additionTime)) * 60));
        const names = schedule.get(timeSeconds) ?? [];
        const name = masterHops.find(master => String(master.id) === String(hop.id))?.name ?? `Unbekannter Hopfen (ID ${hop.id})`;
        schedule.set(timeSeconds, [...names, name]);
    });
    return Array.from(schedule.entries()).map(([timeSeconds, names]) => ({timeSeconds, names})).sort((a, b) => a.timeSeconds - b.timeSeconds);
};

export const getDueHopAddition = (aSchedule: HopAddition[], aElapsedSeconds: number, aAnnouncedTimes: number[]): HopAddition | undefined =>
    aSchedule.find((addition) => addition.timeSeconds <= aElapsedSeconds && !aAnnouncedTimes.includes(addition.timeSeconds));
