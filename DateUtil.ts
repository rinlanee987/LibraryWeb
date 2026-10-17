// src/models/DateUtil.ts
// เครื่องมือจัดการวันที่ (static methods) เก็บวันที่ในรูปแบบ 'YYYY-MM-DD'

export class DateUtil {
    private static readonly DAY_MS = 24 * 60 * 60 * 1000;

    static today(): string {
        const now = new Date();
        return DateUtil.format(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    }

    static format(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    static addDays(dateStr: string, days: number): string {
        const d = new Date(dateStr + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + days);
        return DateUtil.format(d);
    }

    // จำนวนวันจาก from ถึง to (ติดลบได้)
    static diffDays(from: string, to: string): number {
        const a = new Date(from + 'T00:00:00Z').getTime();
        const b = new Date(to + 'T00:00:00Z').getTime();
        return Math.round((b - a) / DateUtil.DAY_MS);
    }
}
