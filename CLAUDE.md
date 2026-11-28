# Notes for Claude

**Start here:** read `docs/working-with-claude.md` – how Geir wants to work, the decisions so far, and the list of features agreed and waiting to be built. Update it at each milestone.

This repository holds **KAM** – an app for Kamuli Kwagalana SACCO, a savings and credit group of friends (13 members in several countries, amounts in UGX). The app replaces the group's Excel workbook. It is one HTML file run locally that reads and writes a separate data folder of Markdown notes with YAML properties.
Builder: Geir (not a member of the group). The group's contact: Arnold. Each year one member is the app's only admin; the role rotates every year.

## Rules

- **Ask one question at a time, with clickable options** (Geir, 2026-11-27).
- **Build now or keep collecting – ask every time.** When Geir and Claude agree on a feature, Claude asks **Build it now** or **Wait – collect it**. Waiting items go in *Waiting to be built* in `docs/working-with-claude.md`. Every build-or-wait question lists **all** the features on the waiting list. Never start building without a *Build it now*.
- **The group's real data never goes into this repository** – no member names, amounts, contacts or the workbook itself. The real data lives in the data folder and travels as a zip. Docs refer to members by code (K001…), never by name. Demo and test data must be made up.
- **Never run commands on the user's own computer.** Build and test only in the cloud workspace.
- Work on a branch and open a pull request unless Geir asks to commit straight to `main`.
- Code borrowed from Horizons (GeirWaaler/CRM-Horizons) is copied into this repo; nothing about KAM is ever written to the Horizons repo.
- The app never names the developer – it says *the developer*; the address lives in the data folder's settings (`dev_email`).
- App language: English. Users are not developers – explain changes in plain language.
- **Keep the tour current – every release** (Geir, 2026-11-28). Every change that adds or changes how something is used – a new page, button, menu item or way of working – updates in the same change the Getting started tour (`TOUR` in `extras.js`), and once built, the page help and About. Name pages exactly as the menu does. The test fails when a tour step points at something that no longer exists or names a page that isn't in the menu.

## Code

- `app/src/` – `store.js` (data folder, notes, zip), `calc.js` (all calculations, pure – tested in node), `charts.js` (SVG charts), `views.js` (pages), `extras.js` (AppDev, Follow up, the tour – `TOUR`; keep the steps pointing at real pages, the test checks it), `features.js` (History, closed months, data folder updates – `STRUCTURE`, Help – `HELP`, ▶ Present, What's new, receipts, backup, Excel, PDF), `main.js` (editor, events, start), `shell.html` (layout and CSS). `build.py` concatenates them into `dist/KAM.html` with the demo data, About texts and changelog.
- No external libraries – the app must work offline from one file.
- Every figure is calculated from transactions, fund notes and loans; never store a total.
- Every saved change goes through `createNote` / `saveNote` / `deleteNote` (store.js) – they log to History; delete moves the note to `archive/deleted/`.
- When the data folder needs something new, bump `STRUCTURE_VERSION` and add to `STRUCTURE` in `features.js` – never change existing notes; keep `tools/build_sample_data.py` at the latest version.
- Every release: a CHANGELOG entry `### KAM x.y – title · date` ending with a `**Try:**` list (`- [ ] what to do <!-- show: #selector; tab: page -->`) – test mode (the panel after an update, Settings › Test mode) and About › What's new use it; the test checks every step. **Try steps run on the admin's real data**: they only look or use real work, never leave test notes behind, and steps that need a real occasion say *skip until you have one*. Keep `HELP` current too: every menu page has help, and every Show me points at something (tested).
- Tests: `node tests/test_calc.mjs` and `python3 tests/test_app.py --shots`, both `ALL PASSED` before committing.
