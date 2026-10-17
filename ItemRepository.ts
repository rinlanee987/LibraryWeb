// src/repositories/ItemRepository.ts
import { Repository } from './Repository.ts';
import type { LibraryItem } from '../models/LibraryItem.ts';
import { ItemFactory } from '../models/factories.ts';
import type { Row } from '../types.ts';

export class ItemRepository extends Repository<LibraryItem> {
    protected readonly tableName = 'items';

    protected mapRow(row: Row): LibraryItem {
        const item = ItemFactory.create(
            {
                type: String(row.type),
                title: String(row.title),
                author: String(row.author),
                year: Number(row.year),
                extra: String(row.extra)
            },
            Number(row.id),
            Number(row.available) === 1
        );
        if (item === null) throw new Error(`Unknown item type: ${row.type}`);
        return item;
    }

    // INSERT ถ้ายังไม่มี id, UPDATE ถ้ามี id แล้ว
    save(item: LibraryItem): LibraryItem {
        const values = [item.getType(), item.getTitle(), item.getAuthor(), item.getYear(), item.getExtra(), item.isAvailable() ? 1 : 0];
        const id = item.getId();
        if (id === null) {
            const result = this.db
                .prepare('INSERT INTO items (type, title, author, year, extra, available) VALUES (?, ?, ?, ?, ?, ?)')
                .run(...values);
            item.setId(Number(result.lastInsertRowid));
        } else {
            this.db
                .prepare('UPDATE items SET type = ?, title = ?, author = ?, year = ?, extra = ?, available = ? WHERE id = ?')
                .run(...values, id);
        }
        return item;
    }

    search(keyword: string): LibraryItem[] {
        const like = `%${keyword}%`;
        const rows = this.db
            .prepare('SELECT * FROM items WHERE title LIKE ? OR author LIKE ? OR extra LIKE ? ORDER BY id DESC')
            .all(like, like, like) as Row[];
        return rows.map((row) => this.mapRow(row));
    }

    countAvailable(): number {
        const row = this.db.prepare('SELECT COUNT(*) AS n FROM items WHERE available = 1').get() as Row;
        return Number(row.n);
    }
}
