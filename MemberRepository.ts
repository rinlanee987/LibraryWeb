// src/repositories/MemberRepository.ts
import { Repository } from './Repository.ts';
import type { Member } from '../models/Member.ts';
import { MemberFactory } from '../models/factories.ts';
import type { Row } from '../types.ts';

export class MemberRepository extends Repository<Member> {
    protected readonly tableName = 'members';

    protected mapRow(row: Row): Member {
        const member = MemberFactory.create(
            { type: String(row.type), name: String(row.name), email: String(row.email) },
            Number(row.id)
        );
        if (member === null) throw new Error(`Unknown member type: ${row.type}`);
        return member;
    }

    save(member: Member): Member {
        const values = [member.getType(), member.getName(), member.getEmail()];
        const id = member.getId();
        if (id === null) {
            const result = this.db.prepare('INSERT INTO members (type, name, email) VALUES (?, ?, ?)').run(...values);
            member.setId(Number(result.lastInsertRowid));
        } else {
            this.db.prepare('UPDATE members SET type = ?, name = ?, email = ? WHERE id = ?').run(...values, id);
        }
        return member;
    }

    findByEmail(email: string): Member | null {
        const row = this.db.prepare('SELECT * FROM members WHERE email = ?').get(email.toLowerCase()) as Row | undefined;
        return row ? this.mapRow(row) : null;
    }
}
