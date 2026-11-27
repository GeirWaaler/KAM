/* KAM – the screens. Every figure is calculated from the notes (calc.js); nothing on screen is typed in by hand. */

const $ = id => document.getElementById(id);
let db = null, alloc = null;
const view = { tab: "home", year: 0, month: 0, member: "", loan: "", receiptsKind: "all", roundMonth: "", ganttStart: "", divYear: 0, divPool: "" };
const cur = () => (db && db.settings.currency) || "UGX";
const money = v => fmt(v, cur());
const nn = v => fmtN(v);
const repMonthKey = () => monthKey(view.year, view.month);
const memberByCode = c => db.members.find(m => m.code === c);
const mName = c => { const m = memberByCode(c); return m ? m.name : c || "–"; };
const mLink = c => `[[${c}${memberByCode(c) ? " " + memberByCode(c).name : ""}]]`;
const pillFor = r => `<span class="tag ${r === "On Track" || r === "Saved" || r === "Above" || r === "repaid" ? "ok" : r === "Watch" || r === "Partial" || r === "Stable" || r === "active" ? "warn" : "bad"}">${esc(r)}</span>`;
const TABS = [["home", "Home"], ["members", "Members"], ["receipts", "Receipts"], ["interest", "Fund & interest"], ["loans", "Loans"], ["projects", "Projects"],
  ["meetings", "Meetings"], ["expenses", "Expenses"], ["plans", "Plans"], ["yearend", "Year-end"], ["updates", "Updates"], ["appdev", "AppDev"], ["about", "About"], ["settings", "Settings"]];
const TAB_HELP = { home: "The group dashboard", members: "Members, contacts, statements and targets", receipts: "Every payment by member and month", interest: "The fund and how its interest is shared",
  loans: "Loans, repayments and the loan application", projects: "Objectives, projects and the project tracker", meetings: "Agenda, committee and meetings",
  expenses: "Funding sources and expenses", plans: "The SACCO's plans", yearend: "Dividends, share-out and the cash count", updates: "Email and WhatsApp updates to the members", appdev: "For the admin: the data model, how the app is built, and comments for the developer",
  about: "What KAM is, the workbook analysis and what is coming", settings: "Data folder, settings and the yearly handover" };

function status(msg, kind = "ok") { const b = document.createElement("div"); b.className = `banner ${kind}`; b.innerHTML = msg; $("main").prepend(b); if (kind === "ok") setTimeout(() => b.remove(), 6000); }
async function guarded(fn) { try { return await fn(); } catch (e) { if (e instanceof ConflictError) status("Someone changed this note on disk since it was read. It has been read again – please make your change once more.", "warn"); else status(esc(e.message || e), "err"); console.error(e); } }

/* ---------------------------------------------------------------- data */
function refreshDb() {
  const s = settingsNote();
  db = buildDb([...store.notes.values()].filter(n => !n.error), s ? s.props : {});
  alloc = allocateInterest(db);
  const last = lastDataMonth(db);
  if (!view.year) { view.year = Number(last.slice(0, 4)); view.month = Number(last.slice(5, 7)); }
  if (!view.divYear) view.divYear = view.year;
  $("sacco").textContent = db.settings.sacco_name || db.settings.title || "";
  fillPeriod();
}
function fillPeriod() {
  const years = [...new Set([...dataYears(db), new Date().getFullYear(), view.year])].sort();
  $("repYear").innerHTML = years.map(y => `<option ${y === view.year ? "selected" : ""}>${y}</option>`).join("");
  $("repMonth").innerHTML = MONTHS_LONG.map((m, i) => `<option value="${i + 1}" ${i + 1 === view.month ? "selected" : ""}>${m}</option>`).join("");
  $("period").hidden = false;
}

/* ---------------------------------------------------------------- shell */
function renderTabs() {
  $("tabs").hidden = false;
  const nf = followUps().length;
  $("tabs").innerHTML = TABS.filter(([id]) => id !== "appdev" || appdevOn()).map(([id, label]) => `<button data-tab="${id}" class="${view.tab === id || (view.tab === "member" && id === "members") ? "on" : ""}" title="${esc(TAB_HELP[id])}">${label}${id === "home" && nf ? ` <span class="pill" title="Things to follow up">${nf}</span>` : ""}</button>`).join("");
}
function go(tab, extra = {}) { Object.assign(view, { tab }, extra); render(); window.scrollTo(0, 0); }
function render() {
  if (!db) return;
  renderTabs();
  const f = PAGES[view.tab] || PAGES.home;
  $("main").innerHTML = f();
  wire();
}
function checksBanner() {
  const cs = checks(db, alloc).filter(c => c.level !== "info");
  if (!cs.length) return `<div class="banner ok small" title="Checked every time the figures change">✓ Interest shares add up to the fund's interest every month. No unlinked payments.</div>`;
  return `<div class="banner warn small"><b>${cs.length} check${cs.length > 1 ? "s" : ""} to look at:</b><ul>${cs.slice(0, 6).map(c => `<li class="${c.level === "err" ? "bad" : ""}">${esc(c.text)}</li>`).join("")}</ul>${cs.length > 6 ? `<button class="lnk" data-go="settings" title="All checks are listed under Settings">All ${cs.length} under Settings</button>` : ""}</div>`;
}
const tbl = (head, rows, cls = "") => `<div class="tablewrap"><table class="${cls}"><thead><tr>${head.map(h => typeof h === "string" ? `<th>${h}</th>` : `<th class="${h[1]}">${h[0]}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const tr = (cells, cls = "") => `<tr class="${cls}">${cells.map(c => typeof c === "object" && c !== null && "v" in c ? `<td class="${c.c || ""}" ${c.t ? `title="${esc(c.t)}"` : ""}>${c.v}</td>` : `<td>${c ?? ""}</td>`).join("")}</tr>`;
const N = (v, t) => ({ v: nn(v), c: "n", t });

