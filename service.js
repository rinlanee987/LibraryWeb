// js/service.js — กฎของห้องสมุด (Composition ของ Repository ทั้งสาม)

class LibraryService {
  #items; #members; #loans;
  constructor(client) {
    this.#items = new ItemRepository(client);
    this.#members = new MemberRepository(client);
    this.#loans = new LoanRepository(client, this.#items, this.#members);
  }

  // โหลดข้อมูลล่าสุดจากฐานข้อมูล (loans ต้องโหลดหลังสุด เพราะอ้างอิง items และ members)
  async refresh() {
    await Promise.all([this.#items.load(), this.#members.load()]);
    await this.#loans.load();
  }
  static #err(message) { return [null, { message }]; }

  getItems(q = '') { return this.#items.search(q); }
  getMembers() { return this.#members.findAll(); }
  getLoans(activeOnly = false) { return activeOnly ? this.#loans.findActive() : this.#loans.findAll().sort((a, b) => b.getBorrowDate().localeCompare(a.getBorrowDate())); }

  async addItem(input) {
    const item = ItemFactory.create(input);
    if (!item) return LibraryService.#err('ประเภททรัพยากรไม่ถูกต้อง');
    const bad = item.validate();
    if (bad) return LibraryService.#err(bad);
    return [await this.#items.save(item), null];
  }
  async deleteItem(id) {
    const item = this.#items.findById(id);
    if (!item) return LibraryService.#err('ไม่พบทรัพยากรนี้');
    if (!item.isAvailable()) return LibraryService.#err('ทรัพยากรนี้กำลังถูกยืมอยู่ ลบไม่ได้');
    if (this.#loans.countByItem(id) > 0) return LibraryService.#err('ทรัพยากรนี้มีประวัติการยืม ลบไม่ได้');
    await this.#items.delete(id);
    return [true, null];
  }
  async addMember(input) {
    const m = MemberFactory.create(input);
    if (!m) return LibraryService.#err('ประเภทสมาชิกไม่ถูกต้อง');
    const bad = m.validate();
    if (bad) return LibraryService.#err(bad);
    if (this.#members.findByEmail(m.getEmail())) return LibraryService.#err('อีเมลนี้ถูกใช้แล้ว');
    return [await this.#members.save(m), null];
  }
  async deleteMember(id) {
    if (!this.#members.findById(id)) return LibraryService.#err('ไม่พบสมาชิกนี้');
    if (this.#loans.countByMember(id) > 0) return LibraryService.#err('สมาชิกนี้มีประวัติการยืม ลบไม่ได้');
    await this.#members.delete(id);
    return [true, null];
  }
  async borrow(itemId, memberId, date = DateUtil.today()) {
    const item = this.#items.findById(itemId);
    if (!item) return LibraryService.#err('กรุณาเลือกทรัพยากร');
    const member = this.#members.findById(memberId);
    if (!member) return LibraryService.#err('กรุณาเลือกสมาชิก');
    if (!item.isAvailable()) return LibraryService.#err(`"${item.getTitle()}" ถูกยืมไปแล้ว`);
    const active = this.#loans.findActiveByMember(memberId);
    if (active.some((l) => l.isOverdue(date))) return LibraryService.#err(`${member.getName()} มีรายการเกินกำหนดคืน กรุณาคืนก่อนยืมใหม่`);
    if (active.length >= member.getMaxLoans()) return LibraryService.#err(`${member.getTypeLabel()}ยืมพร้อมกันได้ไม่เกิน ${member.getMaxLoans()} รายการ`);
    const loan = Loan.create(item, member, date);
    item.setAvailable(false);
    await this.#items.save(item);
    return [await this.#loans.save(loan), null];
  }
  async returnItem(loanId) {
    const loan = this.#loans.findById(loanId);
    if (!loan) return LibraryService.#err('ไม่พบรายการยืมนี้');
    if (loan.isReturned()) return LibraryService.#err('รายการนี้คืนแล้ว');
    loan.markReturned();
    await this.#items.save(loan.getItem());
    return [await this.#loans.save(loan), null];
  }
  getStats() {
    const active = this.#loans.findActive(), overdue = active.filter((l) => l.isOverdue());
    return {
      totalItems: this.#items.count(), availableItems: this.#items.countAvailable(),
      totalMembers: this.#members.count(), activeLoans: active.length, overdueLoans: overdue.length,
      pendingFines: overdue.reduce((s, l) => s + l.calculateFine(), 0), collectedFines: this.#loans.totalFinesCollected()
    };
  }
}
