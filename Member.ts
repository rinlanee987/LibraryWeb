// src/models/Member.ts
import { MemberType } from '../types.ts';

/** คลาสแม่ (Abstract) ของสมาชิกห้องสมุด */
export abstract class Member {
    protected id: number | null;
    protected name: string;
    protected email: string;
    protected memberType: MemberType;

    constructor(name: string, email: string, memberType: MemberType, id: number | null = null) {
        this.name = name.trim();
        this.email = email.trim().toLowerCase();
        this.memberType = memberType;
        this.id = id;
    }

    abstract getTypeLabel(): string;
    abstract getMaxLoans(): number; // จำนวนที่ยืมพร้อมกันได้สูงสุด
    abstract getExtraLoanDays(): number; // วันยืมที่ได้เพิ่มจากปกติ

    validate(): string | null {
        if (this.name.length === 0) return 'กรุณากรอกชื่อสมาชิก';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) return 'รูปแบบอีเมลไม่ถูกต้อง';
        return null;
    }

    getId(): number | null {
        return this.id;
    }
    setId(id: number): void {
        this.id = id;
    }
    getName(): string {
        return this.name;
    }
    getEmail(): string {
        return this.email;
    }
    getType(): MemberType {
        return this.memberType;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.memberType,
            typeLabel: this.getTypeLabel(),
            name: this.name,
            email: this.email,
            maxLoans: this.getMaxLoans(),
            extraLoanDays: this.getExtraLoanDays()
        };
    }
}

/** นักศึกษา: ยืมพร้อมกันได้ 3 เล่ม */
export class Student extends Member {
    constructor(name: string, email: string, id: number | null = null) {
        super(name, email, MemberType.STUDENT, id);
    }
    getTypeLabel(): string {
        return 'นักศึกษา';
    }
    getMaxLoans(): number {
        return 3;
    }
    getExtraLoanDays(): number {
        return 0;
    }
}

/** อาจารย์: ยืมพร้อมกันได้ 10 เล่ม และได้วันยืมเพิ่ม 7 วัน */
export class Teacher extends Member {
    constructor(name: string, email: string, id: number | null = null) {
        super(name, email, MemberType.TEACHER, id);
    }
    getTypeLabel(): string {
        return 'อาจารย์';
    }
    getMaxLoans(): number {
        return 10;
    }
    getExtraLoanDays(): number {
        return 7;
    }
}
