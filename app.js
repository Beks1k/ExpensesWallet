const KEY = 'expenseswallet.v1';
const CATS_KEY = 'expenseswallet.cats.v1';
const COLORS_KEY = 'expenseswallet.colors.v1';
const PREFS_KEY = 'expenseswallet.prefs.v1';
const IGNORE_KEY = 'expenseswallet.ignore.v1';
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
function loadPrefs() {
  try { return Object.assign({ theme: 'auto', budgetOn: false, budgetAmount: 0 }, JSON.parse(localStorage.getItem(PREFS_KEY)) || {}); }
  catch { return { theme: 'auto', budgetOn: false, budgetAmount: 0 }; }
}
function savePrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }
function loadIgnored() {
  try { const v = JSON.parse(localStorage.getItem(IGNORE_KEY)); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function saveIgnored(a) { localStorage.setItem(IGNORE_KEY, JSON.stringify(a)); }

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

function applyTheme() {
  const p = loadPrefs();
  const dark = p.theme === 'dark' || (p.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
if (window.matchMedia) {
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (loadPrefs().theme === 'auto') applyTheme(); }); } catch {}
}

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
        const ig = loadIgnored().filter(x => x !== c); saveIgnored(ig);
        fillCats(); renderCatList(); renderIgnoreList(); render();
      };
      row.appendChild(b);
    }
    $('catList').appendChild(row);
  });
}

