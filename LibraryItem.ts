// src/models/LibraryItem.ts
import type { ItemType } from '../types.ts';

/**
 * คลาสแม่ (Abstract) ของทรัพยากรในห้องสมุดทุกชนิด
 * คลาสลูก ได้แก่ Book, Magazine, Textbook
 */
export abstract class LibraryItem {
    // Encapsulation: attribute เป็น protected เข้าถึงได้เฉพาะคลาสนี้และคลาสที่สืบทอด
    protected id: number | null;
    protected title: string;
    protected author: string;
    protected year: number;
    protected available: boolean;
    protected itemType: ItemType;

    constructor(
        title: string,
        author: string,
        year: number,
        itemType: ItemType,
        id: number | null = null,
        available: boolean = true
    ) {
        this.title = title.trim();
        this.author = author.trim();
        this.year = year;
        this.itemType = itemType;
        this.id = id;
        this.available = available;
    }

    // ===== Abstract methods: คลาสลูกต้อง implement เอง =====
    abstract getTypeLabel(): string; // ชื่อประเภทภาษาไทย
    abstract getLoanDays(): number; // จำนวนวันที่ยืมได้
    abstract getFinePerDay(): number; // ค่าปรับต่อวัน (บาท)
    abstract getExtra(): string; // ข้อมูลเฉพาะของแต่ละประเภท
    abstract getExtraLabel(): string; // ชื่อของข้อมูลเฉพาะ
    protected abstract validateExtra(): string | null;

    // ===== Template method: ตรวจข้อมูลส่วนกลาง แล้วเรียกส่วนเฉพาะของคลาสลูก =====
    validate(): string | null {
        if (this.title.length === 0) return 'กรุณากรอกชื่อเรื่อง';
        if (this.author.length === 0) return 'กรุณากรอกชื่อผู้แต่ง';
        const thisYear = new Date().getFullYear();
        if (!Number.isInteger(this.year) || this.year < 1000 || this.year > thisYear) {
            return `ปีที่พิมพ์ต้องอยู่ระหว่าง 1000 - ${thisYear}`;
        }
        return this.validateExtra();
    }

    // ค่าปรับเริ่มต้น = จำนวนวันที่เกิน x ค่าปรับต่อวัน (คลาสลูก override ได้)
    calculateFine(daysLate: number): number {
        return Math.max(0, daysLate) * this.getFinePerDay();
    }

    // ===== Getter / Setter =====
    getId(): number | null {
        return this.id;
    }
    setId(id: number): void {
        this.id = id;
    }
    getTitle(): string {
        return this.title;
    }
    getAuthor(): string {
        return this.author;
    }
    getYear(): number {
        return this.year;
    }
    getType(): ItemType {
        return this.itemType;
    }
    isAvailable(): boolean {
        return this.available;
    }
    setAvailable(available: boolean): void {
        this.available = available;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.itemType,
            typeLabel: this.getTypeLabel(),
            title: this.title,
            author: this.author,
            year: this.year,
            extra: this.getExtra(),
            extraLabel: this.getExtraLabel(),
            available: this.available,
            loanDays: this.getLoanDays(),
            finePerDay: this.getFinePerDay()
        };
    }
}
