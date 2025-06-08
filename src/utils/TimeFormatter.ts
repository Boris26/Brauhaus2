export class TimeFormatter {
    static formatSecondsToHMS(seconds: number): string {
        return this.format(seconds);
    }

   private static format(seconds: number): string {
        if (isNaN(seconds) || seconds < 0) return '-';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}
