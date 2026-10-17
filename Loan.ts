// src/models/Loan.ts
import type { LibraryItem } from './LibraryItem.ts';
import type { Member } from './Member.ts';
import { DateUtil } from './DateUtil.ts';

/**
 * การยืม 1 รายการ
 * Composition: Loan ประกอบด้วย object ของ LibraryItem และ Member
 */
export class Loan {
    private id: number | null;
    private item: LibraryItem;
    private member: Member;
    private borrowDate: string;
    private dueDate: string;
    private returnDate: string | null;
    private fine: number;

    constructor(
        item: LibraryItem,
        member: Member,
        borrowDate: string,
        dueDate: string,
        returnDate: string | null = null,
        fine: number = 0,
        id: number | null = null
    ) {
        this.item = item;
        this.member = member;
        this.borrowDate = borrowDate;
        this.dueDate = dueDate;
        this.returnDate = returnDate;
        this.fine = fine;
        this.id = id;
    }

    // สร้างการยืมใหม่ โดยคำนวณวันครบกำหนดจากประเภททรัพยากรและประเภทสมาชิก
    static create(item: LibraryItem, member: Member, borrowDate: string = DateUtil.today()): Loan {
        const days = item.getLoanDays() + member.getExtraLoanDays();
        return new Loan(item, member, borrowDate, DateUtil.addDays(borrowDate, days));
    }

    isReturned(): boolean {
        return this.returnDate !== null;
    }

    getDaysLate(asOf: string = DateUtil.today()): number {
        const end = this.returnDate ?? asOf;
        return Math.max(0, DateUtil.diffDays(this.dueDate, end));
    }

    isOverdue(asOf: string = DateUtil.today()): boolean {
        return !this.isReturned() && this.getDaysLate(asOf) > 0;
    }

    // Polymorphism: เรียก calculateFine() ของ item โดยไม่ต้องรู้ว่าเป็นคลาสลูกตัวไหน
    calculateFine(asOf: string = DateUtil.today()): number {
        if (this.isReturned()) return this.fine;
        return this.item.calculateFine(this.getDaysLate(asOf));
    }

    markReturned(returnDate: string = DateUtil.today()): void {
        this.fine = this.item.calculateFine(Math.max(0, DateUtil.diffDays(this.dueDate, returnDate)));
        this.returnDate = returnDate;
        this.item.setAvailable(true);
    }

    getId(): number | null {
        return this.id;
    }
    setId(id: number): void {
        this.id = id;
    }
    getItem(): LibraryItem {
        return this.item;
    }
    getMember(): Member {
        return this.member;
    }
    getBorrowDate(): string {
        return this.borrowDate;
    }
    getDueDate(): string {
        return this.dueDate;
    }
    getReturnDate(): string | null {
        return this.returnDate;
    }
    getFine(): number {
        return this.fine;
    }

    toJSON() {
        return {
            id: this.id,
            item: this.item.toJSON(),
            member: this.member.toJSON(),
            borrowDate: this.borrowDate,
            dueDate: this.dueDate,
            returnDate: this.returnDate,
            daysLate: this.getDaysLate(),
            overdue: this.isOverdue(),
            fine: this.calculateFine()
        };
    }
}
