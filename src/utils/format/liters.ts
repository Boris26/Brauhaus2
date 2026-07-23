export const formatLiters = (aLiters: number): string => {
    const safeLiters = Number.isFinite(aLiters) ? aLiters : 0;

    return `${safeLiters.toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })} l`;
};
