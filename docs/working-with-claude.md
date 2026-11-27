# Working with Claude on KAM

## How Geir works

- One question at a time, with clickable options.
- Every agreed feature gets the question **Build it now** or **Wait – collect it**. Waiting features are listed below and built together when Geir chooses *Build it now*. Each build-or-wait question lists everything on the waiting list.
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

## Waiting to be built

**Version 1 – everything the workbook does** (agreed 2026-11-27, waiting)

1. Data folder connection, demo data (made up), and the real workbook imported into a separate data zip.
2. Receipts: all 6 payment kinds per member and month (savings, membership, welfare, penalties, loan interest, loan repayment), group totals, cash at hand, UAP fund deposits, interest and running total.
3. Interest earned per member – the workbook's figure and the recalculated figure side by side, with the difference.
4. STT member statement.
5. EXP LOAN: borrowing, repayment and outstanding per member and period.
6. Loan Application form, printable, with the 5% per month and 4-month rules.
7. Group Dashboard: KPIs, objectives OB001–OB005, projects and activities table, actual vs target by year and quarter, member table with monthly target, gap, consistency, momentum and risk flag.
8. Individuals Dashboard: member picker, contacts and time zones.
9. All 5 graphs: actual vs target by year; savings vs target by quarter; interest earned by month; total contributions per member; monthly savings and targets per member.
10. Expenses with funding sources and running balance.
11. Monthly Meeting agenda and committee.
12. Project Tracker with a timeline (Gantt).
13. Investment, Tech, Treasury, Database, Welfare and Secretary plans as notes.
14. The 2021 dividend calculation and share-out list, as a year-end dividend tool.
15. The cash count by banknote.
16. Email and WhatsApp update, and the handover zip.
17. About: shows the workbook analysis and this waiting list, copied in by the build from `docs/` (so the app and the docs never disagree).

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

## Status

- 2026-11-27: workbook analysed (`docs/workbook-analysis.md`); version 1 agreed and waiting. No app code yet.
