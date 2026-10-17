// src/db/Database.ts
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

/**
 * คลาส Database ใช้รูปแบบ Singleton
 * ทั้งระบบจะมีการเชื่อมต่อฐานข้อมูลเพียงตัวเดียว
 */
export class Database {
    private static instance: Database | null = null;
    private connection: DatabaseSync;

    // constructor เป็น private: สร้าง object จากภายนอกไม่ได้ ต้องเรียก getInstance()
    private constructor(file: string) {
        this.connection = new DatabaseSync(file);
        this.connection.exec('PRAGMA foreign_keys = ON;');
        this.createTables();
    }

    static getInstance(): Database {
        if (Database.instance === null) {
            const file = process.env.DB_FILE ?? path.join(import.meta.dirname, '..', '..', 'library.db');
            Database.instance = new Database(file);
        }
        return Database.instance;
    }

    getConnection(): DatabaseSync {
        return this.connection;
    }

    private createTables(): void {
        this.connection.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                type       TEXT    NOT NULL CHECK (type IN ('BOOK', 'MAGAZINE', 'TEXTBOOK')),
                title      TEXT    NOT NULL,
                author     TEXT    NOT NULL,
                year       INTEGER NOT NULL,
                extra      TEXT    NOT NULL DEFAULT '',
                available  INTEGER NOT NULL DEFAULT 1,
                created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS members (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                type       TEXT    NOT NULL CHECK (type IN ('STUDENT', 'TEACHER')),
                name       TEXT    NOT NULL,
                email      TEXT    NOT NULL UNIQUE,
                created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS loans (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id     INTEGER NOT NULL REFERENCES items(id),
                member_id   INTEGER NOT NULL REFERENCES members(id),
                borrow_date TEXT    NOT NULL,
                due_date    TEXT    NOT NULL,
                return_date TEXT,
                fine        REAL    NOT NULL DEFAULT 0
            );
        `);
    }
}
