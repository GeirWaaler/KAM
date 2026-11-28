# Data model – for approval

**Status: approved, 2026-11-27** (walked through part by part). The demo data (`tools/build_sample_data.py`) follows it.

Decisions in the walk-through: no payment method or receiver on payments; amounts in the SACCO's currency only (no foreign-currency fields); money paid out to members from welfare is recorded as an expense on a project; the Project Tracker's sample tasks and the old hidden sheets are not imported.

The data folder holds Markdown notes with YAML properties. The app finds notes by `type`, never by folder, so notes can be moved. Amounts are whole shillings; dates `YYYY-MM-DD`; months `YYYY-MM`. Links to other notes are Obsidian links (`[[K004 Name]]`). Properties the app doesn't know are kept when it saves.

## Folders

```
KAM-data/
  kam-settings.md
  members/        K002 <name>.md
  transactions/   2026/2026-03-01 K002 savings.md
  loans/          L2024-01 K001.md
  fund/           2026/2026-03 Fund statement.md
  objectives/  projects/  projects/tasks/
  meetings/2026/  plans/  expenses/  years/  cash counts/  updates/2026/
```

## Note types

| type | Properties | Notes |
| --- | --- | --- |
| settings | sacco_name, currency, amount_display (numbers / code / USh / slash; 1.4), structure_version, last_backup, appdev, dev_email, fund_name, interest_rule, loan_rate, loan_max_months, default_fee, registration_fee, target_YYYY (one per year), vision, highlights (list), agenda (list "item \| responsible"), banknotes (list), admin, admin_year | One per folder |
| member | code, title (name), short_name (charts and pills; 1.4), status (active / paused / left / prospective), joined, role, country, city, timezone (e.g. Africa/Kampala), email, phone, monthly_target, annual_target, workbook_interest_YYYY | workbook_interest_YYYY keeps the interest the workbook showed, for comparison |
| transaction | date, member (link), kind, amount, loan (link), project (link), reference, source | kind: savings, withdrawal, membership, welfare, penalty, loan_interest, loan_repayment, investment_return, other_income, expense. One note per payment |
| loan | code, member, guarantor, applied, approved, paid_out, amount, rate (0.05), months (4), purpose, status | Repayments and interest are transactions linked to the loan |
| fund | month, deposits, withdrawals, interest, source, opening (true for the balance brought forward) | One per month, from the fund statement |
| objective | code (OB001…), title, measure | |
| project | code (P…/A…), title, objective (link), committee, cost, progress (0–100), start, end, comment | |
| task | title, project, phase, owner, progress, start, end, order | The project tracker |
| meeting | date, title, attendees (list) | Body: agenda, minutes, decisions |
| plan | title | Body: the plan |
| funding | title, approved, amount | Expenses are transactions of kind expense |
| year | year, pool, decided, basis, dividends (list) | The year-end record |
| cashcount | date, n50000, n20000, … (number of notes) | |
| update | date, title, month, recipients (list) | Body: the text sent |
| history | month, title | One per month in `history/<year>/`; the body holds one line per change: when · who · what happened · the note's path. Written by the app after every save (1.4) |
| close | month, closed, by | One per closed month in `closed months/` (1.4) |
| devnote | date, title, kind, page, status (new/sent/done), sent | AppDev comments; the body is the comment |
| report | title | The import report, made by the import |

## From the workbook

| Workbook | Becomes |
| --- | --- |
| Receipts, one member block (rows Savings … Loan Repayment) × month columns | One transaction per non-zero cell, dated the 1st of the column's month, `source: workbook`. Negative savings → kind withdrawal |
| Receipts columns D–F (amounts at 31/12/23, withdrawn 31/12/24, balance B/F 2025) | One savings transaction dated 2024-12-31 with the brought-forward balance, reference "Balance brought forward" |
| Receipts "Interest Earned" rows | Not imported as payments (the app recalculates). Each member's yearly total goes into workbook_interest_YYYY for comparison |
| Receipts rows 108–109 (UAP deposits and interest) | One fund note per month; column F = opening fund note (2024-12, opening: true) |
| Receipts rows 114–129 (totals, cash at hand) | Not imported – calculated |
| EXP LOAN | One loan note per borrowing (amount, paid_out). If the workbook's total repayment differs from the monthly cells, one correcting repayment is added with a reference that says so, and it is listed for the treasurer to check |
| STT | Not imported – calculated |
| Group / Individuals Dashboard: member table (G, I columns) | monthly_target, annual_target on the member note |
| Individuals Dashboard: contact table | country, city, timezone on the member note (timezone converted to a zone name, e.g. EAT → Africa/Kampala) |
| Group Dashboard: objectives, projects table, targets by year, highlights, vision | objective and project notes; target_YYYY, highlights, vision in settings |
| Monthly Meeting: agenda, committee | agenda in settings; role on the member note (names matched to members; unmatched names listed for checking) |
| Project Tracker | task notes (the template's sample names are not imported) |
| Expenses | funding notes and expense transactions |
| Investment / Tech / other plans | plan notes (text as written) |
| Hidden 2021 sheets | Not imported; the workbook stays in the archive as it is |

## Deleted notes (1.4)

Deleting a note moves it to `archive/deleted/<its old path>` with the properties `deleted` (when) and `deleted_from` (where it was). The app ignores notes there except to list them under Settings › Deleted notes, where *Restore* puts them back.

## Data folder updates (1.4)

`structure_version` in the settings says which version of the folder layout the data folder has. When a new KAM needs something new (a setting, a folder), it offers *Update the data folder*: it adds only what is missing and never changes existing notes.

## The import

- Runs in the cloud workspace only, reading the workbook; the result is `KAM-data.zip`, sent in the chat – never committed to GitHub.
- `Import report.md` in the data folder: notes made per kind; totals checked against the workbook (savings per member and in total, membership, loans outstanding, fund deposits and interest per year) – each matches or shows the difference and why; points for the admin to confirm.
- The original workbook goes into `archive/` inside the zip, unchanged.
- Meetings: the workbook holds only the standing agenda, the committee and the next meeting date – no minutes.

## Open points that could change the model

- **Two pools (Investment Plan):** if adopted, transactions get a `pool` property (rotating / long-term) and the rotation order gets its own note.
- **Payments in other currencies:** if wanted, transactions get `paid_amount`, `paid_currency` and `rate`.
- **Interest rule:** does not change the model. Version 1 calculates one rule (start-of-month balance); other rules would be added to the app, not to the data.
