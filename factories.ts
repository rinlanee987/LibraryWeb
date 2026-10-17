// src/models/factories.ts
import { LibraryItem } from './LibraryItem.ts';
import { Book, Magazine, Textbook } from './items.ts';
import { Member, Student, Teacher } from './Member.ts';
import { ItemType, MemberType } from '../types.ts';

export type ItemInput = { type: string; title: string; author: string; year: number; extra: string };
export type MemberInput = { type: string; name: string; email: string };

/**
 * Factory: สร้าง object ของคลาสลูกที่ถูกต้องตาม type
 * ผลลัพธ์มีชนิดเป็นคลาสแม่ (LibraryItem / Member) -> Polymorphism
 */
export class ItemFactory {
    static create(input: ItemInput, id: number | null = null, available = true): LibraryItem | null {
        const { title, author, year, extra } = input;
        switch (input.type) {
            case ItemType.BOOK:
                return new Book(title, author, year, extra, id, available);
            case ItemType.MAGAZINE:
                return new Magazine(title, author, year, extra, id, available);
            case ItemType.TEXTBOOK:
                return new Textbook(title, author, year, extra, id, available);
            default:
                return null;
        }
    }
}

export class MemberFactory {
    static create(input: MemberInput, id: number | null = null): Member | null {
        switch (input.type) {
            case MemberType.STUDENT:
                return new Student(input.name, input.email, id);
            case MemberType.TEACHER:
                return new Teacher(input.name, input.email, id);
            default:
                return null;
        }
    }
}