/* ---------------------------------------------------------------- Home – Group Dashboard */
function pageHome() {
  const k = kpis(db, alloc, view.year, view.month), act = activeMembers(db);
  const nextMeeting = db.meetings.filter(m => String(m.date) >= todayISO()).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const rows = act.map(m => memberRow(db, m, view.year, view.month));
  const years = [...new Set([...dataYears(db).filter(y => y >= view.year - 2 && y <= view.year), view.year])].sort();
  const ya = yearActuals(db, years), qa = quarterActuals(db, view.year, repMonthKey());
  const fm = Array.from({ length: 12 }, (_, i) => { const f = db.fund.find(x => x.month === monthKey(view.year, i + 1) && !x.opening); return f ? f.interest : 0; });
  const projYears = [view.year - 1, view.year];
  return `<h1>Dashboard · ${MONTHS_LONG[view.month - 1]} ${view.year}</h1>${followUpSection()}
  <div class="kpis">
    ${kp("Registered members " + view.year, k.registered, "Active members who paid the membership fee this year")}
    ${kp("Total members", k.total, "Active members in the member list")}
    ${kp("Total saved", money(k.totalSaved), "All savings paid in, less withdrawals, up to the reporting month")}
    ${kp("This year's saving", money(k.yearSaved), "Savings paid in this year up to the reporting month")}
    ${kp("Interest earned " + view.year, money(k.interestYear), "The fund's interest this year up to the reporting month")}
    ${kp("Interest earned to date", money(k.interestAll), "All the fund's interest since the records began")}
    ${kp("Interest last month", money(k.interestLastMonth), "The fund's interest in the reporting month")}
    ${kp("Highest interest per day", money(k.highestDaily), "The best month's interest divided by its number of days")}
    ${kp("Fund value", money(k.fundValue), "Deposits plus interest in the fund, end of the reporting month")}
    ${kp("Next meeting", nextMeeting ? esc(nextMeeting.date) : "–", "The next meeting in Meetings")}
  </div>
  ${db.settings.vision ? `<div class="card"><b>Vision:</b> ${esc(db.settings.vision)}</div>` : ""}
  <div class="grid2">
    <div>${barChart({ title: "Actual vs target by year", labels: ya.map(x => String(x.year)), bars: [{ name: "Actual", values: ya.map(x => x.actual) }, { name: "Target", values: ya.map(x => x.target) }] })}</div>
    <div>${barChart({ title: `Savings vs target by quarter, ${view.year} (cumulative)`, labels: qa.map(x => x.label.slice(5)), bars: [{ name: "Actual", values: qa.map(x => x.actual) }, { name: "Target", values: qa.map(x => x.target) }] })}</div>
  </div>
  <div class="card">${barChart({ title: `Interest earned by month, ${view.year}`, labels: MONTHS, bars: [{ name: "Fund interest", values: fm }] })}</div>
  <h2>Objectives</h2>
  ${tbl(["Code", "Objective", "Measure", ...projYears.map(y => `${y} projects`)], db.objectives.map(o => tr([esc(o.code), esc(o.title), esc(o.measure),
    ...projYears.map(y => db.projects.filter(p => linkName(p.objective) === o.code && String(p.start).startsWith(y)).map(p => esc(p.code)).join(", "))])))}
  ${asList(db.settings.highlights).length ? `<h2>Last month's highlights</h2><ol>${asList(db.settings.highlights).map(h => `<li>${esc(h)}</li>`).join("")}</ol>` : ""}
  <h2>Current projects and activities</h2>${projectTable(db.projects)}
  <h2>Members against target</h2>
  <p class="muted small">Target to date = monthly target × ${view.month} month${view.month > 1 ? "s" : ""}. Consistency counts the months with a savings payment, January–${MONTHS_LONG[view.month - 1]}.</p>
  ${memberTable(rows)}`;
}
const kp = (label, v, t) => `<div class="kpi" title="${esc(t)}"><span>${esc(label)}</span><b>${v}</b></div>`;
function memberTable(rows) {
  const tot = k => rows.reduce((s, r) => s + r[k], 0);
  return tbl(["Code", "Name", ["Registration", "n"], [`${view.year} savings`, "n"], ["Total savings", "n"], ["Loan", "n"], ["Monthly target", "n"], ["Target to date", "n"], ["Annual target", "n"], ["Gap", "n"], "Consistency", "Gap insight", ["Months paid", "n"], "Momentum", "Risk flag", ...MONTHS.map(m => [m, "n"])],
    [...rows.map(r => tr([`<button class="lnk" data-member="${esc(r.code)}" title="Open the member page">${esc(r.code)}</button>`, esc(r.name), N(r.registration), N(r.yearSavings), N(r.totalSavings), N(r.loan), N(r.monthlyTarget), N(r.currentTarget), N(r.annualTarget),
      { v: nn(r.gap), c: "n " + (r.gap > 0 ? "bad" : "ok") }, pillFor(r.consistency), esc(r.insight), N(r.paidMonths), pillFor(r.momentum), pillFor(r.risk), ...r.monthly.map(v => N(v))])),
    tr(["", "Total", N(tot("registration")), N(tot("yearSavings")), N(tot("totalSavings")), N(tot("loan")), "", N(tot("currentTarget")), N(tot("annualTarget")), N(tot("gap")), "", "", "", "", "", ...MONTHS.map((_, i) => N(rows.reduce((s, r) => s + r.monthly[i], 0)))], "tot")]);
}
function projectTable(list) {
  return tbl(["Code", "Project / activity", "Comment", "Committee", ["Cost", "n"], "Progress", "Start", "End", ""], list.map(p => tr([esc(p.code), esc(p.title), esc(p.comment), esc(p.committee), N(p.cost),
    `<progress max="100" value="${num(p.progress)}" title="${num(p.progress)}%"></progress> ${num(p.progress)}%`, esc(p.start), esc(p.end), `<button class="lnk" data-edit="${esc(p.note.path)}" title="Edit this project">Edit</button>`])));
}

/* ---------------------------------------------------------------- Members – Individuals Dashboard, contacts, STT, charts 4 and 5 */
function pageMembers() {
  const rows = activeMembers(db).map(m => memberRow(db, m, view.year, view.month)), end = monthKey(view.year, 12);
  return `<h1>Members</h1>
  <div class="row noprint"><label for="pickMember">Open a member:</label><select id="pickMember" title="Pick a member to see their page"><option value="">– choose –</option>${db.members.map(m => `<option value="${esc(m.code)}">${esc(m.code)} ${esc(m.name)}</option>`).join("")}</select>
  <button data-new="member" title="Add a new member">+ New member</button></div>
  <div class="grid2">
    <div>${barChart({ title: "Total contributions per member", labels: rows.map(r => r.code), bars: [{ name: "Registration", values: rows.map(r => r.registration) }, { name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }, { name: "Total savings", values: rows.map(r => r.totalSavings) }], rotate: true })}</div>
    <div>${barChart({ title: "Monthly savings and targets", labels: rows.map(r => r.code), bars: [{ name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }], lines: [{ name: "Target to date", values: rows.map(r => r.currentTarget) }, { name: "Annual target", values: rows.map(r => r.annualTarget) }], rotate: true })}</div>
  </div>
  <h2>Statements ${view.year} (STT)</h2>
  ${tbl(["Code", "Name", ["Accumulated savings", "n"], ["Membership", "n"], ["Loan interest received", "n"], ["Loan repayment", "n"], [`Borrowing ${view.year}`, "n"], [`Loan paid ${view.year}`, "n"], ["Loan outstanding", "n"]],
    activeMembers(db).map(m => { const s = statement(db, alloc, m.code, view.year); return tr([esc(m.code), esc(m.name), N(s.savings), N(s.membership), N(s.loanInterest), N(s.loanRepayment), N(s.borrowingYear), N(s.repaidYear), N(s.outstanding)]); }))}
  <p class="muted small">Accumulated savings at the end of ${view.year}; membership, loan interest and repayment are all-time totals, as in the workbook.</p>
  <h2>Contacts and time zones</h2>
  ${tbl(["Code", "Name", "Status", "Role", "Country", "City", "Time zone", "Local time now", "Email", "Phone", ""], db.members.map(m => tr([esc(m.code), esc(m.name), esc(m.status), esc(m.role), esc(m.country), esc(m.city), esc(m.timezone), localTime(m.timezone),
    m.email ? `<a href="mailto:${esc(m.email)}" title="Write to ${esc(m.name)}">${esc(m.email)}</a>` : `<span class="muted">–</span>`, esc(m.phone), `<button class="lnk" data-edit="${esc(m.note.path)}" title="Edit this member">Edit</button>`])))}
  <h2>Committee</h2>${committeeTable()}`;
}
function localTime(tz) { if (!tz) return ""; try { return new Date().toLocaleString("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" }) + ` <span class="muted small">(UTC${utcOffset(tz)})</span>`; } catch { return `<span class="muted small">unknown zone</span>`; } }
function utcOffset(tz) { try { const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find(x => x.type === "timeZoneName"); return (p ? p.value : "").replace("GMT", "") || "+0"; } catch { return ""; } }
const committeeTable = () => tbl(["Role", "Member"], db.members.filter(m => m.role).map(m => tr([esc(m.role), `${esc(m.name)} <span class="muted">${esc(m.code)}</span>`])));

function pageMember() {
  const m = memberByCode(view.member); if (!m) return pageMembers();
  const r = memberRow(db, m, view.year, view.month), s = statement(db, alloc, m.code, view.year);
  const months = Array.from({ length: 12 }, (_, i) => monthKey(view.year, i + 1));
  const myTx = db.tx.filter(t => t.member === m.code).slice().reverse();
  const loans = db.loans.filter(l => l.member === m.code);
  return `<div class="row noprint"><button data-go="members" title="Back to the member list">← Members</button><select id="pickMember" title="Pick another member">${db.members.map(x => `<option value="${esc(x.code)}" ${x.code === m.code ? "selected" : ""}>${esc(x.code)} ${esc(x.name)}</option>`).join("")}</select>
  <button data-edit="${esc(m.note.path)}" title="Edit this member's details">Edit</button><button data-pay="${esc(m.code)}" class="primary" title="Record a payment from this member">+ Payment</button><button onclick="print()" title="Print this statement">Print</button></div>
  <h1>${esc(m.name)} <span class="muted">${esc(m.code)}</span></h1>
  <p class="muted">${[m.role, m.city, m.country, m.timezone && localTime(m.timezone), m.email].filter(Boolean).join(" · ")}</p>
  <div class="kpis">
    ${kp(`${view.year} savings`, money(r.yearSavings), "Savings this year up to the reporting month")}${kp("Target to date", money(r.currentTarget), "Monthly target × months so far")}
    ${kp("Gap", money(r.gap), r.insight)}${kp("Risk flag", pillFor(r.risk), "On Track: paid every month so far. Watch: one month missing. At Risk: more")}
    ${kp("Fund balance", money(s.fundBalance), "Savings plus interest shared, end of the year")}${kp(`Interest shared ${view.year}`, money(s.interestYear), "This member's share of the fund's interest this year")}
    ${kp("Loan outstanding", money(s.outstanding), "Loans paid out less repayments")}
  </div>
  ${barChart({ title: `Savings by month, ${view.year}`, labels: MONTHS, bars: [{ name: "Savings", values: r.monthly }], lines: [{ name: "Monthly target", values: MONTHS.map(() => r.monthlyTarget) }] })}
  <h2>Statement ${view.year}</h2>
  ${tbl(["", ...MONTHS.map(x => [x, "n"]), ["Year", "n"]], [
    ...["savings", "withdrawal", "membership", "welfare", "penalty", "loan_interest", "loan_repayment"].map(k => tr([KINDS[k], ...months.map(mk => N(kindSum(db, m.code, k, view.year, mk))), N(kindSum(db, m.code, k, view.year))])),
    tr(["Interest earned (calculated)", ...months.map(mk => N(interestOf(alloc, m.code, null, mk))), N(interestOf(alloc, m.code, view.year))], "sub"),
    tr(["Fund balance, end of month", ...months.map(mk => N(fundBalance(db, alloc, m.code, mk))), ""], "tot")])}
  <h2>Loans</h2>${loans.length ? loanList(loans) : `<p class="muted">No loans.</p>`}
  <h2>All payments</h2>${tbl(["Date", "Kind", ["Amount", "n"], "Reference", ""], myTx.map(t => tr([esc(t.date), esc(KINDS[t.kind] || t.kind), N(t.amount), esc(t.ref), `<button class="lnk" data-edit="${esc(t.note.path)}" title="Correct or delete this payment">Edit</button>`])))}`;
}

/* ---------------------------------------------------------------- Receipts – the core ledger */
function pageReceipts() {
  if (view.receiptsKind === "round") return pageRound();
  const y = view.year, months = Array.from({ length: 12 }, (_, i) => monthKey(y, i + 1)), prevEnd = monthKey(y - 1, 12);
  const KROWS = ["savings", "membership", "welfare", "penalty", "loan_interest", "loan_repayment"];
  const body = [];
  for (const m of activeMembers(db)) {
    body.push(`<tr class="sub"><td colspan="16"><b>${esc(m.name)}</b> <span class="muted">${esc(m.code)}</span> <button class="lnk noprint" data-member="${esc(m.code)}" title="Open the member page">open</button></td></tr>`);
    for (const k of KROWS) {
      const vals = months.map(mk => k === "savings" ? savingsIn(db, m.code, y, mk) : kindSum(db, m.code, k, y, mk));
      const bf = k === "savings" ? savingsBalance(db, m.code, prevEnd) : db.tx.filter(t => t.member === m.code && t.kind === k && t.year < y).reduce((s, t) => s + t.amount, 0);
      body.push(tr([KINDS[k], N(bf, "Brought forward from earlier years"), ...vals.map(v => N(v)), N(vals.reduce((a, b) => a + b, 0)), N(bf + vals.reduce((a, b) => a + b, 0))]));
    }
    const iv = months.map(mk => interestOf(alloc, m.code, null, mk)), ibf = [...alloc.byMonth].filter(([mk]) => mk <= prevEnd).reduce((s, [, sh]) => s + (sh.get(m.code) || 0), 0);
    body.push(tr(["Interest earned", N(ibf), ...iv.map(v => N(v)), N(iv.reduce((a, b) => a + b, 0)), N(ibf + iv.reduce((a, b) => a + b, 0))]));
    body.push(tr(["Sub total (savings + interest)", N(fundBalance(db, alloc, m.code, prevEnd)), ...months.map(mk => N(fundBalance(db, alloc, m.code, mk))), "", N(fundBalance(db, alloc, m.code, monthKey(y, 12)))], "tot"));
  }
  const rs = receiptSummary(db, y), fr = fundRows(db);
  const sumRow = (label, vals, cls) => tr([label, "", ...vals.map(v => N(v)), N(vals.reduce((a, b) => a + b, 0)), ""], cls);
  const fv = key => months.map(mk => { const f = fr.find(x => x.month === mk && !x.opening); return f ? f[key] : 0; });
  const runEnd = mk => (fr.filter(f => f.month <= mk).at(-1) || { running: 0 }).running;
  return `<h1>Receipts ${y}</h1>${checksBanner()}
  <div class="row noprint"><button class="primary" data-pay="" title="Record one payment">+ Payment</button><button data-round="1" title="Enter every member's payments for one month in one table">Monthly round</button><button onclick="print()" title="Print the receipts">Print</button></div>
  ${tbl(["", ["B/F", "n"], ...MONTHS.map(x => [x, "n"]), [`${y} total`, "n"], ["Total", "n"]], [...body,
    `<tr><td colspan="16"><h3>Receipt summary</h3></td></tr>`,
    sumRow("Total savings", rs.rows.savings), sumRow("Total membership fee / sub", rs.rows.membership), sumRow("Total welfare fund", rs.rows.welfare), sumRow("Total penalties", rs.rows.penalty),
    sumRow("Loan interest received", rs.rows.loan_interest), sumRow("Total loan repayment", rs.rows.loan_repayment), sumRow("Return on investment", rs.rows.investment_return), sumRow("Other income", rs.rows.other_income),
    sumRow("Total collections", rs.rows.total, "tot"),
    `<tr><td colspan="16"><h3>${esc(db.settings.fund_name || "Fund")} (UAP)</h3></td></tr>`,
    sumRow("Fund deposits", fv("deposits")), sumRow("Fund withdrawals", fv("withdrawals")), sumRow("Fund interest", fv("interest")), sumRow("Fund monthly total", fv("total"), "sub"),
    tr(["Fund running total", "", ...months.map(mk => N(runEnd(mk))), "", ""], "tot"),
    tr(["Cash at hand (calculated)", "", ...months.map(mk => N(cashAtHand(db, mk), "Received − put in the fund − loans paid out − expenses − savings paid back")), "", ""])])}
  <p class="muted small">Every figure is added up from the payments. The interest row is the app's calculation (see Fund &amp; interest). Cash at hand = money received − put in the fund − loans paid out − expenses − savings paid back.</p>`;
}
function pageRound() {
  const mk = view.roundMonth || monthKey(new Date().getFullYear(), new Date().getMonth() + 1);
  const cols = ["savings", "membership", "welfare", "penalty", "loan_repayment", "loan_interest"];
  return `<div class="row noprint"><button data-roundback="1" title="Back to the receipts">← Receipts</button></div><h1>Monthly round</h1>
  <p>Enter what each member paid in one month. Empty fields are skipped. Already recorded amounts are shown in grey.</p>
  <div class="row"><label for="roundMonth">Month</label><input type="month" id="roundMonth" value="${mk}" title="The month the payments belong to"><label for="roundDate">Payment date</label><input type="date" id="roundDate" value="${mk}-01" title="The date written on each payment"></div>
  ${tbl(["Member", ...cols.map(k => [KINDS[k], "n"])], activeMembers(db).map(m => tr([`${esc(m.code)} ${esc(m.name)}`, ...cols.map(k => { const had = kindSum(db, m.code, k, null, mk);
    return { v: `<input type="number" min="0" step="1" class="rin" data-m="${esc(m.code)}" data-k="${k}" style="width:110px" title="${esc(KINDS[k])} from ${esc(m.name)}">${had ? `<div class="muted small">already ${nn(had)}</div>` : ""}`, c: "n" }; })])))}
  <div class="row"><button class="primary" id="roundSave" title="Save every amount entered as its own payment note">Save the round</button></div>`;
}

