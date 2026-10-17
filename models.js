// js/models.js — คลาสหลักของระบบ (Model) ตามหลัก OOP
const ItemType = Object.freeze({ BOOK: 'BOOK', MAGAZINE: 'MAGAZINE', TEXTBOOK: 'TEXTBOOK' });
const MemberType = Object.freeze({ STUDENT: 'STUDENT', TEACHER: 'TEACHER' });

class DateUtil {
  static today() {
    const d = new Date();
    return DateUtil.format(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
  }
  static format(date) { return date.toISOString().slice(0, 10); }
  static addDays(str, days) {
    const d = new Date(str + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return DateUtil.format(d);
  }
  static diffDays(from, to) {
    return Math.round((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 86400000);
  }
}

/** Abstract class ของทรัพยากรทุกชนิด */
class LibraryItem {
  _id; _title; _author; _year; _available; _itemType; // protected (ตามธรรมเนียม _)
  constructor(title, author, year, itemType, id = null, available = true) {
    if (new.target === LibraryItem) throw new TypeError('LibraryItem เป็น abstract class');
    this._title = String(title).trim();
    this._author = String(author).trim();
    this._year = Number(year);
    this._itemType = itemType;
    this._id = id;
    this._available = available;
  }
  // abstract methods
  getTypeLabel() { throw new Error('abstract'); }
  getLoanDays() { throw new Error('abstract'); }
  getFinePerDay() { throw new Error('abstract'); }
  getExtra() { throw new Error('abstract'); }
  getExtraLabel() { throw new Error('abstract'); }
  validateExtra() { throw new Error('abstract'); }

  validate() {
    if (!this._title) return 'กรุณากรอกชื่อเรื่อง';
    if (!this._author) return 'กรุณากรอกชื่อผู้แต่ง';
    const y = new Date().getFullYear();
    if (!Number.isInteger(this._year) || this._year < 1000 || this._year > y) return `ปีที่พิมพ์ต้องอยู่ระหว่าง 1000 - ${y}`;
    return this.validateExtra();
  }
  calculateFine(daysLate) { return Math.max(0, daysLate) * this.getFinePerDay(); }

  getId() { return this._id; }
  setId(id) { this._id = id; }
  getTitle() { return this._title; }
  getAuthor() { return this._author; }
  getYear() { return this._year; }
  getType() { return this._itemType; }
  isAvailable() { return this._available; }
  setAvailable(v) { this._available = v; }
  toRecord() {
    return { type: this._itemType, title: this._title, author: this._author, year: this._year, extra: this.getExtra(), available: this._available };
  }
}

class Book extends LibraryItem {
  #isbn;
  constructor(title, author, year, isbn, id = null, available = true) {
    super(title, author, year, ItemType.BOOK, id, available);
    this.#isbn = String(isbn).trim();
  }
  getTypeLabel() { return 'หนังสือทั่วไป'; }
  getLoanDays() { return 14; }
  getFinePerDay() { return 5; }
  getExtra() { return this.#isbn; }
  getExtraLabel() { return 'ISBN'; }
  validateExtra() {
    return /^\d{10}(\d{3})?$/.test(this.#isbn.replace(/-/g, '')) ? null : 'ISBN ต้องเป็นตัวเลข 10 หรือ 13 หลัก';
  }
}

class Magazine extends LibraryItem {
  static MAX_FINE = 50;
  #issueNo;
  constructor(title, author, year, issueNo, id = null, available = true) {
    super(title, author, year, ItemType.MAGAZINE, id, available);
    this.#issueNo = String(issueNo).trim();
  }
  getTypeLabel() { return 'นิตยสาร'; }
  getLoanDays() { return 7; }
  getFinePerDay() { return 2; }
  getExtra() { return this.#issueNo; }
  getExtraLabel() { return 'ฉบับที่'; }
  validateExtra() { return this.#issueNo ? null : 'กรุณากรอกฉบับที่ของนิตยสาร'; }
  // Method overriding: จำกัดค่าปรับสูงสุด
  calculateFine(daysLate) { return Math.min(super.calculateFine(daysLate), Magazine.MAX_FINE); }
}

class Textbook extends LibraryItem {
  #subject;
  constructor(title, author, year, subject, id = null, available = true) {
    super(title, author, year, ItemType.TEXTBOOK, id, available);
    this.#subject = String(subject).trim();
  }
  getTypeLabel() { return 'ตำราเรียน'; }
  getLoanDays() { return 3; }
  getFinePerDay() { return 10; }
  getExtra() { return this.#subject; }
  getExtraLabel() { return 'รายวิชา'; }
  validateExtra() { return this.#subject ? null : 'กรุณากรอกรายวิชาของตำรา'; }
}

/** Abstract class ของสมาชิก */
class Member {
  _id; _name; _email; _memberType;
  constructor(name, email, memberType, id = null) {
    if (new.target === Member) throw new TypeError('Member เป็น abstract class');
    this._name = String(name).trim();
    this._email = String(email).trim().toLowerCase();
    this._memberType = memberType;
    this._id = id;
  }
  getTypeLabel() { throw new Error('abstract'); }
  getMaxLoans() { throw new Error('abstract'); }
  getExtraLoanDays() { throw new Error('abstract'); }
  validate() {
    if (!this._name) return 'กรุณากรอกชื่อสมาชิก';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._email)) return 'รูปแบบอีเมลไม่ถูกต้อง';
    return null;
  }
  getId() { return this._id; }
  setId(id) { this._id = id; }
  getName() { return this._name; }
  getEmail() { return this._email; }
  getType() { return this._memberType; }
  toRecord() { return { type: this._memberType, name: this._name, email: this._email }; }
}
class Student extends Member {
  constructor(name, email, id = null) { super(name, email, MemberType.STUDENT, id); }
  getTypeLabel() { return 'นักศึกษา'; }
  getMaxLoans() { return 3; }
  getExtraLoanDays() { return 0; }
}
class Teacher extends Member {
  constructor(name, email, id = null) { super(name, email, MemberType.TEACHER, id); }
  getTypeLabel() { return 'อาจารย์'; }
  getMaxLoans() { return 10; }
  getExtraLoanDays() { return 7; }
}

/** Loan — Composition: ประกอบด้วย LibraryItem และ Member */
class Loan {
  #id; #item; #member; #borrowDate; #dueDate; #returnDate; #fine;
  constructor(item, member, borrowDate, dueDate, returnDate = null, fine = 0, id = null) {
    this.#item = item; this.#member = member;
    this.#borrowDate = borrowDate; this.#dueDate = dueDate;
    this.#returnDate = returnDate; this.#fine = fine; this.#id = id;
  }
  static create(item, member, borrowDate = DateUtil.today()) {
    const days = item.getLoanDays() + member.getExtraLoanDays();
    return new Loan(item, member, borrowDate, DateUtil.addDays(borrowDate, days));
  }
  isReturned() { return this.#returnDate !== null; }
  getDaysLate(asOf = DateUtil.today()) {
    return Math.max(0, DateUtil.diffDays(this.#dueDate, this.#returnDate ?? asOf));
  }
  isOverdue(asOf = DateUtil.today()) { return !this.isReturned() && this.getDaysLate(asOf) > 0; }
  // Polymorphism: item อาจเป็น Book / Magazine / Textbook
  calculateFine(asOf = DateUtil.today()) {
    return this.isReturned() ? this.#fine : this.#item.calculateFine(this.getDaysLate(asOf));
  }
  markReturned(date = DateUtil.today()) {
    this.#fine = this.#item.calculateFine(Math.max(0, DateUtil.diffDays(this.#dueDate, date)));
    this.#returnDate = date;
    this.#item.setAvailable(true);
  }
  getId() { return this.#id; }
  setId(id) { this.#id = id; }
  getItem() { return this.#item; }
  getMember() { return this.#member; }
  getBorrowDate() { return this.#borrowDate; }
  getDueDate() { return this.#dueDate; }
  getReturnDate() { return this.#returnDate; }
  toRecord() {
    return { itemId: this.#item.getId(), memberId: this.#member.getId(), borrowDate: this.#borrowDate,
             dueDate: this.#dueDate, returnDate: this.#returnDate, fine: this.#fine };
  }
}

class ItemFactory {
  static create({ type, title, author, year, extra }, id = null, available = true) {
    switch (type) {
      case ItemType.BOOK: return new Book(title, author, year, extra, id, available);
      case ItemType.MAGAZINE: return new Magazine(title, author, year, extra, id, available);
      case ItemType.TEXTBOOK: return new Textbook(title, author, year, extra, id, available);
      default: return null;
    }
  }
}
class MemberFactory {
  static create({ type, name, email }, id = null) {
    switch (type) {
      case MemberType.STUDENT: return new Student(name, email, id);
      case MemberType.TEACHER: return new Teacher(name, email, id);
      default: return null;
    }
  }
}
