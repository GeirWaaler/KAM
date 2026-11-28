# How KAM is built

## The two parts

- **The app** is one file, `KAM.html`. It runs in Chrome or Edge on a computer, works offline and sends nothing anywhere. A new version is a new file – replace the old one; the data is not touched.
- **The data** is a folder of notes (`KAM-data`). Each note is a small text file (Markdown) with properties at the top – one note per member, payment, loan, fund month, project, meeting and so on (see *The data model*). The notes can also be read in any text editor or in Obsidian.

The app never keeps its own copy of the data: it reads the folder when it opens and writes a note each time something is saved. The handover zip at year-end holds the folder, the app and a summary.

## The pages

The menu on the left groups the pages – the main pages first, then Money, Group, Reporting and Housekeeping. *Narrow menu* at its bottom shrinks it to icons; on a phone it is a row along the top.

| Page | What it is for | Replaces in the workbook |
| --- | --- | --- |
| Home | The group dashboard: key figures, objectives, highlights, projects, 3 graphs, members against target | Group Dashboard |
| Members | Member list, contacts and local time, statements, committee, 2 graphs; a page per member | Individuals Dashboard, STT |
| Receipts | Every payment by member and month, the receipt summary, the fund, cash at hand; Monthly round | Receipts |
| Fund & interest | The fund month by month and how its interest is shared; the workbook's figure beside the recalculated one | Receipts rows 107–111, Interest Earned rows |
| Loans | Loans, repayments, interest due, repayment plan, printable application | EXP LOAN, Loan Application |
| Projects | Objectives, projects and activities, the project tracker timeline | Group Dashboard tables, Project Tracker |
| Meetings | Standing agenda, committee, meeting notes | Monthly Meeting |
| Expenses | Funding sources and expenses with running balance | Expenses |
| Plans | The SACCO's plans | Investment, Tech and other plan sheets |
| Year-end | Dividend and share-out list, cash count | The 2021 dividend sheets, Sheet3 |
| Updates | The monthly update by email and WhatsApp | – (new) |
| AppDev | This explanation, the data model, and comments for the developer | – (new) |
| About | The workbook analysis, what is waiting to be built, what's new | – |
| Settings | Data folder, SACCO settings, checks, handover zip, AppDev on/off | – |

## How the figures are calculated

- **Nothing is typed into a total.** Every figure is added up from the payments (transaction notes), the fund statements (fund notes) and the loans.
- **Interest:** each month's fund interest is shared by each member's balance at the start of the month (savings paid in before the month, less withdrawals, plus interest already shared). Shares are whole shillings and add up exactly to the fund's interest. A check on every money page confirms it.
- **Loans:** interest each month on what is still owed (declining balance), at the rate and period in Settings. Repayments are payments linked to the loan.
- **Targets:** target to date = monthly target × months so far; consistency and the risk flag count the months with a savings payment.

## Changing the app

The app is developed by Geir with Claude. Changes come as a new `KAM.html`. Write ideas, problems and questions under **AppDev › Comments** and send them with **Send to Geir** – they reach the developer by email.
