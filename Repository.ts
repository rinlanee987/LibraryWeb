// src/repositories/Repository.ts
import type { DatabaseSync } from 'node:sqlite';
import { Database } from '../db/Database.ts';
import type { Row } from '../types.ts';

/**
 * Abstract Generic Repository: ส่วนที่ติดต่อกับฐานข้อมูล
 * เก็บคำสั่ง SQL ที่ใช้ร่วมกันทุกตาราง ส่วนที่ต่างกันให้คลาสลูก implement
 */
export abstract class Repository<T> {
    protected db: DatabaseSync;
    protected abstract readonly tableName: string;

    constructor() {
        this.db = Database.getInstance().getConnection();
    }

    // แปลงแถวจากฐานข้อมูลเป็น object ของคลาส (คลาสลูกต้อง implement)
    protected abstract mapRow(row: Row): T;
    abstract save(entity: T): T;

    findAll(): T[] {
        const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY id DESC`).all() as Row[];
        return rows.map((row) => this.mapRow(row));
    }

    findById(id: number): T | null {
        const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as Row | undefined;
        return row ? this.mapRow(row) : null;
    }

    delete(id: number): boolean {
        const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
        return result.changes > 0;
    }

    count(): number {
        const row = this.db.prepare(`SELECT COUNT(*) AS n FROM ${this.tableName}`).get() as Row;
        return Number(row.n);
    }
}
