const KEY = 'expenseswallet.v1';
const CATS_KEY = 'expenseswallet.cats.v1';
const COLORS_KEY = 'expenseswallet.colors.v1';
const DEFAULT_EXPENSE = ['Еда','Транспорт','Дом','Здоровье','Одежда','Связь','Покупки','Развлечения','Образование','Кредит','Долги','Подарки','Лекарства','Другое'];
const DEFAULT_INCOME = ['Зарплата','Аванс','Подработка','Подарок','Возврат долга','Кредит получен','Другое'];
const DEFAULT_COLORS = { 'Еда':'#ef4444','Транспорт':'#f59e0b','Дом':'#8b5cf6','Здоровье':'#10b981','Одежда':'#ec4899','Связь':'#06b6d4','Покупки':'#f97316','Развлечения':'#a855f7','Образование':'#3b82f6','Кредит':'#dc2626','Долги':'#991b1b','Подарки':'#eab308','Лекарства':'#12ca8d','Другое':'#3c3d3d','Зарплата':'#16a34a','Аванс':'#22c55e','Подработка':'#059669','Подарок':'#65a30d','Возврат долга':'#0d9488','Кредит получен':'#0284c7' };

function loadCats() {
  try { return JSON.parse(localStorage.getItem(CATS_KEY)) || {}; }
  catch { return {}; }
}
function saveCats(c) { localStorage.setItem(CATS_KEY, JSON.stringify(c)); }
function loadColors() {
  try { return JSON.parse(localStorage.getItem(COLORS_KEY)) || {}; }
  catch { return {}; }
}
function saveColors(c) { localStorage.setItem(COLORS_KEY, JSON.stringify(c)); }
function getExpenseCats() {
  const c = loadCats().expense || [];
  return [...DEFAULT_EXPENSE, ...c.filter(x => !DEFAULT_EXPENSE.includes(x))];
}
function getIncomeCats() {
  const c = loadCats().income || [];
  return [...DEFAULT_INCOME, ...c.filter(x => !DEFAULT_INCOME.includes(x))];
}
function getColors() { return Object.assign({}, DEFAULT_COLORS, loadColors()); }

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
function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString('ru-RU'); }
function monthId(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }
function colorFor(c) { return getColors()[c] || '#64748b'; }

let catType = 'expense';

function setType(t) {
  type = t;
  $('typeExpense').classList.toggle('active', t === 'expense');
  $('typeIncome').classList.toggle('active', t === 'income');
  fillCats();
}
function fillCats() {
  const cats = type === 'expense' ? getExpenseCats() : getIncomeCats();
  const prev = $('category').value;
  $('category').innerHTML = cats.map(c => `<option>${escapeHtml(c)}</option>`).join('');
  if (cats.includes(prev)) $('category').value = prev;
}

function renderCatList() {
  const store = loadCats();
  const list = catType === 'expense' ? getExpenseCats() : getIncomeCats();
  const custom = new Set([...(store.expense || []), ...(store.income || [])]);
  $('catTypeExpense').classList.toggle('active', catType === 'expense');
  $('catTypeIncome').classList.toggle('active', catType === 'income');
  $('catList').innerHTML = '';
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    const isCustom = custom.has(c);
    row.innerHTML = `<span><span class="dot" style="background:${colorFor(c)}"></span>${escapeHtml(c)}${isCustom ? '' : ' <span class="muted">· станд.</span>'}</span>`;
    if (isCustom) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'del small-del'; b.textContent = '×'; b.setAttribute('aria-label', 'Удалить категорию');
      b.onclick = () => {
        if (!confirm(`Удалить категорию «${c}»? Записи останутся.`)) return;
        const s = loadCats();
        const k = catType === 'expense' ? 'expense' : 'income';
        s[k] = (s[k] || []).filter(x => x !== c);
        saveCats(s);
        const col = loadColors(); delete col[c]; saveColors(col);
        fillCats(); renderCatList(); render();
      };
      row.appendChild(b);
    }
    $('catList').appendChild(row);
  });
}

