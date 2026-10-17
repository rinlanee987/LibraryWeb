// src/models/items.ts
import { LibraryItem } from './LibraryItem.ts';
import { ItemType } from '../types.ts';

/** หนังสือทั่วไป: ยืมได้ 14 วัน ปรับวันละ 5 บาท */
export class Book extends LibraryItem {
    private isbn: string;

    constructor(title: string, author: string, year: number, isbn: string, id: number | null = null, available = true) {
        super(title, author, year, ItemType.BOOK, id, available);
        this.isbn = isbn.trim();
    }

    getTypeLabel(): string {
        return 'หนังสือทั่วไป';
    }
    getLoanDays(): number {
        return 14;
    }
    getFinePerDay(): number {
        return 5;
    }
    getExtra(): string {
        return this.isbn;
    }
    getExtraLabel(): string {
        return 'ISBN';
    }

    protected validateExtra(): string | null {
        const digits = this.isbn.replace(/-/g, '');
        if (!/^\d{10}(\d{3})?$/.test(digits)) return 'ISBN ต้องเป็นตัวเลข 10 หรือ 13 หลัก';
        return null;
    }
}

/** นิตยสาร: ยืมได้ 7 วัน ปรับวันละ 2 บาท แต่ค่าปรับสูงสุดไม่เกิน 50 บาท */
export class Magazine extends LibraryItem {
    private static readonly MAX_FINE = 50;
    private issueNo: string;

    constructor(title: string, author: string, year: number, issueNo: string, id: number | null = null, available = true) {
        super(title, author, year, ItemType.MAGAZINE, id, available);
        this.issueNo = issueNo.trim();
    }

    getTypeLabel(): string {
        return 'นิตยสาร';
    }
    getLoanDays(): number {
        return 7;
    }
    getFinePerDay(): number {
        return 2;
    }
    getExtra(): string {
        return this.issueNo;
    }
    getExtraLabel(): string {
        return 'ฉบับที่';
    }

    // Method overriding: จำกัดค่าปรับสูงสุด
    override calculateFine(daysLate: number): number {
        return Math.min(super.calculateFine(daysLate), Magazine.MAX_FINE);
    }

    protected validateExtra(): string | null {
        if (this.issueNo.length === 0) return 'กรุณากรอกฉบับที่ของนิตยสาร';
        return null;
    }
}

/** ตำราเรียน: ยืมได้ 3 วัน ปรับวันละ 10 บาท */
export class Textbook extends LibraryItem {
    private subject: string;

    constructor(title: string, author: string, year: number, subject: string, id: number | null = null, available = true) {
        super(title, author, year, ItemType.TEXTBOOK, id, available);
        this.subject = subject.trim();
    }

    getTypeLabel(): string {
        return 'ตำราเรียน';
    }
    getLoanDays(): number {
        return 3;
    }
    getFinePerDay(): number {
        return 10;
    }
    getExtra(): string {
        return this.subject;
    }
    getExtraLabel(): string {
        return 'รายวิชา';
    }

    protected validateExtra(): string | null {
        if (this.subject.length === 0) return 'กรุณากรอกรายวิชาของตำรา';
        return null;
    }
}
