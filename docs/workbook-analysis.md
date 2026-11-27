# Workbook analysis

Analysis of the group's Excel workbook (version "Aug 2026 … Test1"), done 2026-11-27. The full write-up with figures is in a private doc shared with Geir; this copy has **no names or amounts** – members are referred to by code (K001…), as in the workbook's dashboard.

## Summary

The workbook runs the whole SACCO: 13 active members (2 more in the contact list only) in several countries, savings in UGX, member loans, welfare, a pooled investment fund (UAP) and group projects. It has 19 sheets: 6 hold data, 3 are dashboards or forms, 6 are plans (2 with text, 4 empty), and 4 hidden sheets are left over from 2019–2021.

- **The interest calculation credits members more than the fund earned:** about 3.7 times the fund's interest in 2025 and 1.9 times in January–September 2026. The cause is formulas copied with fixed cell references.
- **The layout is a grid** – one block of 8 rows per member × one column per month. Every new member, month or year means copying rows and columns, which is where most errors come from.
- **The admin changes every year**, and the workbook only works for someone who knows its layout.

Recommendation: rebuild KAM around a ledger of dated transactions, with every balance, interest share, statement and graph calculated from it.

## Sheet by sheet

| Sheet | What it does | How it works | In the app |
| --- | --- | --- | --- |
| Loan Application | Printable loan form: applicant, guarantor, amount, purpose, declaration | No formulas. Rules in text: repayment within 4 months, 5% per month on a declining balance; on default a fee, then the member's savings, then salary, then removal | Loan request form with the repayment plan, printable |
| EXP LOAN | Loans per member: borrowing, repayment, outstanding, per period (Dec 2024, 2025, 2026) | Pulls repayments from Receipts. Rows for Dividends, Saving out, Social Fund are unused; rows 54–77 show #REF! | Loans: one note per loan, balance calculated from repayments |
| Receipts | The core ledger: per member 8 rows (savings, membership fee, welfare, penalties, loan interest received, loan repayment, interest earned, subtotal) × one column per month, 2025–2026 | Monthly figures typed in. Interest earned = (previous subtotal + this month's savings) ÷ fund running total × fund interest that month. Rows 107–111 hold UAP deposits and interest; rows 114–129 group totals and cash at hand | Transactions, one note per payment; interest shares calculated |
| STT | Member statement: accumulated savings, membership, loan interest, repayment, loan outstanding | Links into Receipts and EXP LOAN, plus some typed numbers | Member statement, also used in updates |
| Dividend Cal for EOY 2021 (hidden) | Year-end dividend split pro rata to savings | Member savings ÷ total × dividend pool | Year-end dividend tool |
| Requests & Share - Dec2021 (hidden) | Share-out list: savings, withdrawal, borrowing, dividends, signature; committee allowance | Mostly an empty template | Year-end payout list |
| Dividends Calc (hidden) | 2021 dividends against dividends already taken | An earlier member list | Archive |
| Sheet3 (hidden) | Cash count by banknote (2019) | Notes × denomination | Cash count tool |
| Group Dashboard | KPIs, objectives OB001–OB005, projects and activities, actual vs target by year and quarter, monthly interest, member table (target, gap, consistency, momentum, risk flag); 3 bar charts | Reporting month from a dropdown, nested IF formulas per month, conditional formatting | Group dashboard |
| Individuals Dashboard | The group dashboard with a member picker, plus a contact table (country, city, time zone; email empty); 2 charts | Same formulas | Member page and member list |
| Expenses | Funding sources with running balance; expenses per activity | Two small tables, almost empty | Expenses linked to projects |
| Monthly Meeting | Standing agenda (7 items with the responsible role) and the committee (chair, secretary, treasurer, database, investment, technology, welfare) | Static | Meetings with an agenda template; roles on member notes |
| Project Tracker | Gantt chart: task, owner, progress, start, end | Excel's sample template, sample names still in it | Projects with a timeline |
| Investment Plan | Proposal: a rotating pool (50K per month, one member receives the pot each cycle) and a long-term pool (130K per month); access requires consistent payment; returns proportional to contribution; one payment upfront as security | Text | Plan note; decides the data model if adopted |
| Tech Plan | Automated payment and meeting reminders, contribution tracking, Fireflies.ai for minutes, Google Drive for documents | Text | Plan note; partly delivered by the app |
| Sacco Secretary, Treasury Plan, Database Plan, Welfare Plan | Placeholders | Empty | Plan notes |

## The five graphs

| Graph | Data | Issue |
| --- | --- | --- |
| Actual vs target by year | 2024–2026 savings and targets | 2024 and 2025 actuals are typed |
| Savings vs target by quarter | 2026 quarters | Q1 and Q2 typed; Q3 and Q4 show the full-year total |
| Interest earned by month | Fund interest per month, 2026 | August and September swapped |
| Total contributions per member | Registration, 2026 savings, total savings | Inherits the errors below |
| Monthly savings and targets per member | 2026 savings, current-month target, annual target | Inherits the errors below |

## Errors and risks

**Interest distribution**

1. For 8 of 13 members, March–December 2025 use February's fund total and interest (`$H$111`, `$H$109`) every month – about 12.7% per month on their whole balance.
2. For every member, August 2026 uses September's fund interest and September uses August's.
3. K003's March–December 2025 interest uses the previous month's fund figures.
4. K005's March–September 2025 interest is typed as 0.
5. For several members the "Total" column sums the running subtotal row instead of taking its last value, so the members' subtotals add up to almost five times the fund.

**Totals and links**

1. The 2025 group totals (savings, membership, loan repayment) include only the first 8 members.
2. February 2025 loan repayment points to K001's March cell (`I8` instead of `H8`); K001's 2025 repayment total is typed and doesn't match the monthly cells.
3. K002's "2026 savings" includes the balance brought forward from 2025.
4. The 2026 membership total takes February instead of January for 7 members.
5. #REF! errors in EXP LOAN rows 54–77, in monthly columns of both dashboards, one dropdown and one conditional format.
6. Typed numbers where formulas are expected (interest last month, highest daily interest, some membership and loan figures in STT).
7. The column headed June 2026 is dated 6 January 2026.

**Structural**

- No record of single payments – a monthly cell holds one sum, no date or reference.
- Loan interest received is 0 for everyone although a loan has run since December 2024.
- Adding a member means copying an 8-row block; a new year means copying 14 columns.
- No check that the members' shares add up to the fund.
- The fund interest implies about 4% per month in 2026, far above what a money-market or unit-trust fund normally pays – check against a UAP statement.
