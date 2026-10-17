// src/services/LibraryService.ts
import { ItemRepository } from '../repositories/ItemRepository.ts';
import { MemberRepository } from '../repositories/MemberRepository.ts';
import { LoanRepository } from '../repositories/LoanRepository.ts';
import { ItemFactory, MemberFactory } from '../models/factories.ts';
import type { ItemInput, MemberInput } from '../models/factories.ts';
import type { LibraryItem } from '../models/LibraryItem.ts';
import type { Member } from '../models/Member.ts';
import { Loan } from '../models/Loan.ts';
import { DateUtil } from '../models/DateUtil.ts';
import type { Result, AppError } from '../types.ts';

/**
 * LibraryService: กฎทางธุรกิจของห้องสมุด
 * Composition: ประกอบด้วย Repository ทั้ง 3 ตัว
 */
export class LibraryService {
    private itemRepo: ItemRepository;
    private memberRepo: MemberRepository;
    private loanRepo: LoanRepository;

    constructor() {
        this.itemRepo = new ItemRepository();
        this.memberRepo = new MemberRepository();
        this.loanRepo = new LoanRepository(this.itemRepo, this.memberRepo);
    }

    private static error(message: string, status = 400): [null, AppError] {
        return [null, { message, status }];
    }

    // ===================== ทรัพยากร =====================
    getItems(keyword = ''): LibraryItem[] {
        return keyword.trim() ? this.itemRepo.search(keyword.trim()) : this.itemRepo.findAll();
    }

    addItem(input: ItemInput): Result<LibraryItem> {
        const item = ItemFactory.create(input);
        if (item === null) return LibraryService.error('ประเภททรัพยากรไม่ถูกต้อง');
        const invalid = item.validate();
        if (invalid) return LibraryService.error(invalid);
        return [this.itemRepo.save(item), null];
    }

    deleteItem(id: number): Result<true> {
        const item = this.itemRepo.findById(id);
        if (item === null) return LibraryService.error('ไม่พบทรัพยากรนี้', 404);
        if (!item.isAvailable()) return LibraryService.error('ทรัพยากรนี้กำลังถูกยืมอยู่ ลบไม่ได้');
        if (this.loanRepo.countByItem(id) > 0) return LibraryService.error('ทรัพยากรนี้มีประวัติการยืม ลบไม่ได้');
        this.itemRepo.delete(id);
        return [true, null];
    }

    // ===================== สมาชิก =====================
    getMembers(): Member[] {
        return this.memberRepo.findAll();
    }

    addMember(input: MemberInput): Result<Member> {
        const member = MemberFactory.create(input);
        if (member === null) return LibraryService.error('ประเภทสมาชิกไม่ถูกต้อง');
        const invalid = member.validate();
        if (invalid) return LibraryService.error(invalid);
        if (this.memberRepo.findByEmail(member.getEmail())) return LibraryService.error('อีเมลนี้ถูกใช้แล้ว', 409);
        return [this.memberRepo.save(member), null];
    }

    deleteMember(id: number): Result<true> {
        if (this.memberRepo.findById(id) === null) return LibraryService.error('ไม่พบสมาชิกนี้', 404);
        if (this.loanRepo.countByMember(id) > 0) return LibraryService.error('สมาชิกนี้มีประวัติการยืม ลบไม่ได้');
        this.memberRepo.delete(id);
        return [true, null];
    }

    // ===================== ยืม-คืน =====================
    getLoans(activeOnly = false): Loan[] {
        return activeOnly ? this.loanRepo.findActive() : this.loanRepo.findAll();
    }

    /**
     * ยืมทรัพยากร ตรวจเงื่อนไขตามลำดับ:
     * 1) มีทรัพยากรและสมาชิกจริง  2) ทรัพยากรว่างอยู่
     * 3) สมาชิกไม่มีรายการเกินกำหนด  4) ยืมไม่เกินจำนวนสูงสุดของประเภทสมาชิก
     */
    borrow(itemId: number, memberId: number, borrowDate: string = DateUtil.today()): Result<Loan> {
        const item = this.itemRepo.findById(itemId);
        if (item === null) return LibraryService.error('ไม่พบทรัพยากรนี้', 404);
        const member = this.memberRepo.findById(memberId);
        if (member === null) return LibraryService.error('ไม่พบสมาชิกนี้', 404);
        if (!item.isAvailable()) return LibraryService.error(`"${item.getTitle()}" ถูกยืมไปแล้ว`);

        const activeLoans = this.loanRepo.findActiveByMember(memberId);
        if (activeLoans.some((loan) => loan.isOverdue(borrowDate))) {
            return LibraryService.error(`${member.getName()} มีรายการเกินกำหนดคืน กรุณาคืนก่อนยืมใหม่`);
        }
        if (activeLoans.length >= member.getMaxLoans()) {
            return LibraryService.error(`${member.getTypeLabel()}ยืมพร้อมกันได้ไม่เกิน ${member.getMaxLoans()} รายการ`);
        }

        const loan = Loan.create(item, member, borrowDate);
        item.setAvailable(false);
        this.itemRepo.save(item);
        return [this.loanRepo.save(loan), null];
    }

