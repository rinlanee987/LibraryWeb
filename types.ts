// src/types.ts
// ประเภทข้อมูลกลางของระบบ (ใช้ const object แทน enum เพื่อให้ Node.js รัน TypeScript ได้โดยตรง)

export const ItemType = {
    BOOK: 'BOOK',
    MAGAZINE: 'MAGAZINE',
    TEXTBOOK: 'TEXTBOOK'
} as const;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export const MemberType = {
    STUDENT: 'STUDENT',
    TEACHER: 'TEACHER'
} as const;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

// ข้อผิดพลาดที่ส่งกลับไปยังผู้ใช้งาน
export type AppError = { message: string; status: number };

// ผลลัพธ์แบบ [ข้อมูล, ข้อผิดพลาด] เหมือนในโครงงานตัวอย่าง
export type Result<T> = [T, null] | [null, AppError];

export type Row = Record<string, unknown>;
