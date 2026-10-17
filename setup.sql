-- setup.sql — สร้างตารางและข้อมูลตัวอย่างสำหรับระบบยืม-คืนหนังสือห้องสมุด
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งไฟล์ > กด Run (รันครั้งเดียว)

-- ========== ตาราง ==========
create table if not exists items (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('BOOK', 'MAGAZINE', 'TEXTBOOK')),
  title      text not null,
  author     text not null,
  year       integer not null,
  extra      text not null default '',
  available  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('STUDENT', 'TEACHER')),
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists loans (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id),
  member_id   uuid not null references members(id),
  borrow_date date not null,
  due_date    date not null,
  return_date date,
  fine        numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ========== สิทธิ์การเข้าถึง ==========
-- โปรเจกต์นี้ไม่มีระบบล็อกอิน จึงอนุญาตให้ทุกคนที่เปิดเว็บ อ่าน/เพิ่ม/แก้/ลบ ได้
alter table items   enable row level security;
alter table members enable row level security;
alter table loans   enable row level security;

drop policy if exists "public access" on items;
drop policy if exists "public access" on members;
drop policy if exists "public access" on loans;
create policy "public access" on items   for all to anon, authenticated using (true) with check (true);
create policy "public access" on members for all to anon, authenticated using (true) with check (true);
create policy "public access" on loans   for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on items, members, loans to anon, authenticated;

-- ========== ข้อมูลตัวอย่าง (ใส่เฉพาะตอนตารางยังว่าง) ==========
insert into items (type, title, author, year, extra, available, created_at)
select * from (values
  ('BOOK',     'Clean Code', 'Robert C. Martin', 2008, '9780132350884', false, now() - interval '7 min'),
  ('BOOK',     'Design Patterns', 'Erich Gamma และคณะ', 1994, '9780201633610', true, now() - interval '6 min'),
  ('BOOK',     'แฮร์รี่ พอตเตอร์กับศิลาอาถรรพ์', 'J.K. Rowling', 1997, '9789741402867', true, now() - interval '5 min'),
  ('MAGAZINE', 'National Geographic ฉบับภาษาไทย', 'อมรินทร์', 2025, '289', true, now() - interval '4 min'),
  ('MAGAZINE', 'Wired', 'Condé Nast', 2026, '34.05', true, now() - interval '3 min'),
  ('TEXTBOOK', 'การเขียนโปรแกรมเชิงวัตถุด้วย TypeScript', 'ภาควิชาวิทยาการคอมพิวเตอร์', 2024, 'Object-Oriented Programming', false, now() - interval '2 min'),
  ('TEXTBOOK', 'ระบบฐานข้อมูลเบื้องต้น', 'ภาควิชาวิทยาการคอมพิวเตอร์', 2023, 'Database Systems', true, now() - interval '1 min')
) as v(type, title, author, year, extra, available, created_at)
where not exists (select 1 from items);

insert into members (type, name, email, created_at)
select * from (values
  ('STUDENT', 'สมชาย ใจดี', 'somchai@email.com', now() - interval '3 min'),
  ('STUDENT', 'สมหญิง รักเรียน', 'somying@email.com', now() - interval '2 min'),
  ('TEACHER', 'อ.วิชัย สอนดี', 'wichai@email.com', now() - interval '1 min')
) as v(type, name, email, created_at)
where not exists (select 1 from members);

-- การยืม 3 รายการ: กำลังยืม / เกินกำหนด / คืนช้าแล้ว
insert into loans (item_id, member_id, borrow_date, due_date, return_date, fine)
select i.id, m.id, v.borrow_date, v.due_date, v.return_date, v.fine
from (values
  ('Clean Code', 'somchai@email.com', current_date - 3, current_date + 11, null::date, 0),
  ('การเขียนโปรแกรมเชิงวัตถุด้วย TypeScript', 'somying@email.com', current_date - 8, current_date - 5, null::date, 0),
  ('National Geographic ฉบับภาษาไทย', 'wichai@email.com', current_date - 20, current_date - 6, current_date - 4, 4)
) as v(title, email, borrow_date, due_date, return_date, fine)
join items i on i.title = v.title
join members m on m.email = v.email
where not exists (select 1 from loans);
