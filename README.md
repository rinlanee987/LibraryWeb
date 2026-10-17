# ระบบยืม-คืนหนังสือห้องสมุด (Library Management System)

โครงงานวิชา Object-Oriented Programming — เว็บแอปพลิเคชันที่เชื่อมต่อฐานข้อมูล SQLite
เขียนด้วย TypeScript ตามหลักการเขียนโปรแกรมเชิงวัตถุ

## สิ่งที่ต้องมี
- Node.js เวอร์ชัน **22.18 ขึ้นไป** (หรือ 24 LTS) — ดาวน์โหลดที่ https://nodejs.org
- ไม่ต้องติดตั้งไลบรารีเพิ่ม (ไม่ต้อง `npm install`) เพราะใช้ `node:http` และ `node:sqlite` ที่มากับ Node.js

## วิธีรัน
```bash
cd library-web
npm start
```
แล้วเปิด http://localhost:3000

- ครั้งแรกระบบจะสร้างไฟล์ฐานข้อมูล `library.db` และใส่ข้อมูลตัวอย่างให้อัตโนมัติ
- ต้องการล้างข้อมูลทั้งหมด: `npm run reset-db` แล้ว `npm start` ใหม่
- เปลี่ยนพอร์ต: `PORT=8080 npm start` (Windows PowerShell: `$env:PORT=8080; npm start`)

## โครงสร้างโปรเจกต์
```
library-web/
├── src/
│   ├── server.ts                 # จุดเริ่มต้น: สร้างเซิร์ฟเวอร์และกำหนด API
│   ├── types.ts                  # ItemType, MemberType, Result<T>
│   ├── db/Database.ts            # เชื่อมต่อ SQLite (Singleton) + สร้างตาราง
│   ├── models/
│   │   ├── LibraryItem.ts        # abstract class ทรัพยากร
│   │   ├── items.ts              # Book, Magazine, Textbook
│   │   ├── Member.ts             # abstract Member, Student, Teacher
│   │   ├── Loan.ts               # การยืม (Composition ของ Item + Member)
│   │   ├── factories.ts          # ItemFactory, MemberFactory
│   │   └── DateUtil.ts
│   ├── repositories/
│   │   ├── Repository.ts         # abstract generic Repository<T>
│   │   ├── ItemRepository.ts
│   │   ├── MemberRepository.ts
│   │   └── LoanRepository.ts
│   ├── services/LibraryService.ts  # กฎการยืม-คืน และคำนวณค่าปรับ
│   └── http/
│       ├── Router.ts             # Router + RequestContext
│       └── StaticServer.ts       # ส่งไฟล์หน้าเว็บ
└── public/                       # หน้าเว็บ (HTML, CSS, JavaScript)
```

## API
| Method | Path | หน้าที่ |
|---|---|---|
| GET | /api/stats | สถิติภาพรวม |
| GET | /api/items?q= | รายการ/ค้นหาทรัพยากร |
| POST | /api/items | เพิ่มทรัพยากร |
| DELETE | /api/items/:id | ลบทรัพยากร |
| GET | /api/members | รายชื่อสมาชิก |
| POST | /api/members | เพิ่มสมาชิก |
| DELETE | /api/members/:id | ลบสมาชิก |
| GET | /api/loans?active=1 | ประวัติการยืม |
| POST | /api/loans | ยืม `{ itemId, memberId }` |
| POST | /api/loans/:id/return | คืน |
