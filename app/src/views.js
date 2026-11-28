/* KAM – the screens. Every figure is calculated from the notes (calc.js); nothing on screen is typed in by hand. */

const $ = id => document.getElementById(id);
let db = null, alloc = null;
const view = { tab: "home", year: 0, month: 0, member: "", loan: "", receiptsKind: "all", roundMonth: "", ganttStart: "", divYear: 0, divPool: "", sel: [], rcOpen: null, histQ: "", histMonth: "" };
const cur = () => (db && db.settings.currency) || "UGX";
/* Settings › How amounts are shown (1.4): numbers only (default), UGX, USh or 1,300,000/= */
const AMOUNT_MODES = [["numbers", "Numbers only – 1,300,000"], ["code", "With the currency code – UGX 1,300,000"], ["USh", "With USh – USh 1,300,000"], ["slash", "The Ugandan way – 1,300,000/="]];
const amountMode = () => { const m = String((db && db.settings.amount_display) || "numbers"); return AMOUNT_MODES.some(x => x[0] === m) ? m : "numbers"; };
const money = v => { const n = fmtN(v); switch (amountMode()) { case "code": return `${cur()} ${n}`; case "USh": return `USh ${n}`; case "slash": return `${n}/=`; default: return n; } };
const amountNote = () => amountMode() === "numbers" ? `All amounts in ${cur()}` : "";
const nn = v => fmtN(v);
const repMonthKey = () => monthKey(view.year, view.month);
const memberByCode = c => db.members.find(m => m.code === c);
const mName = c => { const m = memberByCode(c); return m ? m.name : c || "–"; };
/* name first, the code after it as a small pill (1.4) */
const codePill = (code, what = "Member code") => code ? `<span class="code" title="${esc(what)}">${esc(code)}</span>` : "";
const nameCode = (name, code, what) => `${esc(name)}${code ? " " + codePill(code, what) : ""}`;
const memberCell = c => { const m = memberByCode(c); return m ? `<button class="lnk plain" data-member="${esc(c)}" title="Show ${esc(m.name)}">${esc(m.name)}</button> ${codePill(c)}` : esc(c || "–"); };
/* short names for charts and pills (1.4): the member's short_name, else the first word of the name; the surname's initial when two match */
function shortNames() {
  const base = db.members.map(m => [m.code, String(m.short_name || String(m.name).trim().split(/\s+/)[0] || m.code).trim()]);
  const count = {}; for (const [, sh] of base) count[sh.toLowerCase()] = (count[sh.toLowerCase()] || 0) + 1;
  return new Map(base.map(([c, sh]) => { if (count[sh.toLowerCase()] < 2) return [c, sh]; const last = String(memberByCode(c).name).trim().split(/\s+/).reverse().find(w => w.toLowerCase() !== sh.toLowerCase()); return [c, last ? `${sh} ${last[0]}.` : `${sh} ${c}`]; }));
}
const sName = c => shortNames().get(c) || c;
const projectByCode = c => db.projects.find(p => String(p.code) === String(c));
const projectRef = p => `<button class="lnk plain" data-edit="${esc(p.note.path)}" title="Open the project">${esc(p.title)}</button> ${codePill(p.code, "Project code")}`;
const mLink = c => `[[${c}${memberByCode(c) ? " " + memberByCode(c).name : ""}]]`;
const pillFor = r => `<span class="tag ${r === "On Track" || r === "Saved" || r === "Above" || r === "repaid" ? "ok" : r === "Watch" || r === "Partial" || r === "Stable" || r === "active" ? "warn" : "bad"}">${esc(r)}</span>`;
/* the menu: [id, name, group, short line under the name] – grouped as in Horizons */
const TABS = [["home", "Home", ""], ["members", "Members", ""], ["receipts", "Receipts", "", "Every payment"],
  ["interest", "Fund & interest", "Money", "How interest is shared"], ["loans", "Loans", "Money"], ["expenses", "Expenses", "Money"],
  ["projects", "Projects", "Group"], ["meetings", "Meetings", "Group"], ["plans", "Plans", "Group"],
  ["updates", "Updates", "Reporting", "Email and WhatsApp"], ["yearend", "Year-end", "Reporting", "Dividends, cash count"],
  ["history", "History", "Housekeeping", "Who changed what"], ["appdev", "AppDev", "Housekeeping", "For the developer"], ["settings", "Settings", "Housekeeping"], ["about", "About", "Housekeeping"]];
