# Data model – for approval

**Status: proposal, waiting for Geir's approval.** The real workbook is imported only after this is approved. The demo data (`tools/build_sample_data.py`) already follows it.

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
| settings | sacco_name, currency, fund_name, interest_rule, loan_rate, loan_max_months, default_fee, registration_fee, target_YYYY (one per year), vision, highlights (list), agenda (list "item \| responsible"), banknotes (list), admin, admin_year | One per folder |
| member | code, title (name), status (active / paused / left / prospective), joined, role, country, city, timezone (e.g. Africa/Kampala), email, phone, monthly_target, annual_target, workbook_interest_YYYY | workbook_interest_YYYY keeps the interest the workbook showed, for comparison |
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

## Open points that could change the model

- **Two pools (Investment Plan):** if adopted, transactions get a `pool` property (rotating / long-term) and the rotation order gets its own note.
- **Payments in other currencies:** if wanted, transactions get `paid_amount`, `paid_currency` and `rate`.
- **Interest rule:** does not change the model. Version 1 calculates one rule (start-of-month balance); other rules would be added to the app, not to the data.
