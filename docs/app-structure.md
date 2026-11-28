# How KAM is built

## The two parts

- **The app** is one file, `KAM.html`. It runs in Chrome or Edge on a computer, works offline and sends nothing anywhere. A new version is a new file – replace the old one; the data is not touched.
- **The data** is a folder of notes (`KAM-data`). Each note is a small text file (Markdown) with properties at the top – one note per member, payment, loan, fund month, project, meeting and so on (see *The data model*). The notes can also be read in any text editor or in Obsidian.

The app never keeps its own copy of the data: it reads the folder when it opens and writes a note each time something is saved. The handover zip at year-end holds the folder, the app and a summary.

## The pages

The menu on the left groups the pages – the main pages first, then Money, Group, Reporting and Housekeeping. *Narrow menu* at its bottom shrinks it to icons; on a phone it is a row along the top.

| Page | What it is for | Replaces in the workbook |
| --- | --- | --- |
| Home | The group dashboard: Follow up, key figures, objectives, highlights, projects, 3 graphs, members against target; ▶ Present for the monthly meeting | Group Dashboard |
| Members | Member pills: everyone, one member's statement, or several side by side; contacts and local time, statements, committee, 2 graphs; Save as PDF | Individuals Dashboard, STT |
| Receipts | Every payment by member and month (member pills, each member folds to one line), the receipt summary, the fund, cash at hand; Monthly round; Close the month | Receipts |
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
| History | Every change saved – who, what and when | – (new) |
| Settings | Data folder, how amounts are shown, backup, Export to Excel, handover zip, AppDev on/off, deleted notes, checks | – |

## How the figures are calculated

- **Nothing is typed into a total.** Every figure is added up from the payments (transaction notes), the fund statements (fund notes) and the loans.
- **Interest:** each month's fund interest is shared by each member's balance at the start of the month (savings paid in before the month, less withdrawals, plus interest already shared). Shares are whole shillings and add up exactly to the fund's interest. A check on every money page confirms it.
- **Loans:** interest each month on what is still owed (declining balance), at the rate and period in Settings. Repayments are payments linked to the loan.
- **Targets:** target to date = monthly target × months so far; consistency and the risk flag count the months with a savings payment.

## Help and safety

- **Help**: the ? in the bottom right corner (or F1) explains the page you are on and searches all the help.
- **History** logs every change. **Deleted notes** go to the archive and can be restored. **Closed months** ask before a change. **Backups** are one click under Settings, and Follow up reminds you.
- **Export to Excel** under Settings gives everything as a spreadsheet – the way back, if the group ever wants it.

## Changing the app

The app is looked after by its developer, working with Claude. Changes come as a new `KAM.html`. Write ideas, problems and questions under **AppDev › Comments** and send them with **Send to the developer** – they reach the developer by email.