/* ---------------------------------------------------------------- Fund & interest */
function pageInterest() {
  const fr = fundRows(db), years = dataYears(db);
  const wbYears = [...new Set(db.members.flatMap(m => Object.keys(m).filter(k => /^workbook_interest_\d{4}$/.test(k)).map(k => Number(k.slice(-4)))))].sort();
  const cmpYears = wbYears.length ? wbYears : years;
  const rows = db.members.map(m => tr([esc(m.code), esc(m.name), ...cmpYears.flatMap(y => { const w = num(m[`workbook_interest_${y}`]), a = interestOf(alloc, m.code, y), d = a - w;
    return [N(w), N(a), { v: nn(d), c: "n diff " + (Math.abs(d) > 1 ? "bad" : "") }]; })]));
  const totals = tr(["", "Total", ...cmpYears.flatMap(y => { const w = db.members.reduce((s, m) => s + num(m[`workbook_interest_${y}`]), 0), a = db.members.reduce((s, m) => s + interestOf(alloc, m.code, y), 0); return [N(w), N(a), N(a - w)]; })], "tot");
  const fundInterest = y => db.fund.filter(f => !f.opening && Number(f.month.slice(0, 4)) === y).reduce((s, f) => s + f.interest, 0);
  return `<h1>Fund &amp; interest</h1>${checksBanner()}
  <div class="card"><b>How interest is shared:</b> each month's fund interest is shared in proportion to each member's balance at the start of that month – savings paid in before the month, less withdrawals, plus interest already shared. Payments made during a month count from the next month. Shares are whole shillings and always add up exactly to the fund's interest. <span class="muted">(Default until the group decides – see About.)</span></div>
  <h2>Interest per member – workbook vs recalculated</h2>
  <p class="muted small">"Workbook" is the figure the spreadsheet showed (kept on each member note). "App" is the recalculation from the payments and the fund's actual interest.</p>
  ${tbl(["Code", "Name", ...cmpYears.flatMap(y => [[`${y} workbook`, "n"], [`${y} app`, "n"], [`${y} difference`, "n"]])], [...rows, totals])}
  <p class="small">The fund itself earned ${cmpYears.map(y => `<b>${money(fundInterest(y))}</b> in ${y}`).join(", ")}.</p>
  <h2>The fund month by month</h2>
  <div class="row noprint"><button data-new="fund" title="Enter a month's fund statement">+ Fund statement</button></div>
  ${tbl(["Month", ["Deposits", "n"], ["Withdrawals", "n"], ["Interest", "n"], ["Monthly total", "n"], ["Running total", "n"], ["Interest shared", "n"], ["Members' balance at start", "n"], ["Return per month", "n"], ""],
    fr.slice().reverse().map(f => { const sh = alloc.byMonth.get(f.month), shared = sh ? [...sh.values()].reduce((a, b) => a + b, 0) : 0, bs = alloc.balanceStart.get(f.month), W = bs ? [...bs.values()].reduce((a, b) => a + b, 0) : 0;
      return tr([esc(f.month) + (f.opening ? ' <span class="pill">opening</span>' : ""), N(f.deposits), N(f.withdrawals), N(f.interest), N(f.total), N(f.running), { v: nn(shared), c: "n " + (!f.opening && f.interest && shared !== Math.round(f.interest) ? "bad" : "") }, N(W),
        { v: W && f.interest ? (f.interest / W * 100).toFixed(2) + "%" : "", c: "n" }, `<button class="lnk" data-edit="${esc(f.note.path)}" title="Correct this fund statement">Edit</button>`]); }))}
  <p class="muted small">Return per month = the month's interest ÷ the members' balance at the start of the month. Compare with the fund's own statements.</p>`;
}

