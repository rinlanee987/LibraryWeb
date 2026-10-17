// src/repositories/LoanRepository.ts
import { Repository } from './Repository.ts';
import { Loan } from '../models/Loan.ts';
import { ItemRepository } from './ItemRepository.ts';
import { MemberRepository } from './MemberRepository.ts';
import type { Row } from '../types.ts';

export class LoanRepository extends Repository<Loan> {
    protected readonly tableName = 'loans';
    // Composition: ใช้ Repository อื่นเพื่อประกอบ object ของ Loan
    private itemRepo: ItemRepository;
    private memberRepo: MemberRepository;

    constructor(itemRepo: ItemRepository, memberRepo: MemberRepository) {
        super();
        this.itemRepo = itemRepo;
        this.memberRepo = memberRepo;
    }

    protected mapRow(row: Row): Loan {
        const item = this.itemRepo.findById(Number(row.item_id));
        const member = this.memberRepo.findById(Number(row.member_id));
        if (item === null || member === null) throw new Error(`Loan ${row.id} has missing item or member`);
        return new Loan(
            item,
            member,
            String(row.borrow_date),
            String(row.due_date),
            row.return_date === null ? null : String(row.return_date),
            Number(row.fine),
            Number(row.id)
        );
    }

    save(loan: Loan): Loan {
        const values = [
            loan.getItem().getId(),
            loan.getMember().getId(),
            loan.getBorrowDate(),
            loan.getDueDate(),
            loan.getReturnDate(),
            loan.getFine()
        ];
        const id = loan.getId();
        if (id === null) {
            const result = this.db
                .prepare('INSERT INTO loans (item_id, member_id, borrow_date, due_date, return_date, fine) VALUES (?, ?, ?, ?, ?, ?)')
                .run(...values);
            loan.setId(Number(result.lastInsertRowid));
        } else {
            this.db
                .prepare('UPDATE loans SET item_id = ?, member_id = ?, borrow_date = ?, due_date = ?, return_date = ?, fine = ? WHERE id = ?')
                .run(...values, id);
        }
        return loan;
    }

    findActive(): Loan[] {
        const rows = this.db.prepare('SELECT * FROM loans WHERE return_date IS NULL ORDER BY due_date').all() as Row[];
        return rows.map((row) => this.mapRow(row));
    }

    findActiveByMember(memberId: number): Loan[] {
        const rows = this.db
            .prepare('SELECT * FROM loans WHERE member_id = ? AND return_date IS NULL')
            .all(memberId) as Row[];
        return rows.map((row) => this.mapRow(row));
    }

    countByItem(itemId: number): number {
        const row = this.db.prepare('SELECT COUNT(*) AS n FROM loans WHERE item_id = ?').get(itemId) as Row;
        return Number(row.n);
    }

    countByMember(memberId: number): number {
        const row = this.db.prepare('SELECT COUNT(*) AS n FROM loans WHERE member_id = ?').get(memberId) as Row;
        return Number(row.n);
    }

    totalFinesCollected(): number {
        const row = this.db.prepare('SELECT COALESCE(SUM(fine), 0) AS total FROM loans WHERE return_date IS NOT NULL').get() as Row;
        return Number(row.total);
    }
}