function switchTab(name) {
  ['home','history','report','settings'].forEach(n => {
    $('view-' + n).hidden = n !== name;
    $('tab-' + n).classList.toggle('active', n === name);
  });
  window.scrollTo({ top: 0 });
}
$('tab-home').onclick = () => switchTab('home');
$('tab-history').onclick = () => switchTab('history');
$('tab-report').onclick = () => switchTab('report');
$('tab-settings').onclick = () => switchTab('settings');

async function hardReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { try { await r.unregister(); } catch {} }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) { try { await caches.delete(k); } catch {} }
    }
  } catch {}
  const url = location.pathname + '?v=' + Date.now();
  location.replace(url);
}

function monthItems() {
  const all = load();
  const mid = monthId(viewYear, viewMonth);
  return all.filter(t => (t.date || '').startsWith(mid));
}

function render() {
  const items = monthItems().sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  const d = new Date(viewYear, viewMonth, 1);
  const title = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  $('currentMonth').textContent = title;
  $('historyMonth').textContent = title;
  $('reportMonth').textContent = title;
  $('monthLabel').textContent = '· ' + d.toLocaleString('ru-RU', { month: 'short' });

  let tin = 0, tout = 0;
  items.forEach(t => { if (t.type === 'income') tin += +t.amount; else tout += +t.amount; });
  $('totalIn').textContent = fmt(tin);
  $('totalOut').textContent = fmt(tout);
  $('balance').textContent = fmt(tin - tout) + ' ₸';
  $('historyCount').textContent = items.length ? `Записей: ${items.length}` : '';
  try {
    const raw = localStorage.getItem(KEY) || '[]';
    $('storageInfo').textContent = `Записей всего: ${load().length} · Размер: ${(raw.length / 1024).toFixed(1)} КБ на этом телефоне`;
  } catch {}

  // history
  listEl.innerHTML = '';
  emptyEl.style.display = items.length ? 'none' : 'block';
  items.forEach(t => {
    const li = document.createElement('li');
    const sign = t.type === 'income' ? '+' : '−';
    li.innerHTML = `<div><div><span class="dot" style="background:${colorFor(t.category)}"></span><strong>${escapeHtml(t.category)}</strong> ${t.note ? '· ' + escapeHtml(t.note) : ''}</div>
      <div class="meta">${escapeHtml(t.date)}</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="${t.type === 'income' ? 'amt-income' : 'amt-expense'}">${sign}${fmt(+t.amount)}</span>
        <button class="del" aria-label="Удалить">×</button>
      </div>`;
    li.querySelector('.del').onclick = () => {
      if (!confirm('Удалить эту запись?')) return;
      save(load().filter(x => x.id !== t.id));
      render();
    };
    listEl.appendChild(li);
  });

  renderReport(items, tin, tout);
}

