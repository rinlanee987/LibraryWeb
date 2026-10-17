// js/app.js — ส่วนแสดงผลหน้าเว็บ (UI) เรียกใช้ LibraryService
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const thDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const baht = (n) => Number(n).toLocaleString('th-TH') + ' บาท';
let library = null, tab = 'dashboard', renderQueued = false, busy = false;

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3500);
}

// แปลงข้อผิดพลาดจาก Supabase / PostgreSQL เป็นข้อความที่ผู้ใช้เข้าใจ
function describeError(e) {
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? '');
  if (code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg))
    return 'ยังไม่ได้สร้างตารางในฐานข้อมูล กรุณารันไฟล์ setup.sql ใน Supabase SQL Editor ก่อน';
  if (code === '23505') return 'ข้อมูลนี้ซ้ำกับที่มีอยู่แล้ว (เช่น อีเมลซ้ำ)';
  if (code === '23503') return 'ลบไม่ได้ เพราะข้อมูลนี้ถูกอ้างอิงอยู่ในประวัติการยืม';
  if (code === '42501' || /row-level security/i.test(msg)) return 'ฐานข้อมูลไม่อนุญาตให้แก้ไข กรุณาตรวจสอบ Policy ใน setup.sql';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ต หรือดูว่าโปรเจกต์ Supabase ถูกพักอยู่หรือไม่';
  return 'เกิดข้อผิดพลาด: ' + (msg || 'ไม่ทราบสาเหตุ');
}

// ทำงานหนึ่งอย่าง -> ถ้าสำเร็จให้โหลดข้อมูลใหม่จากฐานข้อมูลแล้ววาดหน้าใหม่
async function act(fn, okMsg) {
  if (busy) return;
  busy = true;
  document.body.style.cursor = 'progress';
  try {
    const [data, err] = await fn();
    if (err) { toast(err.message, true); return; }
    await library.refresh();
    render();
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(data) : okMsg);
    return data;
  } catch (e) {
    console.error(e);
    toast(describeError(e), true);
    try { await library.refresh(); render(); } catch {}
  } finally {
    busy = false;
    document.body.style.cursor = '';
  }
}

function table(el, heads, rows, emptyText) {
  el.innerHTML = `<thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.length ? rows.join('') : `<tr><td class="empty" colspan="${heads.length}">${emptyText}</td></tr>`}</tbody>`;
}
function statusPill(l) {
  if (l.isReturned()) return `<span class="pill done">คืนแล้ว ${thDate(l.getReturnDate())}</span>`;
  if (l.isOverdue()) return `<span class="pill late">เกินกำหนด ${l.getDaysLate()} วัน</span>`;
  return '<span class="pill out">กำลังยืม</span>';
}

function renderDashboard() {
  const s = library.getStats();
  const cards = [
    ['ทรัพยากรทั้งหมด', s.totalItems, ''], ['ว่างให้ยืม', s.availableItems, 'good'], ['สมาชิก', s.totalMembers, ''],
    ['กำลังถูกยืม', s.activeLoans, ''], ['เกินกำหนด', s.overdueLoans, s.overdueLoans ? 'warn' : ''],
    ['ค่าปรับค้างชำระ', baht(s.pendingFines), s.pendingFines ? 'warn' : ''], ['ค่าปรับที่เก็บแล้ว', baht(s.collectedFines), '']
  ];
  $('#stats').innerHTML = cards.map(([l, n, c]) => `<div class="stat ${c}"><b>${n}</b><span>${l}</span></div>`).join('');
  table($('#activeTable'), ['ทรัพยากร', 'ผู้ยืม', 'วันที่ยืม', 'ครบกำหนด', 'สถานะ', 'ค่าปรับ'],
    library.getLoans(true).map((l) => `<tr>
      <td>${esc(l.getItem().getTitle())}<div class="sub">${esc(l.getItem().getTypeLabel())}</div></td>
      <td>${esc(l.getMember().getName())}<div class="sub">${esc(l.getMember().getTypeLabel())}</div></td>
      <td class="d">${thDate(l.getBorrowDate())}</td><td class="d">${thDate(l.getDueDate())}</td>
      <td>${statusPill(l)}</td><td class="n">${baht(l.calculateFine())}</td></tr>`),
    'ยังไม่มีรายการที่ยืมอยู่ ไปที่แท็บ "ยืม-คืน" เพื่อบันทึกการยืม');
}