/* ---------------------------------------------------------------- Loans – EXP LOAN and Loan Application */
function loanList(loans) {
  const asOf = repMonthKey();
  return tbl(["Loan", "Member", "Guarantor", "Paid out", ["Amount", "n"], ["Repaid", "n"], ["Outstanding", "n"], ["Interest charged", "n"], ["Interest paid", "n"], ["Interest due", "n"], "Due by", "Status", ""],
    loans.map(l => { const s = loanState(db, l, asOf); return tr([esc(l.code), esc(mName(l.member)), esc(mName(l.guarantor)), esc(l.paid_out || "–"), N(l.amount), N(s.repaid), N(s.outstanding), N(s.interestCharged), N(s.interestPaid),
      { v: nn(s.interestDue), c: "n " + (s.interestDue ? "warn" : "") }, esc(s.dueMonth), pillFor(s.status), `<button class="lnk" data-loan="${esc(l.code)}" title="Open the loan: plan, repayments, application">Open</button>`]); }));
}
function pageLoans() {
  if (view.loan) return pageLoan();
  const years = [...new Set([...db.loans.map(l => Number(String(l.paid_out).slice(0, 4))).filter(Boolean), view.year])].sort().filter(y => y <= view.year).slice(-3);
  const holders = db.members.filter(m => db.loans.some(l => l.member === m.code));
  return `<h1>Loans</h1>${checksBanner()}
  <div class="row noprint"><button class="primary" data-new="loan" title="Start a new loan request">+ Loan request</button></div>
  <p class="muted small">Rules: ${num(db.settings.loan_rate || 0.05) * 100}% interest per month on the declining balance, repaid within ${num(db.settings.loan_max_months || 4)} months. Figures as at the end of ${MONTHS_LONG[view.month - 1]} ${view.year}.</p>
  ${db.loans.length ? loanList(db.loans) : `<p class="muted">No loans yet.</p>`}
  <h2>Borrowing and repayment by year (EXP LOAN)</h2>
  ${holders.length ? tbl(["Member", ...years.flatMap(y => [[`${y} borrowing`, "n"], [`${y} repayment`, "n"], [`Outstanding end ${y}`, "n"]])], holders.map(m => tr([`${esc(m.code)} ${esc(m.name)}`, ...years.flatMap(y => { const ly = loanYear(db, m.code, y); return [N(ly.borrowing), N(ly.repayment), N(ly.outstanding)]; })]))) : `<p class="muted">No loans yet.</p>`}`;
}
function pageLoan() {
  const l = db.loans.find(x => x.code === view.loan); if (!l) { view.loan = ""; return pageLoans(); }
  const s = loanState(db, l, repMonthKey()), sch = loanSchedule(l.amount, l.rate, l.months, String(l.paid_out || l.applied || todayISO()).slice(0, 7));
  const pays = db.tx.filter(t => t.loan === l.code && (t.kind === "loan_repayment" || t.kind === "loan_interest"));
  return `<div class="row noprint"><button data-loanback="1" title="Back to all loans">← Loans</button><button data-edit="${esc(l.note.path)}" title="Edit the loan: approval, payout, terms">Edit</button>
  <button class="primary" data-pay="${esc(l.member)}" data-paykind="loan_repayment" data-payloan="${esc(l.code)}" title="Record a repayment on this loan">+ Repayment</button><button data-apply="${esc(l.code)}" title="Print the loan application form for signing">Loan application form</button></div>
  <h1>Loan ${esc(l.code)} · ${esc(mName(l.member))}</h1>
  <div class="kpis">${kp("Amount", money(l.amount), "")}${kp("Outstanding", money(s.outstanding), "Amount less repayments")}${kp("Interest due", money(s.interestDue), "Interest charged on the declining balance, less interest paid")}${kp("Due by", esc(s.dueMonth || "–"), "Paid-out month + the repayment period")}${kp("Status", pillFor(s.status), "")}</div>
  <p>${esc(l.purpose || "")} · Guarantor: ${esc(mName(l.guarantor))} · Applied ${esc(l.applied || "–")}, approved ${esc(l.approved || "–")}, paid out ${esc(l.paid_out || "–")}</p>
  <h2>Repayment plan</h2><p class="muted small">Equal repayments of the amount; interest of ${(l.rate * 100).toFixed(1)}% each month on what is still owed.</p>
  ${tbl(["#", "Month", ["Owed at start", "n"], ["Interest", "n"], ["Repayment", "n"], ["To pay", "n"], ["Owed after", "n"]], [...sch.map(r => tr([r.n, esc(r.month), N(r.opening), N(r.interest), N(r.principal), N(r.payment), N(r.closing)])),
    tr(["", "Total", "", N(sch.reduce((a, r) => a + r.interest, 0)), N(sch.reduce((a, r) => a + r.principal, 0)), N(sch.reduce((a, r) => a + r.payment, 0)), ""], "tot")])}
  <h2>Payments on this loan</h2>${pays.length ? tbl(["Date", "Kind", ["Amount", "n"], "Reference"], pays.map(t => tr([esc(t.date), esc(KINDS[t.kind]), N(t.amount), esc(t.ref)]))) : `<p class="muted">None yet.</p>`}`;
}
function loanApplication(l) {
  const m = memberByCode(l.member) || {}, g = memberByCode(l.guarantor) || {}, s = db.settings;
  const line = (label, v) => `<tr><th style="width:34%">${label}</th><td>${v ?? ""}&nbsp;</td></tr>`;
  return `<div class="row noprint"><button data-loan="${esc(l.code)}" title="Back to the loan">← Loan</button><button onclick="print()" class="primary" title="Print or save as PDF">Print</button></div>
  <div class="card"><h1>${esc(s.sacco_name || "")}</h1><h2>Loan application</h2>
  <h3>Applicant information</h3><table>${line("Name", esc(m.name))}${line("Member code", esc(m.code))}${line("Date of application", esc(l.applied))}${line("Phone", esc(m.phone))}${line("Email", esc(m.email))}${line("Residential address", "")}${line("City / country", esc([m.city, m.country].filter(Boolean).join(", ")))}</table>
  <h3>Loan request</h3><table>${line("Loan amount", money(l.amount))}${line("In words", esc(inWords(l.amount)) + " shillings")}${line("Current savings balance", money(savingsBalance(db, l.member, String(l.applied || todayISO()).slice(0, 7))))}${line("Purpose of loan", esc(l.purpose))}${line("Repayment period", `${l.months} months`)}</table>
  <h3>Guarantor information</h3><table>${line("Name", esc(g.name))}${line("Member code", esc(g.code))}${line("Phone", esc(g.phone))}${line("Current address", esc([g.city, g.country].filter(Boolean).join(", ")))}${line("Comment", "")}${line("Signature and date", "")}</table>
  <h3>Applicant's declaration</h3>
  <p>I hereby declare that the information given in this application is true and correct.</p>
  <p>The repayment period shall be fixed at a maximum of ${num(s.loan_max_months || 4)} months. The interest payable per month shall be ${num(s.loan_rate || 0.05) * 100}% on a declining balance.</p>
  <p>In the event of non-payment or default, the following shall be pursued: a default fee${s.default_fee ? ` of ${money(s.default_fee)}` : ""}; i) attach my savings in the association; ii) attach my salary in case there is a balance after savings; iii) terminate my membership.</p>
  <p>I understand that the association reserves the right to decline my application without giving a reason.</p>
  <table>${line("Signature of applicant", "")}${line("Date", "")}</table>
  <h3>For official use only</h3><table>${line("Comment", "")}${line("Authorisation signature", "")}${line("Date", "")}</table></div>`;
}