    returnItem(loanId: number, returnDate: string = DateUtil.today()): Result<Loan> {
        const loan = this.loanRepo.findById(loanId);
        if (loan === null) return LibraryService.error('ไม่พบรายการยืมนี้', 404);
        if (loan.isReturned()) return LibraryService.error('รายการนี้คืนแล้ว');
        loan.markReturned(returnDate); // คำนวณค่าปรับ + ตั้งให้ทรัพยากรว่าง
        this.itemRepo.save(loan.getItem());
        return [this.loanRepo.save(loan), null];
    }

    // ===================== สถิติ =====================
    getStats() {
        const active = this.loanRepo.findActive();
        const overdue = active.filter((loan) => loan.isOverdue());
        return {
            totalItems: this.itemRepo.count(),
            availableItems: this.itemRepo.countAvailable(),
            totalMembers: this.memberRepo.count(),
            activeLoans: active.length,
            overdueLoans: overdue.length,
            pendingFines: overdue.reduce((sum, loan) => sum + loan.calculateFine(), 0),
            collectedFines: this.loanRepo.totalFinesCollected()
        };
    }

    // ใส่ข้อมูลตัวอย่างเมื่อฐานข้อมูลยังว่าง
    seedIfEmpty(): void {
        if (this.itemRepo.count() > 0) return;
        const items: ItemInput[] = [
            { type: 'BOOK', title: 'Clean Code', author: 'Robert C. Martin', year: 2008, extra: '9780132350884' },
            { type: 'BOOK', title: 'Design Patterns', author: 'Erich Gamma และคณะ', year: 1994, extra: '9780201633610' },
            { type: 'BOOK', title: 'แฮร์รี่ พอตเตอร์กับศิลาอาถรรพ์', author: 'J.K. Rowling', year: 1997, extra: '9789741402867' },
            { type: 'MAGAZINE', title: 'National Geographic ฉบับภาษาไทย', author: 'อมรินทร์', year: 2025, extra: '289' },
            { type: 'MAGAZINE', title: 'Wired', author: 'Condé Nast', year: 2026, extra: '34.05' },
            { type: 'TEXTBOOK', title: 'การเขียนโปรแกรมเชิงวัตถุด้วย TypeScript', author: 'ภาควิชาวิทยาการคอมพิวเตอร์', year: 2024, extra: 'Object-Oriented Programming' },
            { type: 'TEXTBOOK', title: 'ระบบฐานข้อมูลเบื้องต้น', author: 'ภาควิชาวิทยาการคอมพิวเตอร์', year: 2023, extra: 'Database Systems' }
        ];
        const members: MemberInput[] = [
            { type: 'STUDENT', name: 'สมชาย ใจดี', email: 'somchai@email.com' },
            { type: 'STUDENT', name: 'สมหญิง รักเรียน', email: 'somying@email.com' },
            { type: 'TEACHER', name: 'อ.วิชัย สอนดี', email: 'wichai@email.com' }
        ];
        const savedItems = items.map((input) => this.addItem(input)[0]!);
        const savedMembers = members.map((input) => this.addMember(input)[0]!);

        const today = DateUtil.today();
        // ยืมปกติ / ยืมแล้วเกินกำหนด / ยืมแล้วคืนช้า
        this.borrow(savedItems[0].getId()!, savedMembers[0].getId()!, DateUtil.addDays(today, -3));
        this.borrow(savedItems[5].getId()!, savedMembers[1].getId()!, DateUtil.addDays(today, -8));
        const [late] = this.borrow(savedItems[3].getId()!, savedMembers[2].getId()!, DateUtil.addDays(today, -20));
        if (late) this.returnItem(late.getId()!, DateUtil.addDays(today, -4));
    }
}