const NAV_ICON = {"home": "<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.5\"/>", "members": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6\"/><path d=\"M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.8 3.5 5.7\"/>", "receipts": "<path d=\"M6 3h12v18l-3-2-3 2-3-2-3 2z\"/><path d=\"M9 8h6M9 12h6M9 16h3\"/>", "interest": "<path d=\"m3 17 6-6 4 4 8-8\"/><path d=\"M15 7h6v6\"/>", "loans": "<rect x=\"2.5\" y=\"6\" width=\"19\" height=\"12\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2.8\"/><path d=\"M6 9.5v5M18 9.5v5\"/>", "expenses": "<path d=\"M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11\"/><path d=\"M16 13.5h.1\"/>", "projects": "<rect x=\"3.5\" y=\"6\" width=\"17\" height=\"13\" rx=\"2\"/><path d=\"M8.5 6V4.5h7V6M3.5 11.5h17\"/>", "meetings": "<path d=\"M4 5h12v8H9l-4 3v-3H4z\"/><path d=\"M16 9h4v8h-1v3l-4-3h-4v-2\"/>", "plans": "<path d=\"M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z\"/><path d=\"M14 3v5h5M8.5 13h7M8.5 17h5\"/>", "updates": "<rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"m3.5 7 8.5 6 8.5-6\"/>", "yearend": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15\" rx=\"2\"/><path d=\"M4 9.5h16M8.5 3v4M15.5 3v4\"/><path d=\"m9 15 2 2 4-4\"/>", "appdev": "<path d=\"m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1\"/>", "about": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5.5M12 7.6v.1\"/>", "toggle": "<path d=\"m14.5 6-6 6 6 6\"/>", "history": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>"};
const navIcon = id => `<svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICON[id] || ""}</svg>`;
const navMini = () => { try { return localStorage.getItem("kam-nav") === "mini"; } catch { return false; } };
const TAB_HELP = { home: "The group dashboard", members: "Members, contacts, statements and targets", receipts: "Every payment by member and month", interest: "The fund and how its interest is shared",
  loans: "Loans, repayments and the loan application", projects: "Objectives, projects and the project tracker", meetings: "Agenda, committee and meetings",
  expenses: "Funding sources and expenses", plans: "The SACCO's plans", yearend: "Dividends, share-out and the cash count", updates: "Email and WhatsApp updates to the members", appdev: "For the admin: the data model, how the app is built, and comments for the developer",
  history: "Every change saved – who, what and when", about: "What KAM is, how it is built, the workbook analysis and what is coming", settings: "Data folder, settings and the yearly handover" };

function status(msg, kind = "ok") { const b = document.createElement("div"); b.className = `banner ${kind}`; b.innerHTML = msg; $("main").prepend(b); if (kind === "ok") setTimeout(() => b.remove(), 6000); }
async function guarded(fn) { try { return await fn(); } catch (e) { if (e instanceof ConflictError) status("Someone changed this note on disk since it was read. It has been read again – please make your change once more.", "warn"); else status(esc(e.message || e), "err"); console.error(e); } }

/* ---------------------------------------------------------------- data */
function refreshDb() {
  const s = settingsNote();
  db = buildDb(liveNotes(), s ? s.props : {});
  MONEY_FMT = money;
  alloc = allocateInterest(db);
  const last = lastDataMonth(db);
  if (!view.year) { view.year = Number(last.slice(0, 4)); view.month = Number(last.slice(5, 7)); }
  if (!view.divYear) view.divYear = view.year;
  $("sacco").textContent = db.settings.sacco_name || db.settings.title || "";
  folderChip();
  fillPeriod();
}
/* the data folder on the right of the top bar, as the vault in Horizons */
function folderChip() {
  const c = $("folderChip"), n = liveNotes().length, t = store.readAt ? `${pad2(store.readAt.getHours())}:${pad2(store.readAt.getMinutes())}` : "";
  c.hidden = false; $("refreshBtn").hidden = store.demo;
  c.innerHTML = store.demo ? `<b class="demochip">Demo data</b> · ${n} notes · nothing is saved · <button class="lnk" id="leaveDemo" title="Leave the demo – back to the start page">Leave the demo</button>`
    : `<button class="lnk plain" id="chipPick" title="The data folder KAM is working in – click to choose another"><b>${esc(store.root ? store.root.name : "")}</b></button> · ${n} notes · read ${t}`;
  if ($("leaveDemo")) $("leaveDemo").onclick = () => location.reload();
  if ($("chipPick")) $("chipPick").onclick = () => pickFolder();
}
function fillPeriod() {
  const years = [...new Set([...dataYears(db), new Date().getFullYear(), view.year])].sort();
  $("repYear").innerHTML = years.map(y => `<option ${y === view.year ? "selected" : ""}>${y}</option>`).join("");
  $("repMonth").innerHTML = MONTHS_LONG.map((m, i) => `<option value="${i + 1}" ${i + 1 === view.month ? "selected" : ""}>${m}</option>`).join("");
  $("period").hidden = false;
}

/* ---------------------------------------------------------------- shell */
function renderTabs() {
  $("tabs").hidden = false; $("frame").classList.remove("nomenu"); $("frame").classList.toggle("mini", navMini());
  const nf = followUps().length; let grp = "";
  $("tabs").innerHTML = TABS.filter(([id]) => id !== "appdev" || appdevOn()).map(([id, label, g, sub]) => {
    const head = g && g !== grp ? `<div class="navgrp" title="${esc(g)}"><span>${esc(g)}</span></div>` : ""; grp = g;
    const on = view.tab === id || (view.tab === "apply" && id === "loans");
    return `${head}<button data-tab="${id}" class="${on ? "on" : ""}" ${on ? 'aria-current="page"' : ""} title="${esc(label)}: ${esc(TAB_HELP[id])}">${navIcon(id)}<span class="nl">${esc(label)}</span>${id === "home" && nf ? `<span class="pill" title="Things to follow up">${nf}</span>` : ""}${sub ? `<span class="nsub">${esc(sub)}</span>` : ""}</button>`;
  }).join("") + `<button id="navToggle" title="Make the menu narrow (icons only) or wide again – remembered on this computer">${navIcon("toggle")}<span class="nl">${navMini() ? "Wide menu" : "Narrow menu"}</span></button>`;
  placeNav();
}
/* keep the menu pinned below the header; if the window is too short for it, let it scroll with the page so the last item is reachable */
function placeNav() {
  const nav = $("tabs"), hd = document.querySelector("header"); if (!nav || nav.hidden) return;
  const top = hd.offsetHeight + 10, room = window.innerHeight - nav.offsetHeight - 10;
  document.documentElement.style.setProperty("--navTop", `${Math.min(top, room)}px`);
}
window.addEventListener("resize", () => placeNav());
function go(tab, extra = {}) { if (tab === "member") { tab = "members"; extra = { sel: [extra.member || view.member] }; } Object.assign(view, { tab }, extra); render(); window.scrollTo(0, 0); }
function render() {
  if (!db) return;
  renderTabs();
  const f = PAGES[view.tab] || PAGES.home;
  $("main").innerHTML = structureBanner() + testLine() + f();
  const h1 = $("main").querySelector("h1"), an = amountNote();
  if (h1 && an && !["about", "appdev", "history", "settings", "plans", "meetings"].includes(view.tab)) h1.insertAdjacentHTML("afterend", `<p class="muted small amtnote">${esc(an)}</p>`);
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
  const homeW = Math.max(chartWidth(ya.length, 2), chartWidth(qa.length, 2)); // the pair side by side get the same height
  return `<h1>Dashboard · ${MONTHS_LONG[view.month - 1]} ${view.year}</h1>
  <div class="row noprint"><button class="primary" id="presentBtn" title="Show the financial position as full-screen slides – for the monthly meeting (arrow keys to move, Esc to stop)">▶ Present</button></div>${followUpSection()}
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
    <div>${barChart({ width: homeW, title: "Actual vs target by year", labels: ya.map(x => String(x.year)), bars: [{ name: "Actual", values: ya.map(x => x.actual) }, { name: "Target", values: ya.map(x => x.target) }] })}</div>
    <div>${barChart({ width: homeW, title: `Savings vs target by quarter, ${view.year} (cumulative)`, labels: qa.map(x => x.label.slice(5)), bars: [{ name: "Actual", values: qa.map(x => x.actual) }, { name: "Target", values: qa.map(x => x.target) }] })}</div>
  </div>
  <div class="card">${barChart({ title: `Interest earned by month, ${view.year}`, labels: MONTHS, bars: [{ name: "Fund interest", values: fm }] })}</div>
  <h2>Objectives</h2>
  ${objectiveTable(projYears)}
  ${asList(db.settings.highlights).length ? `<h2>Last month's highlights</h2><ol>${asList(db.settings.highlights).map(h => `<li>${esc(h)}</li>`).join("")}</ol>` : ""}
  <h2>Current projects and activities</h2>${projectTable(db.projects)}
  <h2>Members against target</h2>
  <p class="muted small">Target to date = monthly target × ${view.month} month${view.month > 1 ? "s" : ""}. Consistency counts the months with a savings payment, January–${MONTHS_LONG[view.month - 1]}.</p>
  ${memberTable(rows)}`;
}
const kp = (label, v, t) => `<div class="kpi" title="${esc(t)}"><span>${esc(label)}</span><b>${v}</b></div>`;
function memberTable(rows) {
  const tot = k => rows.reduce((s, r) => s + r[k], 0);
  return tbl(["Member", ["Registration", "n"], [`${view.year} savings`, "n"], ["Total savings", "n"], ["Loan", "n"], ["Monthly target", "n"], ["Target to date", "n"], ["Annual target", "n"], ["Gap", "n"], "Consistency", "Gap insight", ["Months paid", "n"], "Momentum", "Risk flag", ...MONTHS.map(m => [m, "n"])],
    [...rows.map(r => tr([memberCell(r.code), N(r.registration), N(r.yearSavings), N(r.totalSavings), N(r.loan), N(r.monthlyTarget), N(r.currentTarget), N(r.annualTarget),
      { v: nn(r.gap), c: "n " + (r.gap > 0 ? "bad" : "ok") }, pillFor(r.consistency), esc(r.insight), N(r.paidMonths), pillFor(r.momentum), pillFor(r.risk), ...r.monthly.map(v => N(v))])),
    tr(["Total", N(tot("registration")), N(tot("yearSavings")), N(tot("totalSavings")), N(tot("loan")), "", N(tot("currentTarget")), N(tot("annualTarget")), N(tot("gap")), "", "", "", "", "", ...MONTHS.map((_, i) => N(rows.reduce((s, r) => s + r.monthly[i], 0)))], "tot")]);
}
function projectTable(list) {
  return tbl(["Project / activity", "Objective", "Comment", "Committee", ["Cost", "n"], "Progress", "Start", "End", ""], list.map(p => { const o = db.objectives.find(x => x.code === linkName(p.objective));
    return tr([nameCode(p.title, p.code, "Project code"), o ? nameCode(o.title, o.code, "Objective code") : esc(linkName(p.objective)), esc(p.comment), esc(p.committee), N(p.cost),
    `<progress max="100" value="${num(p.progress)}" title="${num(p.progress)}%"></progress> ${num(p.progress)}%`, esc(p.start), esc(p.end), `<button class="lnk" data-edit="${esc(p.note.path)}" title="Edit this project">Edit</button>`]); }));
}
/* objectives with their projects by name (code as a pill), one per line, clickable */
function objectiveTable(years) {
  const refs = list => list.map(p => `<div>${projectRef(p)}</div>`).join("");
  return tbl(["Objective", "Measure", ...(years ? years.map(y => `${y} projects`) : ["Projects"]), ""], db.objectives.map(o => { const mine = db.projects.filter(p => linkName(p.objective) === o.code);
    return tr([nameCode(o.title, o.code, "Objective code"), esc(o.measure), ...(years ? years.map(y => refs(mine.filter(p => String(p.start).startsWith(y)))) : [refs(mine)]), `<button class="lnk" data-edit="${esc(o.note.path)}" title="Edit this objective">Edit</button>`]); }));
}

/* ---------------------------------------------------------------- Members – pills: none = everyone, one = that member, several = side by side (1.4) */
function memberPills() {
  const out = m => /^(left|prospective)$/i.test(m.status || ""), act = db.members.filter(m => !out(m)), other = db.members.filter(out);
  return `<div class="chips noprint" id="mpills"><button data-sel="" aria-pressed="${!view.sel.length}" title="Show every member">All members (${act.length})</button>${[...act, ...other].map(m =>
    `<button data-sel="${esc(m.code)}" aria-pressed="${view.sel.includes(m.code)}" class="${out(m) ? "dim" : ""}" title="${esc(m.name)} ${esc(m.code)}${out(m) ? " – " + esc(m.status) : ""}. Click to add or remove">${esc(sName(m.code))}</button>`).join("")}</div>`;
}
const selected = () => view.sel.filter(c => memberByCode(c));
function pageMembers() {
  const sel = selected();
  const head = `<h1>Members</h1>${memberPills()}<div class="row noprint"><button data-new="member" title="Add a new member">+ New member</button>${sel.length === 1 ? `<button data-edit="${esc(memberByCode(sel[0]).note.path)}" title="Edit this member's details">Edit</button><button data-pay="${esc(sel[0])}" class="primary" title="Record a payment from this member">+ Payment</button><button id="pdfMember" title="A clean A4 version of this statement – choose Save as PDF in the print window">Save as PDF</button>` : ""}</div>`;
  if (sel.length === 1) return head + memberView(sel[0]);
  const list = sel.length ? sel.map(memberByCode) : activeMembers(db);
  const rows = list.map(m => memberRow(db, m, view.year, view.month));
  const labels = rows.map(r => sName(r.code)), tips = rows.map(r => `${r.name} (${r.code})`);
  const memW = chartWidth(labels.length, 3); // both charts the same width, so the same height
  return head + `${sel.length > 1 ? `<h2>Side by side</h2><div class="cmp">${rows.map(r => { const st = statement(db, alloc, r.code, view.year); return `<div class="card"><b>${memberCell(r.code)}</b><div class="kpis small">${kp(`${view.year} savings`, money(r.yearSavings), "")}${kp("Target to date", money(r.currentTarget), "")}${kp("Gap", money(r.gap), r.insight)}${kp("Risk flag", pillFor(r.risk), "")}${kp("Fund balance", money(st.fundBalance), "")}${kp("Loan outstanding", money(st.outstanding), "")}</div></div>`; }).join("")}</div>` : ""}
  <div class="grid2">
    <div>${barChart({ width: memW, title: "Total contributions per member", labels, tips, bars: [{ name: "Registration", values: rows.map(r => r.registration) }, { name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }, { name: "Total savings", values: rows.map(r => r.totalSavings) }], rotate: true })}</div>
    <div>${barChart({ width: memW, title: "Monthly savings and targets", labels, tips, bars: [{ name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }], lines: [{ name: "Target to date", values: rows.map(r => r.currentTarget) }, { name: "Annual target", values: rows.map(r => r.annualTarget) }], rotate: true })}</div>
  </div>
  <h2>Statements ${view.year} (STT)</h2>
  ${tbl(["Member", ["Accumulated savings", "n"], ["Membership", "n"], ["Loan interest received", "n"], ["Loan repayment", "n"], [`Borrowing ${view.year}`, "n"], [`Loan paid ${view.year}`, "n"], ["Loan outstanding", "n"]],
    list.map(m => { const st = statement(db, alloc, m.code, view.year); return tr([memberCell(m.code), N(st.savings), N(st.membership), N(st.loanInterest), N(st.loanRepayment), N(st.borrowingYear), N(st.repaidYear), N(st.outstanding)]); }))}
  <p class="muted small">Accumulated savings at the end of ${view.year}; membership, loan interest and repayment are all-time totals, as in the workbook.</p>
  <h2>Contacts and time zones</h2>
  ${tbl(["Member", "Status", "Role", "Country", "City", "Time zone", "Local time now", "Email", "Phone", ""], (sel.length ? list : db.members).map(m => tr([memberCell(m.code), esc(m.status), esc(m.role), esc(m.country), esc(m.city), esc(m.timezone), localTime(m.timezone),
    m.email ? `<a href="mailto:${esc(m.email)}" title="Write to ${esc(m.name)}">${esc(m.email)}</a>` : `<span class="muted">–</span>`, esc(m.phone), `<button class="lnk" data-edit="${esc(m.note.path)}" title="Edit this member">Edit</button>`])))}
  ${sel.length ? "" : `<h2>Committee</h2>${committeeTable()}`}`;
}
function localTime(tz) { if (!tz) return ""; try { return new Date().toLocaleString("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" }) + ` <span class="muted small">(UTC${utcOffset(tz)})</span>`; } catch { return `<span class="muted small">unknown zone</span>`; } }
function utcOffset(tz) { try { const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find(x => x.type === "timeZoneName"); return (p ? p.value : "").replace("GMT", "") || "+0"; } catch { return ""; } }
const committeeTable = () => tbl(["Role", "Member"], db.members.filter(m => m.role).map(m => tr([esc(m.role), memberCell(m.code)])));

/* one member's view, under the pills on Members (was its own page before 1.4) */
function memberView(code) {
  const m = memberByCode(code);
  const r = memberRow(db, m, view.year, view.month), s = statement(db, alloc, m.code, view.year);
  const months = Array.from({ length: 12 }, (_, i) => monthKey(view.year, i + 1));
  const myTx = db.tx.filter(t => t.member === m.code).slice().reverse();
  const loans = db.loans.filter(l => l.member === m.code);
  return `<div id="memberView"><h2>${esc(m.name)} ${codePill(m.code)}</h2>
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
  <h2>All payments</h2>${tbl(["Date", "Kind", ["Amount", "n"], "Reference", ""], myTx.map(t => tr([esc(t.date), esc(KINDS[t.kind] || t.kind), N(t.amount), esc(t.ref), `<span class="noprint"><button class="lnk" data-receipt="${esc(t.note.path)}" title="Send ${esc(m.name)} a receipt for this payment">Receipt</button> · <button class="lnk" data-edit="${esc(t.note.path)}" title="Correct or delete this payment">Edit</button></span>`])))}</div>`;
}

/* ---------------------------------------------------------------- Receipts – the core ledger */
const RC_KINDS = ["savings", "membership", "welfare", "penalty", "loan_interest", "loan_repayment"];
/* one member's rows for a year: [{ label, bf, vals[12], year, total, cls }] – used by the page and the Excel export */
function receiptRows(code, y) {
  const months = Array.from({ length: 12 }, (_, i) => monthKey(y, i + 1)), prevEnd = monthKey(y - 1, 12), sum = a => a.reduce((x, z) => x + z, 0), out = [];
  for (const k of RC_KINDS) {
    const vals = months.map(mk => k === "savings" ? savingsIn(db, code, y, mk) : kindSum(db, code, k, y, mk));
    const bf = k === "savings" ? savingsBalance(db, code, prevEnd) : db.tx.filter(t => t.member === code && t.kind === k && t.year < y).reduce((a, t) => a + t.amount, 0);
    out.push({ label: KINDS[k], kind: k, bf, vals, year: sum(vals), total: bf + sum(vals) });
  }
  const iv = months.map(mk => interestOf(alloc, code, null, mk)), ibf = [...alloc.byMonth].filter(([mk]) => mk <= prevEnd).reduce((a, [, sh]) => a + (sh.get(code) || 0), 0);
  out.push({ label: "Interest earned", kind: "interest", bf: ibf, vals: iv, year: sum(iv), total: ibf + sum(iv) });
  out.push({ label: "Sub total (savings + interest)", kind: "subtotal", bf: fundBalance(db, alloc, code, prevEnd), vals: months.map(mk => fundBalance(db, alloc, code, mk)), year: null, total: fundBalance(db, alloc, code, monthKey(y, 12)), cls: "tot" });
  return out;
}
const rcRow = (r, cls = "") => tr([r.label, N(r.bf, "Brought forward from earlier years"), ...r.vals.map(v => N(v)), r.year === null ? "" : N(r.year), N(r.total)], `${cls} ${r.cls || ""}`);
const rcRemembered = () => { try { return localStorage.getItem("kam-rc") === "open"; } catch { return false; } };
function pageReceipts() {
  if (view.receiptsKind === "round") return pageRound();
  const y = view.year, months = Array.from({ length: 12 }, (_, i) => monthKey(y, i + 1)), sel = selected();
  const list = sel.length ? sel.map(memberByCode) : activeMembers(db);
  if (!view.rcOpen) view.rcOpen = new Set(rcRemembered() ? list.map(m => m.code) : []);
  const closed = closedMonths(), mHead = MONTHS.map((x, i) => [closed.has(months[i]) ? `${x} ${LOCK}` : x, "n"]);
  const head = `<thead><tr><th></th><th class="n">B/F</th>${mHead.map(([h, c]) => `<th class="${c}" ${h.includes("<svg") ? 'title="This month is closed"' : ""}>${h}</th>`).join("")}<th class="n">${y} total</th><th class="n">Total</th></tr></thead>`;
  const blocks = list.map(m => {
    const rows = receiptRows(m.code, y), open = sel.length > 0 || view.rcOpen.has(m.code);
    const sav = rows[0].year, coll = rows.slice(0, 6).reduce((a, r) => a + r.year, 0), fb = rows.at(-1).total;
    const summary = `<tr class="mhead" data-rc="${esc(m.code)}"><td colspan="16">${sel.length ? "" : `<button class="lnk plain rctog noprint" data-rctoggle="${esc(m.code)}" aria-expanded="${open}" title="${open ? "Fold" : "Open"} ${esc(m.name)}'s rows">${open ? "▾" : "▸"}</button> `}<b>${esc(m.name)}</b> ${codePill(m.code)}
      <span class="muted small rcsum">· savings ${y}: ${money(sav)} · collections ${y}: ${money(coll)} · fund balance end of ${y}: ${money(fb)}</span></td></tr>`;
    return `<tbody class="rcblock">${summary}${open ? rows.map(r => rcRow(r)).join("") : ""}</tbody>`;
  });
  let tail = "";
  if (sel.length > 1) {   /* the selected members added up */
    const all = sel.map(c => receiptRows(c, y)), add = (i, f) => all.reduce((a, rows) => a + f(rows[i]), 0);
    tail = `<tbody><tr><td colspan="16"><h3>Selected members – total</h3></td></tr>${all[0].map((r, i) => rcRow({ label: r.label, bf: add(i, x => x.bf), vals: r.vals.map((_, k) => add(i, x => x.vals[k])), year: r.year === null ? null : add(i, x => x.year), total: add(i, x => x.total), cls: r.cls })).join("")}</tbody>`;
  } else if (!sel.length) {
    const rs = receiptSummary(db, y), fr = fundRows(db);
    const sumRow = (label, vals, cls) => tr([label, "", ...vals.map(v => N(v)), N(vals.reduce((a, b) => a + b, 0)), ""], cls);
    const fv = key => months.map(mk => { const f = fr.find(x => x.month === mk && !x.opening); return f ? f[key] : 0; });
    const runEnd = mk => (fr.filter(f => f.month <= mk).at(-1) || { running: 0 }).running;
    tail = `<tbody id="rcTotals"><tr><td colspan="16"><h3>Receipt summary</h3></td></tr>${[
      sumRow("Total savings", rs.rows.savings), sumRow("Total membership fee / sub", rs.rows.membership), sumRow("Total welfare fund", rs.rows.welfare), sumRow("Total penalties", rs.rows.penalty),
      sumRow("Loan interest received", rs.rows.loan_interest), sumRow("Total loan repayment", rs.rows.loan_repayment), sumRow("Return on investment", rs.rows.investment_return), sumRow("Other income", rs.rows.other_income),
      sumRow("Total collections", rs.rows.total, "tot")].join("")}
      <tr><td colspan="16"><h3>${esc(db.settings.fund_name || "Fund")} (UAP)</h3></td></tr>${[
      sumRow("Fund deposits", fv("deposits")), sumRow("Fund withdrawals", fv("withdrawals")), sumRow("Fund interest", fv("interest")), sumRow("Fund monthly total", fv("total"), "sub"),
      tr(["Fund running total", "", ...months.map(mk => N(runEnd(mk))), "", ""], "tot"),
      tr(["Cash at hand (calculated)", "", ...months.map(mk => N(cashAtHand(db, mk), "Received − put in the fund − loans paid out − expenses − savings paid back")), "", ""])].join("")}</tbody>`;
  }
  const lastFull = addMonths(monthKey(new Date().getFullYear(), new Date().getMonth() + 1), -1);
  return `<h1>Receipts ${y}</h1>${memberPills()}${checksBanner()}
  <div class="row noprint"><button class="primary" data-pay="" title="Record one payment">+ Payment</button><button data-round="1" title="Enter every member's payments for one month in one table">Monthly round</button>
  ${sel.length ? "" : `<button id="rcToggle" title="Open or fold every member's rows – remembered on this computer">${view.rcOpen.size >= list.length ? "Collapse all" : "Expand all"}</button>`}
  <button id="closeMonth" data-close="${closed.has(lastFull) ? "" : lastFull}" title="Mark a month as checked against the bank, mobile money and fund statements">${closed.has(lastFull) ? `${LOCK} ${MONTHS_LONG[Number(lastFull.slice(5)) - 1]} is closed` : `Close ${MONTHS_LONG[Number(lastFull.slice(5)) - 1]} ${lastFull.slice(0, 4)}`}</button>
  <button onclick="print()" title="Print what is on screen">Print</button></div>
  <div class="tablewrap"><table class="rctable">${head}${blocks.join("")}${tail}</table></div>
  <p class="muted small">Every figure is added up from the payments. The interest row is the app's calculation (see Fund &amp; interest).${sel.length ? " Group totals show when All members is selected." : " Cash at hand = money received − put in the fund − loans paid out − expenses − savings paid back."}</p>`;
}
const LOCK = `<svg class="lock" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-label="closed"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
function pageRound() {
  const mk = view.roundMonth || monthKey(new Date().getFullYear(), new Date().getMonth() + 1);
  const cols = ["savings", "membership", "welfare", "penalty", "loan_repayment", "loan_interest"];
  return `<div class="row noprint"><button data-roundback="1" title="Back to the receipts">← Receipts</button></div><h1>Monthly round</h1>
  <p>Enter what each member paid in one month. Empty fields are skipped. Already recorded amounts are shown in grey.</p>
  <div class="row"><label for="roundMonth">Month</label><input type="month" id="roundMonth" value="${mk}" title="The month the payments belong to"><label for="roundDate">Payment date</label><input type="date" id="roundDate" value="${mk}-01" title="The date written on each payment"></div>
  ${tbl(["Member", ...cols.map(k => [KINDS[k], "n"])], activeMembers(db).map(m => tr([nameCode(m.name, m.code), ...cols.map(k => { const had = kindSum(db, m.code, k, null, mk);
    return { v: `<input type="number" min="0" step="1" class="rin" data-m="${esc(m.code)}" data-k="${k}" style="width:110px" title="${esc(KINDS[k])} from ${esc(m.name)}">${had ? `<div class="muted small">already ${nn(had)}</div>` : ""}`, c: "n" }; })])))}
  <div class="row"><button class="primary" id="roundSave" title="Save every amount entered as its own payment note">Save the round</button></div>`;
}

/* ---------------------------------------------------------------- Fund & interest */
function pageInterest() {
  const fr = fundRows(db), years = dataYears(db);
  const wbYears = [...new Set(db.members.flatMap(m => Object.keys(m).filter(k => /^workbook_interest_\d{4}$/.test(k)).map(k => Number(k.slice(-4)))))].sort();
  const cmpYears = wbYears.length ? wbYears : years;
  const rows = db.members.map(m => tr([memberCell(m.code), ...cmpYears.flatMap(y => { const w = num(m[`workbook_interest_${y}`]), a = interestOf(alloc, m.code, y), d = a - w;
    return [N(w), N(a), { v: nn(d), c: "n diff " + (Math.abs(d) > 1 ? "bad" : "") }]; })]));
  const totals = tr(["Total", ...cmpYears.flatMap(y => { const w = db.members.reduce((s, m) => s + num(m[`workbook_interest_${y}`]), 0), a = db.members.reduce((s, m) => s + interestOf(alloc, m.code, y), 0); return [N(w), N(a), N(a - w)]; })], "tot");
  const fundInterest = y => db.fund.filter(f => !f.opening && Number(f.month.slice(0, 4)) === y).reduce((s, f) => s + f.interest, 0);
  return `<h1>Fund &amp; interest</h1>${checksBanner()}
  <div class="card"><b>How interest is shared:</b> each month's fund interest is shared in proportion to each member's balance at the start of that month – savings paid in before the month, less withdrawals, plus interest already shared. Payments made during a month count from the next month. Shares are whole shillings and always add up exactly to the fund's interest. <span class="muted">(Default until the group decides – see About.)</span></div>
  <h2>Interest per member – workbook vs recalculated</h2>
  <p class="muted small">"Workbook" is the figure the spreadsheet showed (kept on each member note). "App" is the recalculation from the payments and the fund's actual interest.</p>
  ${tbl(["Member", ...cmpYears.flatMap(y => [[`${y} workbook`, "n"], [`${y} app`, "n"], [`${y} difference`, "n"]])], [...rows, totals])}
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
  return tbl(["Member and loan", "Guarantor", "Paid out", ["Amount", "n"], ["Repaid", "n"], ["Outstanding", "n"], ["Interest charged", "n"], ["Interest paid", "n"], ["Interest due", "n"], "Due by", "Status", ""],
    loans.map(l => { const s = loanState(db, l, asOf); return tr([`${esc(mName(l.member))} ${codePill(l.code, "Loan code")}`, l.guarantor ? nameCode(mName(l.guarantor), l.guarantor) : `<span class="muted">–</span>`, esc(l.paid_out || "–"), N(l.amount), N(s.repaid), N(s.outstanding), N(s.interestCharged), N(s.interestPaid),
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
  ${holders.length ? tbl(["Member", ...years.flatMap(y => [[`${y} borrowing`, "n"], [`${y} repayment`, "n"], [`Outstanding end ${y}`, "n"]])], holders.map(m => tr([memberCell(m.code), ...years.flatMap(y => { const ly = loanYear(db, m.code, y); return [N(ly.borrowing), N(ly.repayment), N(ly.outstanding)]; })]))) : `<p class="muted">No loans yet.</p>`}`;
}
function pageLoan() {
  const l = db.loans.find(x => x.code === view.loan); if (!l) { view.loan = ""; return pageLoans(); }
  const s = loanState(db, l, repMonthKey()), sch = loanSchedule(l.amount, l.rate, l.months, String(l.paid_out || l.applied || todayISO()).slice(0, 7));
  const pays = db.tx.filter(t => t.loan === l.code && (t.kind === "loan_repayment" || t.kind === "loan_interest"));
  return `<div class="row noprint"><button data-loanback="1" title="Back to all loans">← Loans</button><button data-edit="${esc(l.note.path)}" title="Edit the loan: approval, payout, terms">Edit</button>
  <button class="primary" data-pay="${esc(l.member)}" data-paykind="loan_repayment" data-payloan="${esc(l.code)}" title="Record a repayment on this loan">+ Repayment</button><button data-apply="${esc(l.code)}" title="Print the loan application form for signing">Loan application form</button></div>
  <h1>${esc(mName(l.member))} ${codePill(l.code, "Loan code")}</h1>
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
  <h2>Objectives</h2>${objectiveTable()}
  <h2>Projects and activities</h2>${projectTable(db.projects)}
  <h2>Project tracker</h2>
  <div class="row noprint"><label for="ganttStart">Show from</label><input type="date" id="ganttStart" value="${esc(view.ganttStart)}" title="The first week shown in the timeline"><span class="muted small">Total cost of projects: ${money(db.projects.reduce((s, p) => s + num(p.cost), 0))}</span></div>
  ${ganttChart(tasks, { weeks: 8, start: view.ganttStart || undefined })}
  ${tbl(["Phase", "Task", "Project", "Assigned to", "Progress", "Start", "End", ["Days", "n"], ""], tasks.map(t => { const pr = db.projects.find(p => p.note.name === linkName(t.project) || p.code === linkName(t.project)); return tr([esc(t.phase), esc(t.title), pr ? projectRef(pr) : esc(linkName(t.project)), t.owner ? memberCell(db.memberCode(t.owner)) : "", `${num(t.progress)}%`, esc(t.start), esc(t.end),
    N(t.start && t.end ? Math.round((Date.parse(t.end) - Date.parse(t.start)) / 864e5) + 1 : 0), `<button class="lnk" data-edit="${esc(t.note.path)}" title="Edit this task">Edit</button>`]); }))}`;
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
  <h2>Expenses</h2>${tbl(["#", "Activity / project", "Date", "Particulars", ["Amount", "n"], ["Running total", "n"], ""], ex.map((t, i) => { run += t.amount; const pr = db.projects.find(p => p.note.name === t.project || p.code === t.project); return tr([i + 1, pr ? projectRef(pr) : esc(t.project), esc(t.date), esc(t.ref), N(t.amount), N(run), `<button class="lnk" data-edit="${esc(t.note.path)}" title="Correct or delete">Edit</button>`]); }))}
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
  ${tbl(["#", "Name", ["Acc. savings", "n"], ["Borrowing outstanding", "n"], ["Dividend", "n"], ["Total (savings + dividend − borrowing)", "n"], "Signature"], [...rows.map((r, i) => tr([i + 1, nameCode(r.name, r.code), N(r.savings), N(r.borrowing), N(r.dividend), N(r.savings + r.dividend - r.borrowing), ""])),
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
  <p style="color:#666;font-size:12px">${amountNote() ? esc(amountNote()) + ". " : ""}Sent from KAM by the ${view.year} admin.</p></div>`;
  const text = `${name} – ${month}\n\nTotal saved: ${money(k.totalSaved)}\nSaved this year: ${money(k.yearSaved)}\nFund value: ${money(k.fundValue)}\nInterest this year: ${money(k.interestYear)}\n\n` + rows.map(r => `${r.name}: ${nn(r.yearSavings)} of ${nn(r.currentTarget)} (${r.risk})`).join("\n") + (amountNote() ? `\n\n${amountNote()}.` : "");
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
  <button id="markSent" title="Save a record that this update was sent">4 · Mark as sent</button>
  <button id="pdfUpdate" title="A clean A4 version of the update with charts – choose Save as PDF in the print window, then attach it to the email">Save as PDF</button></div>
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
  <h2>From the spreadsheet to KAM</h2><div class="card"><p>Every sheet of the old workbook and the page that replaces it. You now record only what happened – payments, fund statements, loans – and KAM calculates every total, statement and graph.</p>${sheetMapHtml("sheetMap")}</div>
  <h2>How KAM is built</h2><div class="card md">${mdToHtml(APP.structure)}</div>
  <h2>Waiting to be built</h2><div class="card md">${mdToHtml(APP.waiting)}</div>
  <h2>The workbook analysis</h2><div class="card md">${mdToHtml(APP.analysis)}</div>
  <h2 id="whatsNew">What's new</h2>${whatsNewHtml()}`;
}

/* ---------------------------------------------------------------- Settings */
function pageSettings() {
  const cs = checks(db, alloc), s = settingsNote();
  return `<h1>Settings</h1>
  <div class="card"><h2 style="margin-top:0">Data folder</h2><p>${store.demo ? "Demo data (in memory – nothing is saved)." : `Connected: <b>${esc(store.root ? store.root.name : "–")}</b> · ${store.notes.size} notes.`}</p>
  <div class="row"><button id="pickFolder" title="Choose the data folder to work in">Choose another data folder</button><button id="reload" title="Read the data folder again">Read again</button></div></div>
  ${testModeCard()}
  <div class="card"><h2 style="margin-top:0">Getting started</h2><p>A guided tour of the pages on made-up data – for a new admin.</p><div class="row"><button data-tour="1" title="Start the tour">Start the tour</button></div></div>
  <div class="card"><h2 style="margin-top:0">AppDev</h2><p>The AppDev page explains the data model and how the app is built, and sends comments to the developer${devEmail() ? ` (${esc(devEmail())})` : ""}. It is <b>${appdevOn() ? "on" : "off"}</b>.</p>
  ${s ? `<div class="row"><button id="appdevToggle" title="Show or hide the AppDev page">${appdevOn() ? "Switch AppDev off" : "Switch AppDev on"}</button></div>` : ""}</div>
  <div class="card"><h2 style="margin-top:0">How amounts are shown</h2><p>The data is all in one currency (${esc(cur())}), so amounts can be shown as plain numbers.</p>
  <div class="row">${s ? `<select id="amountMode" title="How amounts are written everywhere – pages, printouts, emails">${AMOUNT_MODES.map(([k, l]) => `<option value="${k}" ${amountMode() === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : ""}</div></div>
  <div class="card"><h2 style="margin-top:0">Backup</h2><p>KAM has one admin and one data folder. Download a backup zip now and then and keep it somewhere safe. ${db.settings.last_backup ? `The last backup was made on <b>${esc(db.settings.last_backup)}</b>.` : "<b>No backup has been made yet.</b>"}</p>
  <div class="row"><button class="primary" id="backupBtn" title="Download the whole data folder and the app as one zip">Download backup</button></div></div>
  <div class="card"><h2 style="margin-top:0">Export to Excel</h2><p>An emergency way back to a spreadsheet: one Excel file with every member, payment, the receipts by month, the fund, the interest shares, loans, statements, projects, objectives and meetings – as values, not formulas.</p>
  <div class="row"><button id="exportXlsx" title="Download everything as one Excel file">Export to Excel</button></div></div>
  <div class="card"><h2 style="margin-top:0">Handover</h2><p>At the end of the year, download the handover zip and send it to the next admin. It holds the whole data folder, this app (KAM.html) and a summary to check that everything arrived.</p>
  <div class="row"><button class="primary" id="handover" title="Download the data folder, the app and a summary as one zip">Download handover zip</button></div></div>
  <div class="card"><h2 style="margin-top:0">SACCO settings</h2>${s ? `<div class="form">${["sacco_name", "currency", "fund_name", "loan_rate", "loan_max_months", "default_fee", "registration_fee", "vision", "admin", "admin_year", "dev_email"].map(k => `<label>${esc(LABELS[k] || k)}</label><div>${esc(asText(s.props[k]))}</div>`).join("")}
    ${dataYears(db).concat(view.year + 1).filter((x, i, a) => a.indexOf(x) === i).map(y => `<label>Savings target ${y}</label><div>${money(s.props["target_" + y] || 0)}</div>`).join("")}</div>
    <div class="row"><button data-edit="${esc(s.path)}" title="Change the settings">Edit settings</button></div>` : `<p>This folder has no settings note yet.</p><button id="setup" class="primary" title="Create kam-settings.md and the folders">Set up this folder for KAM</button>`}</div>
  ${deletedNotes().length ? `<div class="card"><h2 style="margin-top:0">Deleted notes (${deletedNotes().length})</h2><p class="muted small">Deleted notes are kept in the archive folder and can be put back.</p>${tbl(["Deleted", "Note", "Was in", ""], deletedNotes().sort((a, b) => String(b.props.deleted).localeCompare(String(a.props.deleted))).map(n => tr([esc(String(n.props.deleted || "").replace("T", " ").slice(0, 16)), esc(n.name), esc(String(n.props.deleted_from || "")), `<button class="lnk" data-restore="${esc(n.path)}" title="Put this note back where it was">Restore</button>`])))}</div>` : ""}
  ${notesOf("report").map(r => `<div class="card"><h2 style="margin-top:0">${esc(r.props.title || r.name)}</h2><details><summary title="Show the report">Show</summary><div class="md">${mdToHtml(r.body)}</div></details></div>`).join("")}
  <div class="card"><h2 style="margin-top:0">Checks (${cs.length})</h2>${cs.length ? `<ul>${cs.map(c => `<li class="${c.level === "err" ? "bad" : c.level === "warn" ? "warn" : "muted"}">${esc(c.text)}</li>`).join("")}</ul>` : "<p>All fine.</p>"}
  ${store.errors.length ? `<h3>Notes that could not be read</h3><ul>${store.errors.map(e => `<li><b>${esc(e.path)}</b>: ${esc(e.why)}</li>`).join("")}</ul>` : ""}</div>`;
}
const asText = v => Array.isArray(v) ? v.join(", ") : (v ?? "");

const PAGES = { home: pageHome, members: pageMembers, history: pageHistory, receipts: pageReceipts, interest: pageInterest, loans: pageLoans, projects: pageProjects, meetings: pageMeetings,
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