/* ---------------------------------------------------------------- Projects – objectives, projects, tracker */
function pageProjects() {
  const tasks = db.tasks;
  return `<h1>Projects</h1>
  <div class="row noprint"><button data-new="project" class="primary" title="Add a project or activity">+ Project</button><button data-new="objective" title="Add an objective">+ Objective</button><button data-new="task" title="Add a task to the project tracker">+ Task</button></div>
  <h2>Objectives</h2>${tbl(["Code", "Objective", "Measure", "Projects", ""], db.objectives.map(o => tr([esc(o.code), esc(o.title), esc(o.measure), db.projects.filter(p => linkName(p.objective) === o.code).map(p => esc(p.code)).join(", "), `<button class="lnk" data-edit="${esc(o.note.path)}" title="Edit this objective">Edit</button>`])))}
  <h2>Projects and activities</h2>${projectTable(db.projects)}
  <h2>Project tracker</h2>
  <div class="row noprint"><label for="ganttStart">Show from</label><input type="date" id="ganttStart" value="${esc(view.ganttStart)}" title="The first week shown in the timeline"><span class="muted small">Total cost of projects: ${money(db.projects.reduce((s, p) => s + num(p.cost), 0))}</span></div>
  ${ganttChart(tasks, { weeks: 8, start: view.ganttStart || undefined })}
  ${tbl(["Phase", "Task", "Project", "Assigned to", "Progress", "Start", "End", ["Days", "n"], ""], tasks.map(t => tr([esc(t.phase), esc(t.title), esc(linkName(t.project)), esc(mName(db.memberCode(t.owner))), `${num(t.progress)}%`, esc(t.start), esc(t.end),
    N(t.start && t.end ? Math.round((Date.parse(t.end) - Date.parse(t.start)) / 864e5) + 1 : 0), `<button class="lnk" data-edit="${esc(t.note.path)}" title="Edit this task">Edit</button>`])))}`;
}

