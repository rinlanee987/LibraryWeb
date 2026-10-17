// js/repositories.js — ส่วนที่ติดต่อฐานข้อมูล Supabase (PostgreSQL)

/**
 * Abstract Repository: เก็บคำสั่งที่ใช้ร่วมกันทุกตาราง
 * คลาสลูกต้อง implement mapRow() (แถว -> object) และ toRow() (object -> แถว)
 */
class Repository {
  _client;      // Supabase client (protected)
  _table;       // ชื่อตาราง
  _rows = [];   // ข้อมูลล่าสุดที่โหลดมา

  constructor(client, table) {
    if (new.target === Repository) throw new TypeError('Repository เป็น abstract class');
    this._client = client;
    this._table = table;
  }

  mapRow(row) { throw new Error('abstract'); }
  toRow(entity) { throw new Error('abstract'); }

  // SELECT * FROM table ORDER BY created_at DESC
  async load() {
    const { data, error } = await this._client.from(this._table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    this._rows = data;
  }

  findAll() { return this._rows.map((r) => this.mapRow(r)).filter(Boolean); }
  findById(id) {
    const row = this._rows.find((r) => r.id === id);
    return row ? this.mapRow(row) : null;
  }
  count() { return this._rows.length; }

  // INSERT ถ้ายังไม่มี id, UPDATE ถ้ามี id แล้ว
  async save(entity) {
    const row = this.toRow(entity);
    const id = entity.getId();
    if (id === null) {
      const { data, error } = await this._client.from(this._table).insert(row).select().single();
      if (error) throw error;
      entity.setId(data.id);
    } else {
      const { error } = await this._client.from(this._table).update(row).eq('id', id);
      if (error) throw error;
    }
    return entity;
  }

  async delete(id) {
    const { error } = await this._client.from(this._table).delete().eq('id', id);
    if (error) throw error;
  }
}

class ItemRepository extends Repository {
  constructor(client) { super(client, 'items'); }
  mapRow(r) { return ItemFactory.create(r, r.id, r.available); }
  toRow(item) {
    return { type: item.getType(), title: item.getTitle(), author: item.getAuthor(), year: item.getYear(),
             extra: item.getExtra(), available: item.isAvailable() };
  }
  search(keyword) {
    const k = keyword.trim().toLowerCase();
    if (!k) return this.findAll();
    return this.findAll().filter((i) => [i.getTitle(), i.getAuthor(), i.getExtra()].some((s) => s.toLowerCase().includes(k)));
  }
  countAvailable() { return this._rows.filter((r) => r.available).length; }
}

class MemberRepository extends Repository {
  constructor(client) { super(client, 'members'); }
  mapRow(r) { return MemberFactory.create(r, r.id); }
  toRow(m) { return { type: m.getType(), name: m.getName(), email: m.getEmail() }; }
  findByEmail(email) { return this.findAll().find((m) => m.getEmail() === email.toLowerCase()) ?? null; }
}

class LoanRepository extends Repository {
  #itemRepo;
  #memberRepo;
  constructor(client, itemRepo, memberRepo) {
    super(client, 'loans');
    this.#itemRepo = itemRepo;      // Composition: ใช้ Repository อื่นประกอบ object ของ Loan
    this.#memberRepo = memberRepo;
  }
  mapRow(r) {
    const item = this.#itemRepo.findById(r.item_id);
    const member = this.#memberRepo.findById(r.member_id);
    if (!item || !member) return null;
    return new Loan(item, member, r.borrow_date, r.due_date, r.return_date ?? null, Number(r.fine ?? 0), r.id);
  }
  toRow(loan) {
    return { item_id: loan.getItem().getId(), member_id: loan.getMember().getId(), borrow_date: loan.getBorrowDate(),
             due_date: loan.getDueDate(), return_date: loan.getReturnDate(), fine: loan.isReturned() ? loan.calculateFine() : 0 };
  }
  findActive() { return this.findAll().filter((l) => !l.isReturned()).sort((a, b) => a.getDueDate().localeCompare(b.getDueDate())); }
  findActiveByMember(id) { return this.findActive().filter((l) => l.getMember().getId() === id); }
  countByItem(id) { return this._rows.filter((r) => r.item_id === id).length; }
  countByMember(id) { return this._rows.filter((r) => r.member_id === id).length; }
  totalFinesCollected() { return this.findAll().filter((l) => l.isReturned()).reduce((s, l) => s + l.calculateFine(), 0); }
}