function renderIgnoreList() {
  const ignored = new Set(loadIgnored());
  const all = [...getExpenseCats(), ...getIncomeCats()].filter((v, i, a) => a.indexOf(v) === i);
  $('ignoreList').innerHTML = '';
  all.forEach(c => {
    const lab = document.createElement('label');
    lab.className = 'check-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = ignored.has(c);
    cb.onchange = () => {
      const cur = new Set(loadIgnored());
      if (cb.checked) cur.add(c); else cur.delete(c);
      saveIgnored([...cur]);
      render();
    };
    lab.appendChild(cb);
    const sp = document.createElement('span');
    sp.innerHTML = `<span class="dot" style="background:${colorFor(c)}"></span>${escapeHtml(c)}`;
    lab.appendChild(sp);
    $('ignoreList').appendChild(lab);
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
  // go to clean URL (no ?v leftover), caches are empty so this load is fresh
  location.replace(location.pathname);
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

  renderBudget(items);
  renderPrefsUI();

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

function renderPrefsUI() {
  const p = loadPrefs();
  if ($('budgetOn').checked !== !!p.budgetOn) $('budgetOn').checked = !!p.budgetOn;
  if (document.activeElement !== $('budgetAmount') && String(p.budgetAmount || '') !== $('budgetAmount').value) {
    $('budgetAmount').value = p.budgetAmount || '';
  }
  if ($('themeSel').value !== p.theme) $('themeSel').value = p.theme;
}

function renderBudget(items) {
  const p = loadPrefs();
  const block = $('budgetBlock');
  if (!p.budgetOn || !(+p.budgetAmount > 0)) { block.hidden = true; return; }
  block.hidden = false;
  let spent = 0;
  items.forEach(t => { if (t.type === 'expense') spent += +t.amount; });
  const lim = +p.budgetAmount;
  const pct = Math.min(100, Math.round(spent / lim * 100));
  $('budgetText').textContent = `Потрачено ${fmt(spent)} из ${fmt(lim)}`;
  $('budgetPct').textContent = pct + '%';
  const fill = $('budgetFill');
  fill.style.width = pct + '%';
  fill.parentElement.classList.toggle('over', spent > lim);
  const w = $('budgetWarn');
  if (spent > lim) { w.hidden = false; w.textContent = `Превышен на ${fmt(spent - lim)}!`; }
  else if (spent >= lim * 0.8) { w.hidden = false; w.textContent = `Осталось ${fmt(lim - spent)} — близко к лимиту`; }
  else { w.hidden = true; }
}

function renderDonut(expSorted, total) {
  const svg = $('donutChart');
  const R = 54, C = 2 * Math.PI * R;
  const TOP = 6;
  const shown = expSorted.slice(0, TOP);
  const rest = expSorted.slice(TOP).reduce((s, [, v]) => s + v, 0);
  const parts = rest > 0 ? [...shown, ['Другое (остальное)', rest]] : shown;
  $('donutTotal').textContent = fmt(total);
  if (!parts.length || !total) {
    svg.innerHTML = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="18"/>`;
    return;
  }
  let off = 0;
  svg.innerHTML = parts.map(([cat, sum]) => {
    const frac = sum / total;
    const len = Math.max(0, frac * C - 2);
    const s = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${colorFor(cat === 'Другое (остальное)' ? 'Другое' : cat)}" stroke-width="18" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
    off += frac * C;
    return s;
  }).join('');
}

function renderReport(items, tin, tout) {
  const ignored = new Set(loadIgnored());
  const exp = {}, inc = {};
  items.forEach(t => {
    const m = t.type === 'income' ? inc : exp;
    m[t.category] = (m[t.category] || 0) + (+t.amount);
  });
  $('reportTotal').textContent = items.length
    ? `Записей: ${items.length} · Расход: ${fmt(tout)} · Доход: ${fmt(tin)}`
    : 'В этом месяце пока нет записей.';

  // ignore list affects ONLY the donut + "biggest" badge
  const expVis = Object.entries(exp).filter(([cat]) => !ignored.has(cat));
  const visOut = expVis.reduce((s, [, v]) => s + v, 0);
  let hiddenSum = 0, hiddenN = 0;
  items.forEach(t => { if (t.type === 'expense' && ignored.has(t.category)) { hiddenSum += +t.amount; hiddenN++; } });
  const note = $('ignoreNote');
  if (hiddenN) { note.hidden = false; note.textContent = `В диаграмме скрыто: ${hiddenN} зап. на ${fmt(hiddenSum)} (см. Ещё → Не учитывать)`; }
  else note.hidden = true;
  $('donutSub').textContent = hiddenN ? 'в диаграмме (без скрытых)' : 'расход за месяц';

  const expSorted = Object.entries(exp).sort((a, b) => b[1] - a[1]);
  const expVisSorted = expVis.sort((a, b) => b[1] - a[1]);
  const incSorted = Object.entries(inc).sort((a, b) => b[1] - a[1]);

  renderDonut(expVisSorted, visOut);

  const top = $('topCat');
  if (expVisSorted.length) {
    const [cat, sum] = expVisSorted[0];
    const pct = visOut ? Math.round(sum / visOut * 100) : 0;
    top.hidden = false;
    top.textContent = `Больше всего в этом месяце: ${cat} — ${fmt(sum)} (${pct}%)`;
  } else if (expSorted.length) {
    top.hidden = false;
    top.textContent = 'Все категории трат скрыты из диаграммы — уберите галочки в Ещё → Не учитывать';
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
});

function csvCell(v) {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

$('exportBtn').onclick = () => {
  const blob = new Blob([localStorage.getItem(KEY) || '[]'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'expenses-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('csvBtn').onclick = () => {
  const rows = load().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const head = 'date;type;category;amount;note';
  const lines = rows.map(t => [t.date, t.type === 'income' ? 'доход' : 'расход', t.category, t.amount, t.note].map(csvCell).join(';'));
  const blob = new Blob(['﻿' + head + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'expenses.csv';
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

$('budgetOn').onchange = () => {
  const p = loadPrefs(); p.budgetOn = $('budgetOn').checked; savePrefs(p); render();
};
$('budgetAmount').onchange = () => {
  const p = loadPrefs(); p.budgetAmount = parseFloat($('budgetAmount').value) || 0; savePrefs(p); render();
};
$('themeSel').onchange = () => {
  const p = loadPrefs(); p.theme = $('themeSel').value; savePrefs(p); applyTheme();
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
  fillCats(); renderCatList(); renderIgnoreList(); render();
};
$('catResetBtn').onclick = () => {
  if (!confirm('Убрать все свои категории и вернуть стандартные?')) return;
  localStorage.removeItem(CATS_KEY);
  localStorage.removeItem(COLORS_KEY);
  fillCats(); renderCatList(); renderIgnoreList(); render();
};

$('date').value = new Date().toISOString().slice(0, 10);
applyTheme();
setType('expense');
renderCatList();
renderIgnoreList();
render();
