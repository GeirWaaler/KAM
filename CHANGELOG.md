# What's new

### KAM 1.5.1 – the tab icon, and charts side by side · 2026-11-28

- **The KAM logo shows in the browser tab again.** It was built into the app the wrong way and the browser gave up on it.
- **Charts side by side are the same height**: on Members, *Total contributions per member* and *Monthly savings and targets*; on Home, the year and quarter charts.

**Try:**
- [ ] Look at the browser tab – the KAM logo is there (reload the tab if the browser remembers the old blank icon) <!-- show: .brand; tab: home -->
- [ ] On Members the two charts are the same height <!-- show: .grid2; tab: members -->
- [ ] On Home the year and quarter charts are the same height <!-- show: .grid2; tab: home -->

### KAM 1.5 – the Horizons top bar, and test mode · 2026-11-28

- **The top bar works as in Horizons**: the version and date sit under the logo; the data folder is on the right – its name, how many notes, when it was read – with ⟳ to read it again. Click the folder name to choose another. The demo shows there too, instead of the yellow band.
- **Test mode**: after an update a line at the top says how many new things the version has – **Test them** opens a small panel that guides you one step at a time. **Show me** points it out, **✓ Works** ticks it off, **✗ Doesn't** opens an AppDev comment with the step filled in.
- **Settings › Test mode**: switch the offer off, or test any version again – each shows how far you got (kept on this computer).
- **About › What's new** shows each version's steps with your ticks.
- AppDev says **Send to the developer**.

**Try:**
- [ ] Look under the logo – the version and date of this app <!-- show: #appVersion; tab: home -->
- [ ] On the right of the top bar: your data folder, its notes and when it was read – press ⟳ to read it again <!-- show: #refreshBtn; tab: home -->
- [ ] Settings › Test mode lists the versions and how far you got <!-- show: #testModeCard; tab: settings -->
- [ ] About › What's new shows each version's steps with your ticks <!-- show: #whatsNew; tab: about -->
- [ ] In AppDev the button says Send to the developer – only look, there's no need to send anything <!-- show: #devSend; tab: appdev -->

### KAM 1.4 – pills, help, Present, History and a way back to Excel · 2026-11-28

- **Members**: click a member's pill to see their statement on the same page; click several to compare them side by side. All members shows everyone.
- **Receipts**: the same pills – one member shows only their rows; All members shows every member folded to one line (click to open, or Expand all / Collapse all) with the group totals at the bottom.
- **Names first**: tables start with the name; the code follows as a small pill. An objective's projects show by name.
- **Short names** in the charts and the pills – set a member's short name under Members › Edit.
- **How amounts are shown** (Settings): plain numbers, UGX, USh or 1,300,000/=. Plain numbers is the default, with one line "All amounts in UGX".
- **Help**: the ? in the bottom right corner (or F1) explains the page you're on, with Show me, and searches every page's help.
- **▶ Present** on Home: the financial position as slides for the monthly meeting.
- **History**: every change saved – who, what and when.
- **Close the month** on Receipts: later changes in a closed month ask first and are flagged in History.
- **Receipts to members**: after a payment is recorded, send a receipt by email or WhatsApp.
- **Deleted notes are kept** in the archive and can be restored under Settings.
- **Backups**: Settings › Download backup; Follow up reminds you when the last one is over a month old.
- **Export to Excel** (Settings) and **Save as PDF** for the monthly update and a member's statement.
- **How KAM is built** is now also under About.
- **Data folder update**: when a new version needs something new in the data folder, a button adds it – nothing already there is changed.

**Try:**
- [ ] Click your own pill on Members – your statement opens on the same page <!-- show: #mpills; tab: members -->
- [ ] On Receipts, press Collapse all, then click one member's line to open it <!-- show: #rcToggle; tab: receipts -->
- [ ] Press the ? in the corner and search for "backup" <!-- show: #helpPill; tab: home -->
- [ ] Press ▶ Present on Home and move through the slides with the arrow keys <!-- show: #presentBtn; tab: home -->
- [ ] Choose how amounts are shown under Settings <!-- show: #amountMode; tab: settings -->
- [ ] Download a backup, then look at History – the change is listed <!-- show: #backupBtn; tab: settings -->
- [ ] Export to Excel and open the file <!-- show: #exportXlsx; tab: settings -->

### KAM 1.3 – a logo · 2026-11-28

- The welcome page no longer shows empty month and year boxes.
- **KAM has a logo** – coin stacks rising with an upward arrow, in the colours of the Ugandan flag (black, yellow, red). It shows in the browser tab, in the top left of the app and on the welcome page.

### KAM 1.2.1 – the menu scrolls with the page · 2026-11-28

- **The menu has no scrollbar of its own any more.** As in Horizons, it is a panel as tall as its items and stays in place while the page scrolls. In a short window it moves up with the page until its last item is in view, then stays there.

### KAM 1.2 – the menu on the left · 2026-11-28

- **The menu is on the left**, with an icon for every page, grouped: Money, Group, Reporting, Housekeeping – like Horizons.
- **Narrow menu** at the bottom of the menu shrinks it to icons only (hover an icon for its name); **Wide menu** brings the names back. Each computer remembers its choice.
- On a phone or a narrow window the menu is a row along the top.

### KAM 1.1 – AppDev, the tour and Follow up · 2026-11-27

- **Follow up** on Home: what needs attention – members behind on savings, membership fees not paid, missing email addresses, overdue loans and unrecorded loan interest, a missing fund statement, data problems, meetings without minutes, unsent AppDev comments, and the year-end in December. The count shows on the Home tab; each item has a **fix** link.
- **AppDev**: the data model and how KAM is built, and comments for the developer – saved in the data folder and sent with **Send to the developer**. Switch it off under Settings.
- **Getting started tour**: a guided tour of the pages on made-up data, in four chapters. Offered when KAM opens for the first time; start it again from About or Settings.
- **Import report** under Settings, when the data was imported from the workbook.
- The handover zip now holds every file in the data folder (also the archived workbook).

### KAM 1.0 – everything the workbook does · 2026-11-27

The first version of KAM: every number, calculation and graph of the group's workbook, now calculated from the payments recorded.

- **Home** – the group dashboard: members, savings, interest, fund value, next meeting; objectives; highlights; projects; actual vs target by year and by quarter; interest by month; every member against target with gap, consistency, momentum and risk flag.
- **Members** – contacts with local time, statements (STT), the committee, total contributions and savings vs targets per member; a page per member with their monthly statement, loans and payments.
- **Receipts** – the ledger by member and month (savings, membership, welfare, penalties, loan interest, repayment, interest earned, subtotal), the receipt summary, the fund, and cash at hand. **Monthly round** enters a whole month in one table.
- **Fund & interest** – the fund month by month and the interest split by start-of-month balance, with the workbook's figure beside the recalculated one.
- **Loans** – loans with repayments, interest on the declining balance, due date and status; borrowing and repayment by year (EXP LOAN); repayment plan; printable loan application.
- **Projects**, **Meetings**, **Expenses**, **Plans** – objectives, projects and the project tracker timeline; agenda and committee; funding and expenses with running balance; the plans.
- **Year-end** – dividend calculation and share-out list; cash count by banknote.
- **Updates** – the monthly update by email (copied with formatting, members in BCC) and WhatsApp.
- **Settings** – data folder, SACCO settings, checks, and the **handover zip** for next year's admin.
- **About** – the workbook analysis and what is waiting to be built.
- **Try the demo** – made-up data to look around in; nothing is saved.
