// public/app.js — ฝั่งหน้าเว็บ เรียก API ของเซิร์ฟเวอร์แล้วแสดงผล

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const thDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const baht = (n) => Number(n).toLocaleString('th-TH') + ' บาท';

async function api(path, options = {}) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'เกิดข้อผิดพลาด');
    return data;
}

let toastTimer;
function toast(message, isError = false) {
    const el = $('#toast');
    el.textContent = message;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'toast'), 2800);
}

function table(el, headers, rows, emptyText) {
    const head = '<tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr>';
    const body = rows.length ? rows.join('') : `<tr><td class="empty" colspan="${headers.length}">${emptyText}</td></tr>`;
    el.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

function loanStatus(loan) {
    if (loan.returnDate) return `<span class="badge done">คืนแล้ว ${thDate(loan.returnDate)}</span>`;
    if (loan.overdue) return `<span class="badge late">เกินกำหนด ${loan.daysLate} วัน</span>`;
    return '<span class="badge out">กำลังยืม</span>';
}

// ---------- ภาพรวม ----------
async function loadDashboard() {
    const [s, active] = await Promise.all([api('/api/stats'), api('/api/loans?active=1')]);
    const cards = [
        ['ทรัพยากรทั้งหมด', s.totalItems, ''],
        ['ว่างให้ยืม', s.availableItems, 'good'],
        ['สมาชิก', s.totalMembers, ''],
        ['กำลังถูกยืม', s.activeLoans, ''],
        ['เกินกำหนด', s.overdueLoans, s.overdueLoans ? 'warn' : ''],
        ['ค่าปรับค้างชำระ', baht(s.pendingFines), s.pendingFines ? 'warn' : ''],
        ['ค่าปรับที่เก็บแล้ว', baht(s.collectedFines), '']
    ];
    $('#stats').innerHTML = cards.map(([label, num, cls]) => `<div class="stat ${cls}"><div class="num">${num}</div><div class="label">${label}</div></div>`).join('');
    table(
        $('#activeTable'),
        ['ทรัพยากร', 'ผู้ยืม', 'วันที่ยืม', 'ครบกำหนด', 'สถานะ', 'ค่าปรับ'],
        active.map((l) => `<tr>
            <td>${esc(l.item.title)}<div class="sub">${esc(l.item.typeLabel)}</div></td>
            <td>${esc(l.member.name)}<div class="sub">${esc(l.member.typeLabel)}</div></td>
            <td class="date">${thDate(l.borrowDate)}</td><td class="date">${thDate(l.dueDate)}</td>
            <td>${loanStatus(l)}</td><td class="num">${baht(l.fine)}</td></tr>`),
        'ไม่มีรายการที่ยังไม่คืน'
    );
}

// ---------- ทรัพยากร ----------
const extraLabels = { BOOK: 'ISBN', MAGAZINE: 'ฉบับที่', TEXTBOOK: 'รายวิชา' };
$('#itemType').addEventListener('change', (e) => ($('#extraLabel').textContent = extraLabels[e.target.value]));

async function loadItems() {
    const q = $('#itemSearch').value;
    const items = await api('/api/items?q=' + encodeURIComponent(q));
    table(
        $('#itemTable'),
        ['#', 'ชื่อเรื่อง', 'ประเภท', 'ปี', 'ข้อมูลเฉพาะ', 'สถานะ', ''],
        items.map((i) => `<tr>
            <td>${i.id}</td>
            <td>${esc(i.title)}<div class="sub">${esc(i.author)}</div></td>
            <td><span class="badge type">${esc(i.typeLabel)}</span><div class="sub">ยืม ${i.loanDays} วัน · ปรับ ${i.finePerDay} บ./วัน</div></td>
            <td>${i.year}</td>
            <td><span class="sub">${esc(i.extraLabel)}</span><br>${esc(i.extra)}</td>
            <td>${i.available ? '<span class="badge ok">ว่าง</span>' : '<span class="badge out">ถูกยืม</span>'}</td>
            <td><button class="btn small danger" data-del-item="${i.id}">ลบ</button></td></tr>`),
        q ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีทรัพยากร'
    );
}

$('#itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
        await api('/api/items', { method: 'POST', body: JSON.stringify(body) });
        e.target.reset();
        $('#extraLabel').textContent = 'ISBN';
        toast('เพิ่มทรัพยากรเรียบร้อย');
        loadItems();
    } catch (err) {
        toast(err.message, true);
    }
});

let searchTimer;
$('#itemSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadItems, 250);
});