/* ---------------------------------------------------------------- Meetings */
function pageMeetings() {
  const agenda = asList(db.settings.agenda).map(a => String(a).split("|").map(x => x.trim()));
  return `<h1>Meetings</h1><div class="row noprint"><button class="primary" data-newmeeting="1" title="Create the next meeting with the standing agenda">+ Meeting</button></div>
  <div class="grid2"><div><h2>Standing agenda</h2>${tbl(["#", "Item", "Responsible"], agenda.map((a, i) => tr([i + 1, esc(a[0]), esc(a[1] || "")])))}<p class="muted small">Change the agenda under Settings.</p></div>
  <div><h2>Committee</h2>${committeeTable()}<p class="muted small">Roles are set on each member note.</p></div></div>
  <h2>Meetings</h2>${tbl(["Date", "Meeting", "Attendees", "Notes", ""], db.meetings.map(m => tr([esc(m.date), esc(m.title), asList(m.attendees).map(a => esc(mName(db.memberCode(a)))).join(", "), mdToHtml(String(m.note.body || "").slice(0, 400)), `<button class="lnk" data-edit="${esc(m.note.path)}" title="Open the meeting notes">Edit</button>`])))}`;
}

/* ---------------------------------------------------------------- Expenses */
function pageExpenses() {
  let bal = 0, run = 0;
  const ex = db.tx.filter(t => t.kind === "expense");
  const spent = ex.reduce((s, t) => s + t.amount, 0);
  return `<h1>Expenses</h1><div class="row noprint"><button data-new="funding" title="Add an approved funding source">+ Funding source</button><button class="primary" data-pay="" data-paykind="expense" title="Record an expense">+ Expense</button></div>
  <h2>Funding sources</h2>${tbl(["#", "Funding source", "Approval date", ["Amount", "n"], ["Running balance", "n"], ""], db.funding.map((f, i) => { bal += num(f.amount); return tr([i + 1, esc(f.title), esc(f.approved), N(f.amount), N(bal - spent), `<button class="lnk" data-edit="${esc(f.note.path)}" title="Edit">Edit</button>`]); }))}
  <h2>Expenses</h2>${tbl(["#", "Activity / project", "Date", "Particulars", ["Amount", "n"], ["Running total", "n"], ""], ex.map((t, i) => { run += t.amount; return tr([i + 1, esc(t.project), esc(t.date), esc(t.ref), N(t.amount), N(run), `<button class="lnk" data-edit="${esc(t.note.path)}" title="Correct or delete">Edit</button>`]); }))}
  <p class="small">Approved ${money(bal)} · spent ${money(spent)} · <b>left ${money(bal - spent)}</b></p>`;
}

/* ---------------------------------------------------------------- Plans */
function pagePlans() {
  return `<h1>Plans</h1><div class="row noprint"><button data-new="plan" title="Add a plan">+ Plan</button></div>
  ${db.plans.map(p => `<div class="card"><div class="row"><h2 style="margin:0">${esc(p.title)}</h2><button class="lnk noprint" data-edit="${esc(p.note.path)}" title="Edit this plan">Edit</button></div><div class="md">${p.note.body ? mdToHtml(p.note.body) : `<p class="muted">Empty – not written yet.</p>`}</div></div>`).join("")}`;
}

