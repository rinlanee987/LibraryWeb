# ระบบยืม-คืนหนังสือห้องสมุด (Library Management System)

โครงงานวิชา Object-Oriented Programming — เว็บแอปพลิเคชันเชื่อมต่อฐานข้อมูล **Supabase (PostgreSQL)**
หน้าเว็บเป็น HTML/CSS/JavaScript ล้วน ฝากบน **GitHub Pages** ได้ฟรี ไม่ต้องมีเซิร์ฟเวอร์

## โครงสร้างไฟล์
```
index.html            หน้าเว็บ
css/style.css         รูปแบบหน้าเว็บ
js/config.js          URL และ publishable key ของ Supabase
js/models.js          คลาสหลัก: LibraryItem, Book, Magazine, Textbook, Member, Student, Teacher, Loan, Factory
js/repositories.js    Repository (abstract), ItemRepository, MemberRepository, LoanRepository
js/service.js         LibraryService: กฎการยืม-คืนและค่าปรับ
js/app.js             ส่วนแสดงผล (UI)
setup.sql             คำสั่งสร้างตารางและข้อมูลตัวอย่าง
```

## ติดตั้ง
1. **สร้างตาราง:** Supabase → SQL Editor → New query → วางเนื้อหา `setup.sql` ทั้งหมด → Run
2. **อัปขึ้น GitHub:** อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repository (ให้ `index.html` อยู่ชั้นนอกสุด)
3. **เปิด GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save
4. รอ 1–2 นาที เว็บจะอยู่ที่ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ repository>/`

## หลักการ OOP ที่ใช้
- **Abstraction:** `LibraryItem`, `Member`, `Repository` เป็น abstract class
- **Inheritance:** `Book`/`Magazine`/`Textbook` สืบทอด `LibraryItem`, `Student`/`Teacher` สืบทอด `Member`
- **Polymorphism:** `Magazine` override `calculateFine()` และ `ItemFactory` คืนค่าเป็นคลาสแม่
- **Encapsulation:** ใช้ private field (`#`) และ getter/setter
- **Composition:** `Loan` ประกอบด้วย `LibraryItem` + `Member`, `LibraryService` ประกอบด้วย Repository ทั้งสาม