function renderReport(items, tin, tout) {
  const exp = {}, inc = {};
  items.forEach(t => {
    const m = t.type === 'income' ? inc : exp;
    m[t.category] = (m[t.category] || 0) + (+t.amount);
  });
  $('reportTotal').textContent = items.length
    ? `Записей: ${items.length} · Расход: ${fmt(tout)} · Доход: ${fmt(tin)}`
    : 'В этом месяце пока нет записей.';

  const expSorted = Object.entries(exp).sort((a, b) => b[1] - a[1]);
  const incSorted = Object.entries(inc).sort((a, b) => b[1] - a[1]);

  const top = $('topCat');
  if (expSorted.length) {
    const [cat, sum] = expSorted[0];
    const pct = tout ? Math.round(sum / tout * 100) : 0;
    top.hidden = false;
    top.textContent = `Больше всего в этом месяце: ${cat} — ${fmt(sum)} (${pct}%)`;
  } else { top.hidden = true; }

  $('expenseStats').innerHTML = expSorted.length ? expSorted.map(([cat, sum]) => {
    const pct = tout ? Math.round(sum / tout * 100) : 0;
    return `<div class="stat"><div class="stat-top"><span><span class="dot" style="background:${colorFor(cat)}"></span>${escapeHtml(cat)}</span><strong>−${fmt(sum)}</strong></div><div class="bar expense"><div style="width:${pct}%"></div></div><div class="stat-pct">${pct}% от расходов</div></div>`;
  }).join('') : '<p class="muted">Расходов нет.</p>';

  $('incomeStats').innerHTML = incSorted.length ? incSorted.map(([cat, sum]) => {
    const pct = tin ? Math.round(sum / tin * 100) : 0;
    return `<div class="stat"><div class="stat-top"><span><span class="dot" style="background:${colorFor(cat)}"></span>${escapeHtml(cat)}</span><strong>+${fmt(sum)}</strong></div><div class="bar income"><div style="width:${pct}%"></div></div><div class="stat-pct">${pct}% от доходов</div></div>`;
  }).join('') : '<p class="muted">Доходов нет.</p>';
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
  if (!amount || amount <= 0) { alert('Введите сумму'); return; }
  const date = $('date').value || new Date().toISOString().slice(0, 10);
  const all = load();
  all.push({ id: Date.now().toString(), type, amount, category: $('category').value, date, note: $('note').value.trim(), createdAt: Date.now().toString() });
  save(all);
  $('amount').value = '';
  $('note').value = '';
  const [y, m] = date.split('-').map(Number);
  viewYear = y; viewMonth = m - 1;
  render();
  switchTab('history');
});

$('exportBtn').onclick = () => {
  const blob = new Blob([localStorage.getItem(KEY) || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'expenses-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('importBtn').onclick = () => $('importFile').click();
$('importFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data)) throw new Error('bad');
      const clean = data.filter(t => t && (t.type === 'expense' || t.type === 'income') && +t.amount > 0 && t.date).map(t => ({
        id: String(t.id || Date.now() + Math.random()),
        type: t.type,
        amount: +t.amount,
        category: String(t.category || 'Другое'),
        date: String(t.date).slice(0, 10),
        note: String(t.note || '').slice(0, 80),
        createdAt: String(t.createdAt || Date.now())
      }));
      if (!clean.length) { alert('В файле нет записей'); return; }
      const existing = load();
      const ids = new Set(existing.map(x => x.id));
      const merged = existing.concat(clean.filter(x => !ids.has(x.id)));
      save(merged);
      $('importFile').value = '';
      render();
      alert(`Готово: добавлено ${merged.length - existing.length} из ${clean.length}`);
    } catch {
      alert('Не получилось прочитать файл. Нужен JSON из кнопки Скачать.');
    }
  };
  r.readAsText(f);
});

$('wipeBtn').onclick = () => {
  if (!confirm('Удалить ВСЕ записи на этом телефоне? Сначала скачайте копию.')) return;
  localStorage.removeItem(KEY);
  render();
};

$('updateBtn').onclick = () => {
  if (!confirm('Обновить приложение до новой версии?')) return;
  hardReload();
};

$('catTypeExpense').onclick = () => { catType = 'expense'; renderCatList(); };
$('catTypeIncome').onclick = () => { catType = 'income'; renderCatList(); };
$('catAddBtn').onclick = () => {
  const name = $('catName').value.trim().slice(0, 24);
  const color = $('catColor').value || '#16a34a';
  if (!name) { alert('Введите название категории'); return; }
  if (getExpenseCats().includes(name) || getIncomeCats().includes(name)) { alert('Такая категория уже есть'); return; }
  const s = loadCats();
  const k = catType === 'expense' ? 'expense' : 'income';
  s[k] = [...(s[k] || []), name];
  saveCats(s);
  const col = loadColors(); col[name] = color; saveColors(col);
  $('catName').value = '';
  fillCats(); renderCatList(); render();
};
$('catResetBtn').onclick = () => {
  if (!confirm('Убрать все свои категории и вернуть стандартные?')) return;
  localStorage.removeItem(CATS_KEY);
  localStorage.removeItem(COLORS_KEY);
  fillCats(); renderCatList(); render();
};

$('date').value = new Date().toISOString().slice(0, 10);
setType('expense');
renderCatList();
render();
