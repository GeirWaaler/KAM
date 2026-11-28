# Working with Claude on KAM

## How Geir works

- One question at a time, with clickable options.
- Every agreed feature gets the question **Build it now** or **Wait – collect it**. Waiting features are listed below and built together when Geir chooses *Build it now*. Each build-or-wait question lists everything on the waiting list.
- The Getting started tour is updated with every new feature, in the same release (2026-11-28).
- Geir builds the app but is not a member of the group. Questions about the group's rules go to Arnold; until they answer, the app uses a default and makes it a setting.

## Background

- KAM = Kamuli Kwagalana SACCO. Today the group runs on an Excel workbook (analysis: `docs/workbook-analysis.md`).
- One admin per year, always a member; the role rotates every year. Ordinary members don't use the app – they receive updates by email and WhatsApp.
- The app must be both the input and the output: no spreadsheet behind it.

## Decisions

| Date | Decision |
| --- | --- |
| 2026-11-25 | Own repo (GeirWaaler/KAM), separate from Horizons. Data in a folder separate from the app, as Markdown notes with YAML properties, like Horizons. |
| 2026-11-25 | Email is the main channel (rich text copied into the admin's own mail program, members in BCC), plus a short WhatsApp message for the group chat. |
| 2026-11-27 | Real data goes in a separate zip, never in the repo. |
| 2026-11-27 | Reuse code from Horizons (repo attached read-only); nothing is written back to Horizons. |
| 2026-11-27 | App language: English. |
| 2026-11-27 | The app travels as one HTML file inside the handover zip, next to the data folder. |
| 2026-11-27 | Interest split, until the group decides: each month's fund interest shared by each member's balance at the start of the month, earlier interest included. The workbook's own figure is shown alongside. |
| 2026-11-27 | Code goes in through a branch and pull request. |
| 2026-11-27 | The first build must contain every functionality in the workbook – all numbers, calculations and graphs – before anything new. |
| 2026-11-27 | The real workbook is imported only once the data model is settled: the data model is written up first (`docs/data-model.md`) and Geir approves it before any import. |
| 2026-11-27 | Data model approved after a part-by-part walk-through. Payments: one currency, no method; welfare payouts are expenses. |
| 2026-11-27 | Geir's email address is not written in the repo; it lives in the data folder's settings (`dev_email`). |

## Waiting to be built

- **How amounts are shown** (agreed 2026-11-28, waiting) – a setting with four choices: numbers only (1,300,000), UGX 1,300,000, USh 1,300,000, or 1,300,000/=. Applies everywhere: pages, statements, printouts, the email and WhatsApp updates, the handover summary. With numbers only, one line "All amounts in UGX" under the page heading and at the end of the email. Stored in the data folder's settings; default numbers only. (The shilling has no symbol of its own – USh is the abbreviation, and prices are written like 5,000/=.)
- **Short names on chart axes** (agreed 2026-11-28, waiting) – charts that list members show a short name instead of the code: a `short_name` property on each member, filled with the first word of the name and correctable under Members › Edit (some names are written surname first); the surname's first letter is added when two short names match; hovering shows the full name and code. Applies to every chart that lists members.
- **Member pills on Members** (agreed 2026-11-28, waiting) – as the filter pills in Horizons: *All members (n)* plus one pill per member (prospective/left last, dimmed). None or All = the overview; one pill = that member's view on the same page (key figures, savings by month, statement, loans, payments); more pills = a side-by-side comparison with charts and tables limited to the selected members. Clicking a filled pill removes it. Member links elsewhere open Members with that pill selected. The drop-down and the separate member page go away; tour and tests updated.
- **Member pills and collapsible blocks on Receipts** (agreed 2026-11-28, waiting) – the same pills as Members, selection shared between the two pages. One or more members: only their blocks, open, no group totals (several: plus a *Selected members – total* row). All members: every member block collapsible to one line (name, savings this year, total collections, fund balance at year end), receipt summary, fund rows and cash at hand at the bottom; *Expand all / Collapse all*; starts collapsed, remembered per computer. Printing follows the screen; Monthly round unchanged.
- **Name first, code as a pill** (agreed 2026-11-28, waiting) – as projects in Horizons: tables start with the name, and the code follows as a small grey pill with a tooltip saying what it is (member, objective, project, loan code). Loans: one column with the member and the loan code as a pill. Lists stay sorted by code. Cells that refer to other things (e.g. an objective's projects) show names with code pills, one per line, clickable. On phones the pill wraps under the name.
- **Help** (agreed 2026-11-28, waiting) – as in Horizons: a round ? floating at the bottom right (and F1; Esc closes) opens a help card for the current page – what the page is for, common questions as foldable items with *Show me* (highlights the place, opening the page if needed); a search box searches every page's help; links to the tour, What's new and *Ask the developer* (AppDev, when on). A test fails if a menu page has no help or a Show me points at nothing. Doesn't overlap the tour panel.
- **Export to Excel and Save as PDF** (agreed 2026-11-28, waiting) – *Settings › Export to Excel*: one .xlsx made inside the app (offline, no library) with sheets Members, Payments (every payment), Receipts by month (the old layout with totals), Fund, Interest shares, Loans, Statements, Projects, Objectives, Meetings – values, not formulas; the emergency way back to a spreadsheet. *Save as PDF* for the monthly update (Updates) and a member's statement: a clean A4 print view, saved as PDF from the print window and attached to the email by hand (an email link can't attach files).
- **How KAM is built in About** (agreed 2026-11-28, waiting) – About gets the section *How KAM is built* from `docs/app-structure.md`, the same text as AppDev, so it is there when AppDev is switched off. The data model stays in AppDev only.

**Ideas discussed, not yet agreed** (2026-11-27)

- Several interest-sharing rules as a setting, with a side-by-side comparison.
- Dividend and fund forecasts in three scenarios (on target / current pace / no new payments) – check the fund's real return first.
- Loan eligibility rule, guarantor cover, arrears list, automatic penalties, payment reminders.
- Personal statements by email; payments in other currencies with exchange rate and reference.
- Rotating pool schedule, if the Investment Plan's two pools go ahead.
- Meeting attendance and decisions; document library; read-only member view.

## Questions for the group (Arnold)

Defaults are used until answered.

| Question | Default |
| --- | --- |
| Are the workbook figures real or test data ("Test1" in the file name)? | Imported as they stand; the app is labelled "draft data" |
| How is fund interest shared? | Start-of-month balance, earlier interest included |
| Is the 5% loan interest charged, and where does it go? | Calculated on the declining balance and shown as due; counts once recorded as paid |
| Do welfare and membership fees stay outside the investment fund? | Yes |
| What happens at year-end – is interest paid out or kept? | Carried forward |
| Will the two-pool Investment Plan go ahead? | Not in version 1 |
| Are K014 and K015 (contact list only) members? | Imported as "prospective" |
| Which email address does each member use? | Empty fields to fill in |
| Does row "UAP Interest" hold only interest? It implies about 4% per month in 2026. | Used as entered |
| The 2026 savings target on the dashboard and in objective OB002 differ by a factor of ten – which is right? | The dashboard figure |
| The secretary in the committee list doesn't match a member name – who is it? | Role left off; listed in the import report |
| The 2024 and 2025 actuals on the dashboard are typed; the app calculates them from the payments | Calculated figures shown |

## Built

- **KAM 1.0** (2026-11-27): everything the workbook does – Home (group dashboard, 3 graphs, member table), Members (contacts, STT statements, committee, 2 graphs, member pages), Receipts (ledger, receipt summary, fund rows, cash at hand, monthly round), Fund & interest (interest split, workbook vs recalculated), Loans (EXP LOAN, plan, printable application), Projects (objectives, projects, tracker timeline), Meetings, Expenses, Plans, Year-end (dividend and share-out, cash count), Updates (email and WhatsApp), Settings (data folder, checks, handover zip), About (analysis, waiting list, what's new), demo data.

- **KAM 1.1** (2026-11-27): AppDev (data model, app structure, comments, Send to Geir, switch in Settings), the Getting started tour (4 chapters on demo data), Follow up on Home, the import report; the real workbook imported into `KAM-data.zip` (sent in the chat, never committed).
- **KAM 1.2** (2026-11-28): the menu on the left with an icon per page, grouped (Money, Group, Reporting, Housekeeping), Narrow/Wide menu remembered per computer, a row on top on phones.
- **KAM 1.3** (2026-11-28): the logo and favicon – rising coin stacks with an upward arrow in the Ugandan flag colours (`app/src/logo.svg`).

## Status

- 2026-11-27: workbook analysed (`docs/workbook-analysis.md`).
- 2026-11-27: KAM 1.0 built and tested on made-up demo data. Data model approved (`docs/data-model.md`).
- 2026-11-27: KAM 1.1 built; the workbook imported – every member's savings and membership, the fund's deposits and the loan outstanding match the workbook. The import report lists the points for the group to confirm.

## Importing the workbook again

`python3 tools/import_workbook.py <workbook.xlsx> <out>/KAM-data --dev-email <address>` then `node tools/report_import.mjs <out>/KAM-data`. Only in the cloud workspace; the output is never committed.

## How to build and test

- `python3 build.py` → `dist/KAM.html` (never edit `dist/` by hand).
- `node tests/test_calc.mjs` and `python3 tests/test_app.py --shots` – both must print `ALL PASSED`; look at the screenshots after visual changes.
- Version: `VERSION`/`VERSION_DATE` in `build.py`, plus an entry in `CHANGELOG.md`.
