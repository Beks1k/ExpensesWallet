# ExpensesWallet — Кошелёк

!!!THIS WAS MADE ENTIRLY BY AI IF YOU DONT LIKE AI MADE PROJECTS PLEASE DONT HATE THIS ONE I WARNED YOU!!!

Family expense tracker that feels like a real app. No server, no sign-up, no App Store. Built for one beloved aunt with an iPhone — and for everyone else too.

**Live:** https://beks1k.github.io/ExpensesWallet/

Open the link in Safari → Share → Add to Home Screen. Works offline.

## Why this exists

- Aunt has an iPhone, we have no Mac and no $99 Apple Developer account
- PC cannot stay on 24/7, no port forwarding
- Answer: frontend-only PWA. Data lives on the phone, hosting is free forever

## Features

- **Главная** — balance for the month, income vs spending, quick add form (amount, category, date, note)
- **История** — month-by-month list, per-entry delete, clean minimal header
- **Отчёт** — spending and income broken down by category, sorted biggest-first, with bars, percents and a "biggest category" highlight
- **Ещё (Settings)** — backup and app controls:
  - Скачать копию / Загрузить копию (JSON merge, no duplicates)
  - Удалить все записи (with confirm)
  - Мои категории: add your own spending/income categories with a color picker, delete custom ones, reset to defaults
  - Обновить приложение: one-tap hard reload (unregisters service worker, clears cache, reloads fresh) — no keyboard needed
- 14 spending + 7 income categories out of the box, including Кредит, Долги, Лекарства, Зарплата, Аванс
- Installable PWA + offline support via service worker
- Fully in Russian, `ru-RU` numbers and month names
- Private by design: everything in `localStorage` (`expenseswallet.v1`, cats in `expenseswallet.cats.v1`, colors in `expenseswallet.colors.v1`)

## Tech

Zero dependencies. Just:

- `index.html` — 4-tab layout (Главная / История / Отчёт / Ещё)
- `app.js` — vanilla JS, no framework
- `styles.css` — mobile-first, bottom tab bar with safe-area
- `manifest.webmanifest` + `sw.js` + `icon.svg` — installable, offline

## Run it locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# → http://localhost:8000
```

## Deploy

This repo deploys via GitHub Pages from `main` / root. Push and it is live in ~1 minute:

```bash
git add .
git commit -m "update"
git push origin main
```

If phones show the old version: open the app → Ещё → Обновить приложение.

## Backup format

`expenses-backup.json` is an array of:

```json
[{"id":"...","type":"expense","amount":500,"category":"Еда","date":"2026-10-06","note":"","createdAt":"..."}]
```

Import merges by `id`, so re-importing the same file never duplicates.

## Roadmap ideas

- Kazakh / English toggle
- Monthly budget limit with progress ring
- Search in history
- CSV export for spreadsheets

Made with care for family.
