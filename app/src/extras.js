/* KAM – AppDev, the health check (Follow up) and the onboarding tour. Declarations only; main.js runs the start code. */

/* ---------------------------------------------------------------- settings switches */
const appdevOn = () => !db || String(db.settings.appdev ?? "on").toLowerCase() !== "off";
const devEmail = () => (db && db.settings.dev_email) || "";
const devnotes = () => notesOf("devnote").map(n => ({ ...n.props, note: n })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
const DEV_KINDS = ["Idea", "Problem", "Question", "Other"], DEV_STATUS = ["new", "sent", "done"];

/* ---------------------------------------------------------------- Follow up: what needs attention (calculated every time) */
function followUps() {
  const out = [], add = (group, text, act, level = "warn") => out.push({ group, text, act, level });
  const y = view.year, mIdx = view.month, rep = repMonthKey(), now = new Date(), thisMonth = monthKey(now.getFullYear(), now.getMonth() + 1);
  for (const m of activeMembers(db)) {
    const r = memberRow(db, m, y, mIdx);
    if (r.risk === "At Risk" && r.gap > 0) add("Members", `${m.name} is behind on savings: ${r.insight} (${r.paidMonths} of ${mIdx} months paid).`, `member:${m.code}`);
    if (!kindSum(db, m.code, "membership", y)) add("Members", `${m.name} has not paid the membership fee for ${y}.`, `member:${m.code}`);
  }
  const noMail = activeMembers(db).filter(m => !m.email);
  if (noMail.length > 3) add("Members", `${noMail.length} members have no email address – they won't get the updates: ${noMail.map(m => m.name).join(", ")}.`, "go:members", "info");
  else for (const m of noMail) add("Members", `${m.name} has no email address – they won't get the updates.`, `edit:${m.note.path}`, "info");
  for (const m of db.members.filter(m => /prospective/i.test(m.status || ""))) add("Members", `${m.name} is listed as prospective – confirm whether they are a member.`, `edit:${m.note.path}`, "info");
  for (const l of db.loans) {
    const s = loanState(db, l, rep);
    if (s.status === "requested" || l.status === "requested") add("Loans", `Loan request ${l.code} from ${mName(l.member)} is waiting for a decision.`, `loan:${l.code}`);
    if (s.overdue) add("Loans", `Loan ${l.code} (${mName(l.member)}) is overdue: ${money(s.outstanding)} outstanding, due ${s.dueMonth}.`, `loan:${l.code}`, "bad");
    if (s.interestDue > 0) add("Loans", `Loan ${l.code} (${mName(l.member)}): ${money(s.interestDue)} interest charged but not recorded as paid.`, `loan:${l.code}`);
  }
  const lastFull = addMonths(thisMonth, -1), lastFund = db.fund.filter(f => !f.opening).at(-1);
  if (db.fund.length && (!lastFund || lastFund.month < lastFull)) add("Fund", `The fund statement for ${lastFull} is not entered yet${lastFund ? ` (the last is ${lastFund.month})` : ""}.`, "new:fund");
  for (const c of checks(db, alloc)) if (c.level !== "info") add("Data", c.text, "go:interest", c.level === "err" ? "bad" : "warn");
  for (const e of store.errors) add("Data", `The note ${e.path} could not be read: ${e.why}`, "go:settings", "bad");
  for (const m of db.meetings) if (String(m.date) < todayISO() && !String(m.note.body || "").trim()) add("Admin", `The meeting on ${m.date} has no minutes.`, `edit:${m.note.path}`, "info");
  if (appdevOn()) { const n = devnotes().filter(d => (d.status || "new") === "new").length; if (n) add("Admin", `${n} AppDev comment${n > 1 ? "s are" : " is"} not yet sent to the developer.`, "go:appdev", "info"); }
  const lastM = addMonths(thisMonth, -1);
  if (now.getDate() >= 10 && db.tx.some(t => t.month === lastM) && !closedMonths().has(lastM)) add("Admin", `${MONTHS_LONG[Number(lastM.slice(5)) - 1]} isn't closed yet – check its payments and fund statement, then close it on Receipts.`, "go:receipts", "info");
  if (!store.demo && backupAge() > 31) add("Admin", db.settings.last_backup ? `The last backup is ${backupAge()} days old – download a new one under Settings.` : "No backup has been made yet – download one under Settings.", "go:settings", "warn");
  if (now.getMonth() === 11) add("Admin", `It's December: do the year-end (Year-end) and download the handover zip (Settings) for the next admin.`, "go:yearend", "info");
  return out;
}
function followUpSection() {
  const f = followUps();
  if (!f.length) return `<div id="followup" class="card"><b>Follow up</b> – nothing to follow up. ✓</div>`;
  const groups = [...new Set(f.map(x => x.group))];
  return `<div id="followup" class="card"><h2 style="margin-top:0">Follow up (${f.length})</h2>${groups.map(g => `<h3>${g}</h3><ul>${f.filter(x => x.group === g).map(x =>
    `<li class="${x.level === "bad" ? "bad" : ""}">${esc(x.text)} <button class="lnk noprint" data-act="${esc(x.act)}" title="Go there to fix it">fix</button></li>`).join("")}</ul>`).join("")}</div>`;
}

/* ---------------------------------------------------------------- AppDev */
function pageAppdev() {
  const notes = devnotes(), unsent = notes.filter(d => (d.status || "new") === "new");
  return `<h1>AppDev</h1>
  <p>For the admin: how KAM's data and pages are built, and a way to send ideas, problems and questions to the developer. Switch this page off under Settings if you don't need it.</p>
  <div class="card"><h2 style="margin-top:0">Comments for the developer</h2>
  <div class="form"><label for="devTitle">Subject</label><input id="devTitle" title="A short subject" placeholder="e.g. The monthly round should remember last month">
  <label for="devKind">Kind</label><select id="devKind" title="What kind of comment">${DEV_KINDS.map(k => `<option>${k}</option>`).join("")}</select>
  <label for="devPage">About the page</label><select id="devPage" title="Which page it is about"><option value="">– general –</option>${TABS.map(([id, l]) => `<option value="${l}">${l}</option>`).join("")}</select>
  <label for="devText">Comment</label><textarea id="devText" title="Write the comment – as much detail as helps"></textarea></div>
  <div class="row"><button class="primary" id="devNew" title="Save the comment in the data folder">Save comment</button></div>
  <h3>Comments (${notes.length}, ${unsent.length} not sent)</h3>
  ${notes.length ? tbl(["Date", "Kind", "Page", "Subject", "Status", ""], notes.map(d => tr([esc(d.date), esc(d.kind), esc(d.page), esc(d.title), `<span class="tag ${d.status === "done" ? "ok" : d.status === "sent" ? "muted" : "warn"}">${esc(d.status || "new")}</span>`, `<button class="lnk" data-edit="${esc(d.note.path)}" title="Open the comment">Open</button>`]))) : `<p class="muted">No comments yet.</p>`}
  <div class="row"><button class="primary" id="devSend" ${unsent.length ? "" : "disabled"} title="${devEmail() ? "Opens an email to the developer with the comments not yet sent" : "Add the developer's email under Settings first"}">Send to the developer (${unsent.length})</button>
  <button id="devCopy" ${unsent.length ? "" : "disabled"} title="Copy the comments as text – paste them into an email if the button above doesn't work">Copy the comments</button>
  ${devEmail() ? "" : `<span class="warn small">No developer email in Settings yet.</span>`}</div><div id="devAfter"></div></div>
  <h2>How KAM is built</h2><div class="card md">${mdToHtml(APP.structure)}</div>
  <h2>The data model</h2><div class="card md">${mdToHtml(APP.datamodel)}</div>`;
}
function devMailText(list) {
  return [`KAM AppDev – ${list.length} comment${list.length > 1 ? "s" : ""} from ${db.settings.admin ? mName(db.settings.admin) : "the admin"}`, `KAM ${APP.version} · ${db.settings.sacco_name || ""} · ${todayISO()}`, "",
    ...list.map((d, i) => `${i + 1}. [${d.kind || "Comment"}${d.page ? " · " + d.page : ""}] ${d.title}\n   ${d.date}\n   ${String(d.note.body || "").replace(/\n/g, "\n   ")}`), ""].join("\n");
}

/* ---------------------------------------------------------------- the onboarding tour (runs on the demo data) */
const TOUR = [
  { ch: "Finding your way", tab: "home", sel: "#tabs", title: "The menu", text: "The menu on the left holds every page, grouped: Money, Group, Reporting and Housekeeping. Narrow menu at the bottom shrinks it to icons." },
  { ch: "Finding your way", tab: "home", sel: "#folderChip", title: "Data folder and version", text: "As in Horizons: the data folder is on the right of the top bar – click it to choose another, ⟳ reads it again. The version of the app is under the logo." },
  { ch: "Finding your way", tab: "home", sel: "#period", title: "Reporting month", text: "Pick the month to report on. The dashboards, statements and targets all follow it." },
  { ch: "Finding your way", tab: "home", sel: ".kpis", title: "Key figures", text: "Every number is added up from the payments recorded – nothing is typed into a total." },
  { ch: "Finding your way", tab: "home", sel: "#helpPill", title: "Help", text: "The ? in the corner (or F1) explains the page you're on, with Show me – and searches the help for every page." },
  { ch: "Finding your way", tab: "home", sel: "#followup", title: "Follow up", text: "What needs attention: members behind on savings, overdue loans, a missing fund statement, data problems. Fix one and it disappears." },
  { ch: "Finding your way", tab: "members", sel: "#mpills", title: "Members", text: "Click a member's pill to see their statement right here, or several pills to compare them. All members shows everyone: contacts, statements and the committee." },
  { ch: "Recording money", tab: "receipts", sel: "[data-pay]", title: "Record a payment", text: "One payment at a time: member, date, kind (savings, membership, welfare, penalty, loan repayment…) and amount." },
  { ch: "Recording money", tab: "receipts", sel: "[data-round]", title: "Monthly round", text: "Enter every member's payments for a month in one table – the quickest way after each collection." },
  { ch: "Recording money", tab: "receipts", sel: ".tablewrap", title: "The ledger", text: "The Receipts sheet as you know it: each member by month, the receipt summary, the fund and cash at hand. Pick a member's pill to see only them." },
  { ch: "Recording money", tab: "receipts", sel: "#rcToggle", title: "Fold the members", text: "Each member folds to one line with their year's key numbers – click it to open, or Expand all / Collapse all." },
  { ch: "Recording money", tab: "receipts", sel: "#closeMonth", title: "Close the month", text: "Once a month's payments and fund statement are checked against the statements, close it. Later changes ask first and show in History." },
  { ch: "Loans and the fund", tab: "interest", sel: "[data-new='fund']", title: "The fund statement", text: "Each month, enter the fund's deposits and interest from its statement. The interest is then shared among the members automatically." },
  { ch: "Loans and the fund", tab: "interest", sel: ".card", title: "How interest is shared", text: "By each member's balance at the start of the month. The shares always add up exactly to what the fund earned." },
  { ch: "Loans and the fund", tab: "loans", sel: "[data-new='loan']", title: "Loans", text: "A loan request, its approval and payout; repayments are payments linked to the loan. Open a loan for its repayment plan and the printable application form." },
  { ch: "Reporting and year-end", tab: "home", sel: "#presentBtn", title: "▶ Present", text: "At the monthly meeting, play the financial position as slides – arrow keys to move, Esc to stop." },
  { ch: "Reporting and year-end", tab: "updates", sel: "#copyMail", title: "The monthly update", text: "Copy the update, open the email with every member in BCC, paste – and post the short version in the WhatsApp group. Save as PDF makes a document to attach." },
  { ch: "Reporting and year-end", tab: "yearend", sel: "#divYear", title: "Year-end", text: "The dividend calculation and share-out list, and the cash count." },
  { ch: "Reporting and year-end", tab: "history", sel: "#histQ", title: "History", text: "Every change saved – who, what and when – kept in the data folder." },
  { ch: "Reporting and year-end", tab: "settings", sel: "#testModeCard", title: "Test mode", text: "After each update, KAM offers to guide you through what's new step by step. ✗ Doesn't writes a comment to the developer." },
  { ch: "Reporting and year-end", tab: "settings", sel: "#backupBtn", title: "Backup and Excel", text: "Download a backup now and then (Follow up reminds you). Export to Excel gives everything as a spreadsheet, if ever needed." },
  { ch: "Reporting and year-end", tab: "appdev", sel: "#devNew", title: "AppDev", text: "Ideas or problems with the app? Write them here and send them to the developer.", when: () => appdevOn() },
  { ch: "Reporting and year-end", tab: "settings", sel: "#handover", title: "The handover", text: "At the end of your year, download the handover zip and send it to the next admin. That's the tour – press Finish, then Leave the demo to work in your own data." },
];
const tour = { i: -1 };
const tourSteps = () => TOUR.filter(s => !s.when || s.when());
async function startTour() {
  try { localStorage.setItem("kam-tour-seen", "1"); } catch {}
  if (!store.demo) await startDemo();
  view.sel = []; view.rcOpen = null; tour.i = 0; showTourStep();
}
function showTourStep() {
  document.querySelectorAll(".tourhl").forEach(e => e.classList.remove("tourhl"));
  const st = tourSteps(), s = st[tour.i]; let p = $("tourPanel");
  if (!s) { if (p) p.remove(); tour.i = -1; return; }
  if (view.tab !== s.tab) { view.tab = s.tab; view.loan = ""; view.receiptsKind = "all"; render(); }
  const el = document.querySelector(s.sel);
  if (el) { el.classList.add("tourhl"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  if (!p) { p = document.createElement("div"); p.id = "tourPanel"; document.body.appendChild(p); }
  const chs = [...new Set(st.map(x => x.ch))];
  p.innerHTML = `<div class="small muted">Getting started · ${chs.indexOf(s.ch) + 1}/${chs.length} ${esc(s.ch)} · step ${tour.i + 1} of ${st.length}</div><h3 style="margin:4px 0">${esc(s.title)}</h3><p style="margin:4px 0 10px">${esc(s.text)}</p>
  <div class="row" style="margin:0"><button id="tBack" ${tour.i ? "" : "disabled"} title="The step before">Back</button><button class="primary" id="tNext" title="The next step">${tour.i === st.length - 1 ? "Finish" : "Next"}</button><button class="lnk" id="tClose" style="margin-left:auto" title="Stop the tour – start it again from About or Settings">Close</button></div>`;
  $("tBack").onclick = () => { tour.i--; showTourStep(); };
  $("tNext").onclick = () => { tour.i++; showTourStep(); };
  $("tClose").onclick = () => { tour.i = st.length; showTourStep(); };
}
