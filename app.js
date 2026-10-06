const KEY = 'expenseswallet.v1';
const EXPENSE_CATS = ['Food', 'Transport', 'Home', 'Health', 'Shopping', 'Other'];
const INCOME_CATS = ['Salary', 'Gift', 'Other'];

let type = 'expense';
let viewYear, viewMonth;
const now = new Date();
viewYear = now.getFullYear();
viewMonth = now.getMonth();

const $ = (id) => document.getElementById(id);
const listEl = $('list'), emptyEl = $('empty');

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save(tx) { localStorage.setItem(KEY, JSON.stringify(tx)); }
function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString(); }
function monthId(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }

function setType(t) {
  type = t;
  $('typeExpense').classList.toggle('active', t === 'expense');
  $('typeIncome').classList.toggle('active', t === 'income');
  fillCats();
}
function fillCats() {
  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;
  $('category').innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

function render() {
  const all = load();
  const mid = monthId(viewYear, viewMonth);
  const items = all
    .filter(t => (t.date || '').startsWith(mid))
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  const d = new Date(viewYear, viewMonth, 1);
  $('currentMonth').textContent = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  $('monthLabel').textContent = '· ' + d.toLocaleString(undefined, { month: 'short' });

  let tin = 0, tout = 0;
  items.forEach(t => { if (t.type === 'income') tin += +t.amount; else tout += +t.amount; });
  $('totalIn').textContent = fmt(tin);
  $('totalOut').textContent = fmt(tout);
  $('balance').textContent = fmt(tin - tout);

  listEl.innerHTML = '';
  emptyEl.style.display = items.length ? 'none' : 'block';
  items.forEach(t => {
    const li = document.createElement('li');
    const sign = t.type === 'income' ? '+' : '−';
    li.innerHTML = `<div><div><strong>${escapeHtml(t.category)}</strong> ${t.note ? '· ' + escapeHtml(t.note) : ''}</div>
      <div class="meta">${escapeHtml(t.date)}</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="${t.type === 'income' ? 'amt-income' : 'amt-expense'}">${sign}${fmt(+t.amount)}</span>
        <button class="del" aria-label="Delete">×</button>
      </div>`;
    li.querySelector('.del').onclick = () => {
      if (!confirm('Delete this entry?')) return;
      save(load().filter(x => x.id !== t.id));
      render();
    };
    listEl.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('typeExpense').onclick = () => setType('expense');
$('typeIncome').onclick = () => setType('income');
$('prevMonth').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); };
$('nextMonth').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); };

$('txForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  if (!amount || amount <= 0) { alert('Enter amount'); return; }
  const date = $('date').value || new Date().toISOString().slice(0, 10);
  const all = load();
  all.push({ id: Date.now().toString(), type, amount, category: $('category').value, date, note: $('note').value.trim(), createdAt: Date.now().toString() });
  save(all);
  $('amount').value = '';
  $('note').value = '';
  // jump to entry's month so aunt sees it
  const [y, m] = date.split('-').map(Number);
  viewYear = y; viewMonth = m - 1;
  render();
});

$('exportBtn').onclick = () => {
  const blob = new Blob([localStorage.getItem(KEY) || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'expenses-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('wipeBtn').onclick = () => {
  if (!confirm('Delete ALL entries on this phone? Export first if needed.')) return;
  localStorage.removeItem(KEY);
  render();
};

// init
$('date').value = new Date().toISOString().slice(0, 10);
setType('expense');
render();