// ---------- สมาชิก ----------
async function loadMembers() {
    const members = await api('/api/members');
    table(
        $('#memberTable'),
        ['#', 'ชื่อ', 'อีเมล', 'ประเภท', 'สิทธิ์การยืม', ''],
        members.map((m) => `<tr>
            <td>${m.id}</td><td>${esc(m.name)}</td><td>${esc(m.email)}</td>
            <td><span class="badge type">${esc(m.typeLabel)}</span></td>
            <td class="sub">สูงสุด ${m.maxLoans} รายการ${m.extraLoanDays ? ` · +${m.extraLoanDays} วัน` : ''}</td>
            <td><button class="btn small danger" data-del-member="${m.id}">ลบ</button></td></tr>`),
        'ยังไม่มีสมาชิก'
    );
}

$('#memberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await api('/api/members', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
        e.target.reset();
        toast('เพิ่มสมาชิกเรียบร้อย');
        loadMembers();
    } catch (err) {
        toast(err.message, true);
    }
});

// ---------- ยืม-คืน ----------
let cache = { items: [], members: [] };

function updateDuePreview() {
    const item = cache.items.find((i) => String(i.id) === $('#loanItem').value);
    const member = cache.members.find((m) => String(m.id) === $('#loanMember').value);
    if (!item || !member) return ($('#duePreview').textContent = '');
    const days = item.loanDays + member.extraLoanDays;
    const due = new Date();
    due.setDate(due.getDate() + days);
    $('#duePreview').textContent = `ยืมได้ ${days} วัน · ครบกำหนดคืน ${due.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

async function loadLoans() {
    const [items, members, loans] = await Promise.all([
        api('/api/items'),
        api('/api/members'),
        api('/api/loans' + ($('#activeOnly').checked ? '?active=1' : ''))
    ]);
    cache = { items: items.filter((i) => i.available), members };
    $('#loanMember').innerHTML = members.map((m) => `<option value="${m.id}">${esc(m.name)} (${esc(m.typeLabel)})</option>`).join('');
    $('#loanItem').innerHTML = cache.items.length
        ? cache.items.map((i) => `<option value="${i.id}">${esc(i.title)} — ${esc(i.typeLabel)}</option>`).join('')
        : '<option value="">ไม่มีทรัพยากรว่าง</option>';
    updateDuePreview();

    table(
        $('#loanTable'),
        ['#', 'ทรัพยากร', 'ผู้ยืม', 'ยืม', 'ครบกำหนด', 'สถานะ', 'ค่าปรับ', ''],
        loans.map((l) => `<tr>
            <td>${l.id}</td>
            <td>${esc(l.item.title)}<div class="sub">${esc(l.item.typeLabel)}</div></td>
            <td>${esc(l.member.name)}</td>
            <td class="date">${thDate(l.borrowDate)}</td><td class="date">${thDate(l.dueDate)}</td>
            <td>${loanStatus(l)}</td><td class="num">${baht(l.fine)}</td>
            <td>${l.returnDate ? '' : `<button class="btn small ghost" data-return="${l.id}">คืน</button>`}</td></tr>`),
        'ยังไม่มีรายการยืม'
    );
}

$('#loanItem').addEventListener('change', updateDuePreview);
$('#loanMember').addEventListener('change', updateDuePreview);
$('#activeOnly').addEventListener('change', loadLoans);

$('#loanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const loan = await api('/api/loans', {
            method: 'POST',
            body: JSON.stringify({ itemId: $('#loanItem').value, memberId: $('#loanMember').value })
        });
        toast(`ยืมสำเร็จ ครบกำหนดคืน ${thDate(loan.dueDate)}`);
        loadLoans();
    } catch (err) {
        toast(err.message, true);
    }
});

// ---------- ปุ่มลบ / คืน (event delegation) ----------
document.addEventListener('click', async (e) => {
    const t = e.target;
    try {
        if (t.dataset.delItem && confirm('ต้องการลบทรัพยากรนี้?')) {
            await api('/api/items/' + t.dataset.delItem, { method: 'DELETE' });
            toast('ลบทรัพยากรแล้ว');
            loadItems();
        } else if (t.dataset.delMember && confirm('ต้องการลบสมาชิกนี้?')) {
            await api('/api/members/' + t.dataset.delMember, { method: 'DELETE' });
            toast('ลบสมาชิกแล้ว');
            loadMembers();
        } else if (t.dataset.return) {
            const loan = await api(`/api/loans/${t.dataset.return}/return`, { method: 'POST' });
            toast(loan.fine > 0 ? `คืนแล้ว มีค่าปรับ ${baht(loan.fine)}` : 'คืนเรียบร้อย ไม่มีค่าปรับ');
            loadLoans();
        }
    } catch (err) {
        toast(err.message, true);
    }
});

// ---------- แท็บ ----------
const loaders = { dashboard: loadDashboard, items: loadItems, members: loadMembers, loans: loadLoans };
$('#tabs').addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    if (!tab) return;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === tab));
    loaders[tab]().catch((err) => toast(err.message, true));
});

loadDashboard().catch((err) => toast(err.message, true));