function renderItems() {
  const q = $('#itemSearch').value;
  const items = library.getItems(q);
  table($('#itemTable'), ['ชื่อเรื่อง', 'ประเภท', 'ปี', 'ข้อมูลเฉพาะ', 'สถานะ', ''],
    items.map((i) => `<tr>
      <td>${esc(i.getTitle())}<div class="sub">${esc(i.getAuthor())}</div></td>
      <td><span class="pill type">${esc(i.getTypeLabel())}</span><div class="sub">ยืม ${i.getLoanDays()} วัน · ปรับ ${i.getFinePerDay()} บ./วัน</div></td>
      <td class="d">${i.getYear()}</td>
      <td><span class="sub">${esc(i.getExtraLabel())}</span><br>${esc(i.getExtra())}</td>
      <td>${i.isAvailable() ? '<span class="pill ok">ว่าง</span>' : '<span class="pill out">ถูกยืม</span>'}</td>
      <td><button class="btn sm danger" data-del="item" data-id="${esc(i.getId())}">ลบ</button></td></tr>`),
    q ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีทรัพยากร เพิ่มเล่มแรกจากฟอร์มด้านซ้าย');
}

function renderMembers() {
  table($('#memberTable'), ['ชื่อ', 'อีเมล', 'ประเภท', 'สิทธิ์การยืม', ''],
    library.getMembers().map((m) => `<tr>
      <td>${esc(m.getName())}</td><td>${esc(m.getEmail())}</td>
      <td><span class="pill type">${esc(m.getTypeLabel())}</span></td>
      <td class="sub">สูงสุด ${m.getMaxLoans()} รายการ${m.getExtraLoanDays() ? ` · +${m.getExtraLoanDays()} วัน` : ''}</td>
      <td><button class="btn sm danger" data-del="member" data-id="${esc(m.getId())}">ลบ</button></td></tr>`),
    'ยังไม่มีสมาชิก เพิ่มคนแรกจากฟอร์มด้านซ้าย');
}

function renderLoans() {
  const members = library.getMembers(), free = library.getItems().filter((i) => i.isAvailable());
  const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
  keep($('#loanMember'), members.length ? members.map((m) => `<option value="${esc(m.getId())}">${esc(m.getName())} (${esc(m.getTypeLabel())})</option>`).join('') : '<option value="">ยังไม่มีสมาชิก</option>');
  keep($('#loanItem'), free.length ? free.map((i) => `<option value="${esc(i.getId())}">${esc(i.getTitle())} · ${esc(i.getTypeLabel())}</option>`).join('') : '<option value="">ไม่มีทรัพยากรว่าง</option>');
  updateDue();
  table($('#loanTable'), ['ทรัพยากร', 'ผู้ยืม', 'ยืม', 'ครบกำหนด', 'สถานะ', 'ค่าปรับ', ''],
    library.getLoans($('#activeOnly').checked).map((l) => `<tr>
      <td>${esc(l.getItem().getTitle())}<div class="sub">${esc(l.getItem().getTypeLabel())}</div></td>
      <td>${esc(l.getMember().getName())}</td>
      <td class="d">${thDate(l.getBorrowDate())}</td><td class="d">${thDate(l.getDueDate())}</td>
      <td>${statusPill(l)}</td><td class="n">${baht(l.calculateFine())}</td>
      <td>${l.isReturned() ? '' : `<button class="btn sm ghost" data-return="${esc(l.getId())}">คืน</button>`}</td></tr>`),
    'ยังไม่มีรายการยืม');
}
function updateDue() {
  const item = library.getItems().find((i) => i.getId() === $('#loanItem').value);
  const member = library.getMembers().find((m) => m.getId() === $('#loanMember').value);
  if (!item || !member) return ($('#duePreview').textContent = '');
  const days = item.getLoanDays() + member.getExtraLoanDays();
  $('#duePreview').textContent = `ยืมได้ ${days} วัน · ครบกำหนดคืน ${thDate(DateUtil.addDays(DateUtil.today(), days))}`;
}

const renderers = { dashboard: renderDashboard, items: renderItems, members: renderMembers, loans: renderLoans };
function render() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => { renderQueued = false; if (library) renderers[tab](); });
}

$('#tabs').addEventListener('click', (e) => {
  const t = e.target.closest('button')?.dataset.tab;
  if (!t) return;
  tab = t;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== t));
  render();
});

const extraLabels = { BOOK: 'ISBN (10 หรือ 13 หลัก)', MAGAZINE: 'ฉบับที่', TEXTBOOK: 'รายวิชา' };
$('#itemType').addEventListener('change', (e) => ($('#extraLabel').textContent = extraLabels[e.target.value]));
$('#itemSearch').addEventListener('input', render);
$('#activeOnly').addEventListener('change', render);
$('#loanItem').addEventListener('change', updateDue);
$('#loanMember').addEventListener('change', updateDue);

$('#itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (await act(() => library.addItem(f), 'เพิ่มทรัพยากรแล้ว')) { e.target.reset(); $('#extraLabel').textContent = extraLabels.BOOK; }
});
$('#memberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (await act(() => library.addMember(f), 'เพิ่มสมาชิกแล้ว')) e.target.reset();
});
$('#loanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await act(() => library.borrow($('#loanItem').value, $('#loanMember').value), (l) => `ยืมสำเร็จ ครบกำหนดคืน ${thDate(l.getDueDate())}`);
});

// ปุ่มลบต้องกดสองครั้ง (ยืนยันในหน้า) / ปุ่มคืน
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.return) {
    await act(() => library.returnItem(b.dataset.return), (l) => l.calculateFine() > 0 ? `คืนแล้ว มีค่าปรับ ${baht(l.calculateFine())}` : 'คืนแล้ว ไม่มีค่าปรับ');
  } else if (b.dataset.del) {
    if (!b.classList.contains('armed')) {
      b.classList.add('armed'); b.textContent = 'ยืนยันลบ';
      setTimeout(() => { b.classList.remove('armed'); b.textContent = 'ลบ'; }, 3000);
      return;
    }
    const id = b.dataset.id;
    if (b.dataset.del === 'item') await act(() => library.deleteItem(id), 'ลบทรัพยากรแล้ว');
    else await act(() => library.deleteMember(id), 'ลบสมาชิกแล้ว');
  }
});

// ---------- เริ่มต้น: เชื่อมต่อ Supabase แล้วโหลดข้อมูล ----------
(async function start() {
  const notice = $('#notice');
  if (!window.supabase?.createClient) {
    notice.textContent = 'โหลดไลบรารี Supabase ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า';
    notice.hidden = false;
    return;
  }
  const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
  library = new LibraryService(client);
  notice.textContent = 'กำลังโหลดข้อมูลจากฐานข้อมูล...';
  notice.hidden = false;
  try {
    await library.refresh();
    notice.hidden = true;
  } catch (e) {
    console.error(e);
    notice.textContent = describeError(e);
  }
  render();
})();