/* ---------------------------------------------------------------- Year-end – dividends, share-out, cash count */
function pageYearend() {
  const y = view.divYear || view.year, fundI = db.fund.filter(f => !f.opening && f.month.startsWith(String(y))).reduce((s, f) => s + f.interest, 0);
  const pool = view.divPool === "" ? fundI : num(view.divPool), rows = dividendSplit(db, y, pool, "savings");
  const tot = k => rows.reduce((s, r) => s + r[k], 0);
  const notes = asList(db.settings.banknotes).map(num).filter(Boolean);
  const last = db.cashcounts[0];
  return `<h1>Year-end</h1>
  <h2>Dividend calculation and share-out list</h2>
  <div class="row noprint"><label for="divYear">Year</label><select id="divYear" title="The year to share out">${dataYears(db).map(x => `<option ${x === y ? "selected" : ""}>${x}</option>`).join("")}</select>
  <label for="divPool">Amount to share</label><input type="number" id="divPool" value="${pool}" title="Defaults to the fund's interest for the year" style="width:150px"><span class="muted small">Fund interest ${y}: ${money(fundI)}</span><button onclick="print()" title="Print the share-out list for signing">Print</button></div>
  <p class="muted small">Each member's dividend = their accumulated savings at the end of ${y} ÷ everyone's savings × the amount to share (as in the 2021 dividend sheet). Totals add up exactly.</p>
  ${tbl(["#", "Name", ["Acc. savings", "n"], ["Borrowing outstanding", "n"], ["Dividend", "n"], ["Total (savings + dividend − borrowing)", "n"], "Signature"], [...rows.map((r, i) => tr([i + 1, esc(r.name), N(r.savings), N(r.borrowing), N(r.dividend), N(r.savings + r.dividend - r.borrowing), ""])),
    tr(["", "Total", N(tot("savings")), N(tot("borrowing")), N(tot("dividend")), N(tot("savings") + tot("dividend") - tot("borrowing")), ""], "tot")])}
  <div class="row noprint"><button data-saveyear="${y}" title="Save this share-out as the year's record">Save as the ${y} year-end record</button></div>
  ${db.years.length ? `<h3>Saved year-end records</h3><ul>${db.years.map(r => `<li>${esc(r.year)} – shared ${money(r.pool)} (${esc(r.decided || "")}) <button class="lnk" data-edit="${esc(r.note.path)}" title="Open">open</button></li>`).join("")}</ul>` : ""}
  <h2>Cash count</h2>
  <p class="muted small">Count the cash by banknote; the total is added up for you.</p>
  ${tbl(["Banknote", ["Number", "n"], ["Amount", "n"]], [...notes.map(d => tr([nn(d), { v: `<input type="number" min="0" class="cc" data-d="${d}" value="${last ? num(last.note.props["n" + d]) || "" : ""}" style="width:90px" title="How many ${nn(d)} notes">`, c: "n" }, { v: `<span id="cc${d}"></span>`, c: "n" }])), tr(["Total", "", { v: `<b id="ccTotal"></b>`, c: "n" }], "tot")])}
  <div class="row noprint"><input type="date" id="ccDate" value="${todayISO()}" title="Date of the count"><button class="primary" id="ccSave" title="Save the count">Save the count</button></div>
  ${db.cashcounts.length ? `<h3>Earlier counts</h3>${tbl(["Date", ["Total", "n"]], db.cashcounts.map(c => tr([esc(c.date), N(notes.reduce((s, d) => s + d * num(c.note.props["n" + d]), 0))])))}` : ""}`;
}

/* ---------------------------------------------------------------- Updates – email and WhatsApp */
function updateParts() {
  const k = kpis(db, alloc, view.year, view.month), rows = activeMembers(db).map(m => memberRow(db, m, view.year, view.month)), name = db.settings.sacco_name || "SACCO", month = `${MONTHS_LONG[view.month - 1]} ${view.year}`;
  const subject = `${name} – update for ${month}`;
  const td = 'style="padding:4px 8px;border-bottom:1px solid #ddd"', tdn = 'style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right"';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222"><h2 style="color:#1f6f50;margin:0 0 8px">${esc(name)} – ${month}</h2>
  <table style="border-collapse:collapse"><tr><td ${td}>Total saved</td><td ${tdn}><b>${money(k.totalSaved)}</b></td></tr><tr><td ${td}>Saved this year</td><td ${tdn}>${money(k.yearSaved)}</td></tr>
  <tr><td ${td}>Fund value</td><td ${tdn}>${money(k.fundValue)}</td></tr><tr><td ${td}>Interest this year</td><td ${tdn}>${money(k.interestYear)}</td></tr><tr><td ${td}>Interest in ${MONTHS_LONG[view.month - 1]}</td><td ${tdn}>${money(k.interestLastMonth)}</td></tr></table>
  <h3 style="margin:14px 0 6px">Members against target</h3><table style="border-collapse:collapse"><tr><th ${td}>Member</th><th ${tdn}>Saved ${view.year}</th><th ${tdn}>Target to date</th><th ${td}>Status</th></tr>
  ${rows.map(r => `<tr><td ${td}>${esc(r.name)}</td><td ${tdn}>${nn(r.yearSavings)}</td><td ${tdn}>${nn(r.currentTarget)}</td><td ${td}>${esc(r.risk)}</td></tr>`).join("")}</table>
  ${asList(db.settings.highlights).length ? `<h3 style="margin:14px 0 6px">Highlights</h3><ul>${asList(db.settings.highlights).map(h => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
  <p style="color:#666;font-size:12px">Sent from KAM by the ${view.year} admin.</p></div>`;
  const text = `${name} – ${month}\n\nTotal saved: ${money(k.totalSaved)}\nSaved this year: ${money(k.yearSaved)}\nFund value: ${money(k.fundValue)}\nInterest this year: ${money(k.interestYear)}\n\n` + rows.map(r => `${r.name}: ${nn(r.yearSavings)} of ${nn(r.currentTarget)} (${r.risk})`).join("\n");
  const wa = `*${name} – ${month}*\nTotal saved: ${money(k.totalSaved)}\nFund value: ${money(k.fundValue)}\nInterest in ${MONTHS_LONG[view.month - 1]}: ${money(k.interestLastMonth)}\nFull update sent by email.`;
  return { subject, html, text, wa, emails: activeMembers(db).map(m => m.email).filter(Boolean) };
}
function pageUpdates() {
  const u = updateParts(), missing = activeMembers(db).filter(m => !m.email);
  const mailto = `mailto:?bcc=${encodeURIComponent(u.emails.join(","))}&subject=${encodeURIComponent(u.subject)}&body=${encodeURIComponent("(Paste the copied update here.)")}`;
  return `<h1>Updates</h1>
  <p>1. <b>Copy the update</b> · 2. <b>Open the email</b> (all members in BCC) and paste · 3. Post the short version in the WhatsApp group · 4. <b>Mark as sent</b>.</p>
  <div class="row noprint"><button class="primary" id="copyMail" title="Copy the formatted update – paste it into the email">1 · Copy the update</button>
  <a class="btn" href="${mailto}" title="Opens your email program with every member's address in BCC">2 · Open the email</a>
  <a class="btn" href="https://wa.me/?text=${encodeURIComponent(u.wa)}" target="_blank" rel="noopener" title="Opens WhatsApp with the short update – choose the group chat">3 · WhatsApp</a>
  <button id="markSent" title="Save a record that this update was sent">4 · Mark as sent</button></div>
  ${missing.length ? `<div class="banner warn small">No email address for: ${missing.map(m => esc(m.name)).join(", ")}. Add them under Members.</div>` : ""}
  <div class="card"><div class="muted small">Subject: ${esc(u.subject)}</div><hr>${u.html}</div>
  <h3>WhatsApp version</h3><pre class="card" style="white-space:pre-wrap">${esc(u.wa)}</pre>
  ${db.updates.length ? `<h2>Sent</h2>${tbl(["Date", "Subject", ["Recipients", "n"]], db.updates.map(x => tr([esc(x.date), esc(x.title), N(asList(x.recipients).length)])))}` : ""}`;
}

/* ---------------------------------------------------------------- About */
function pageAbout() {
  return `<h1>About KAM</h1>
  <div class="card"><p><b>KAM ${APP.version}</b> · ${APP.date}</p>
  <p>KAM runs the SACCO's records: members, savings, the fund and its interest, loans, projects, meetings, expenses and the year-end. Every figure is calculated from the payments recorded – nothing is typed into a total.</p>
  <p>The app is this one HTML file. The data is a separate folder of notes (Markdown files) – each year's admin receives both in the handover zip. The data never goes to GitHub.</p>
  <div class="row noprint"><button class="primary" data-tour="1" title="A short guided tour of the pages, on made-up data">Start the tour</button></div></div>
  <h2>Waiting to be built</h2><div class="card md">${mdToHtml(APP.waiting)}</div>
  <h2>The workbook analysis</h2><div class="card md">${mdToHtml(APP.analysis)}</div>
  <h2>What's new</h2><div class="card md">${mdToHtml(APP.changes)}</div>`;
}

/* ---------------------------------------------------------------- Settings */
function pageSettings() {
  const cs = checks(db, alloc), s = settingsNote();
  return `<h1>Settings</h1>
  <div class="card"><h2 style="margin-top:0">Data folder</h2><p>${store.demo ? "Demo data (in memory – nothing is saved)." : `Connected: <b>${esc(store.root ? store.root.name : "–")}</b> · ${store.notes.size} notes.`}</p>
  <div class="row"><button id="pickFolder" title="Choose the data folder to work in">Choose another data folder</button><button id="reload" title="Read the data folder again">Read again</button></div></div>
  <div class="card"><h2 style="margin-top:0">Getting started</h2><p>A guided tour of the pages on made-up data – for a new admin.</p><div class="row"><button data-tour="1" title="Start the tour">Start the tour</button></div></div>
  <div class="card"><h2 style="margin-top:0">AppDev</h2><p>The AppDev page explains the data model and how the app is built, and sends comments to the developer${devEmail() ? ` (${esc(devEmail())})` : ""}. It is <b>${appdevOn() ? "on" : "off"}</b>.</p>
  ${s ? `<div class="row"><button id="appdevToggle" title="Show or hide the AppDev page">${appdevOn() ? "Switch AppDev off" : "Switch AppDev on"}</button></div>` : ""}</div>
  <div class="card"><h2 style="margin-top:0">Handover</h2><p>At the end of the year, download the handover zip and send it to the next admin. It holds the whole data folder, this app (KAM.html) and a summary to check that everything arrived.</p>
  <div class="row"><button class="primary" id="handover" title="Download the data folder, the app and a summary as one zip">Download handover zip</button></div></div>
  <div class="card"><h2 style="margin-top:0">SACCO settings</h2>${s ? `<div class="form">${["sacco_name", "currency", "fund_name", "loan_rate", "loan_max_months", "default_fee", "registration_fee", "vision", "admin", "admin_year", "dev_email"].map(k => `<label>${esc(LABELS[k] || k)}</label><div>${esc(asText(s.props[k]))}</div>`).join("")}
    ${dataYears(db).concat(view.year + 1).filter((x, i, a) => a.indexOf(x) === i).map(y => `<label>Savings target ${y}</label><div>${money(s.props["target_" + y] || 0)}</div>`).join("")}</div>
    <div class="row"><button data-edit="${esc(s.path)}" title="Change the settings">Edit settings</button></div>` : `<p>This folder has no settings note yet.</p><button id="setup" class="primary" title="Create kam-settings.md and the folders">Set up this folder for KAM</button>`}</div>
  ${notesOf("report").map(r => `<div class="card"><h2 style="margin-top:0">${esc(r.props.title || r.name)}</h2><details><summary title="Show the report">Show</summary><div class="md">${mdToHtml(r.body)}</div></details></div>`).join("")}
  <div class="card"><h2 style="margin-top:0">Checks (${cs.length})</h2>${cs.length ? `<ul>${cs.map(c => `<li class="${c.level === "err" ? "bad" : c.level === "warn" ? "warn" : "muted"}">${esc(c.text)}</li>`).join("")}</ul>` : "<p>All fine.</p>"}
  ${store.errors.length ? `<h3>Notes that could not be read</h3><ul>${store.errors.map(e => `<li><b>${esc(e.path)}</b>: ${esc(e.why)}</li>`).join("")}</ul>` : ""}</div>`;
}
const asText = v => Array.isArray(v) ? v.join(", ") : (v ?? "");

const PAGES = { home: pageHome, members: pageMembers, member: pageMember, receipts: pageReceipts, interest: pageInterest, loans: pageLoans, projects: pageProjects, meetings: pageMeetings,
  expenses: pageExpenses, plans: pagePlans, yearend: pageYearend, updates: pageUpdates, appdev: () => appdevOn() ? pageAppdev() : pageHome(), about: pageAbout, settings: pageSettings, apply: () => loanApplication(db.loans.find(l => l.code === view.loan)) };

/* ---------------------------------------------------------------- a small Markdown renderer (headings, lists, tables, bold, code, links) */
function mdToHtml(md) {
  const inline = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = String(md || "").replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/); let out = "", i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^#{1,6} /.test(l)) { const n = l.match(/^#+/)[0].length; out += `<h${Math.min(6, n + 1)}>${inline(l.replace(/^#+ /, ""))}</h${Math.min(6, n + 1)}>`; i++; continue; }
    if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      out += `<div class="tablewrap"><table><thead><tr>${cells(l).map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>`; i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) { out += `<tr>${cells(lines[i]).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`; i++; }
      out += "</tbody></table></div>"; continue;
    }
    if (/^\s*([-*]|\d+\.) /.test(l)) {
      const ordered = /^\s*\d+\./.test(l); out += ordered ? "<ol>" : "<ul>";
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i])) { out += `<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.) (\[[ x]\] )?/, ""))}</li>`; i++; }
      out += ordered ? "</ol>" : "</ul>"; continue;
    }
    if (!l.trim()) { i++; continue; }
    let p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6} |\s*\||\s*([-*]|\d+\.) )/.test(lines[i])) p.push(lines[i++]);
    out += `<p>${inline(p.join(" "))}</p>`;
  }
  return out;
}
