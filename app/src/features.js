/* KAM 1.4 – History, closing a month, data folder updates, Help, ▶ Present, What's new, receipts, backups, Excel export, PDF.
   Declarations only; main.js wires the buttons and runs the start code. */

/* ---------------------------------------------------------------- one-click data folder updates (as in Horizons: never changes existing notes,
   only adds what a new version needs – missing settings and folders) */
const STRUCTURE_VERSION = 2;
const STRUCTURE = [
  { v: 2, what: "Amounts shown as plain numbers (Settings › How amounts are shown)", settings: { amount_display: "numbers" } },
  { v: 2, what: "A History folder that logs every change", folder: "history" },
  { v: 2, what: "An archive folder: deleted notes go there and can be restored", folder: "archive/deleted" },
  { v: 2, what: "A folder for closed months", folder: "closed months" },
];
const structureVersion = () => num(db && db.settings.structure_version) || 1;
function structureBanner() {
  if (!db || store.demo || !settingsNote() || structureVersion() >= STRUCTURE_VERSION) return "";
  const todo = STRUCTURE.filter(x => x.v > structureVersion());
  return `<div class="banner warn noprint" id="structBanner"><b>This data folder can be updated for KAM ${APP.version}.</b> It adds:<ul>${todo.map(x => `<li>${esc(x.what)}</li>`).join("")}</ul>
  <span class="muted small">Nothing already in the folder is changed.</span><div class="row"><button class="primary" id="structUpdate" title="Add what this version needs to the data folder">Update the data folder</button></div></div>`;
}
async function applyStructure() {
  const todo = STRUCTURE.filter(x => x.v > structureVersion()), s = settingsNote(), add = {};
  for (const x of todo) {
    for (const [k, v] of Object.entries(x.settings || {})) if (s.props[k] === undefined || s.props[k] === "") add[k] = v;
    if (x.folder) await dirFor(x.folder, true);
  }
  await saveNote(s, { ...add, structure_version: STRUCTURE_VERSION });
}

/* ---------------------------------------------------------------- History: every create / change / delete, one note per month */
function describeNote(n) {
  const p = n.props || {};
  switch (n.type) {
    case "transaction": return `${KINDS[p.kind] || p.kind} ${money(p.amount)}${p.member ? " · " + mName(db.memberCode(p.member)) : ""} · ${p.date}`;
    case "fund": return `Fund statement ${p.month}${p.interest !== undefined ? " · interest " + money(p.interest) : ""}`;
    case "member": return `Member ${p.title || n.name} (${p.code || ""})`;
    case "loan": return `Loan ${p.code || n.name}${p.member ? " · " + mName(db.memberCode(p.member)) : ""} · ${money(p.amount)}`;
    case "settings": return "Settings";
    case "close": return `Month ${p.month} closed`;
    default: return `${n.type} · ${p.title || n.name}`;
  }
}
const monthOfNote = n => { const p = n.props || {}; return n.type === "transaction" ? String(p.date || "").slice(0, 7) : n.type === "fund" ? String(p.month || "") : ""; };
async function logHistory(action, n, before) {
  if (!db || ["history", "report"].includes(n.type)) return;
  if (action === "Changed" && n.type === "settings" && before && JSON.stringify({ ...before.props, modified: 0 }) === JSON.stringify({ ...n.props, modified: 0 }) && before.body === n.body) return;
  const now = nowISO(), mk = now.slice(0, 7), who = db.settings.admin ? `${mName(db.settings.admin)}` : "the admin";
  const nm = monthOfNote(n), flag = nm && closedMonths().has(nm) && n.type !== "close" ? " · ⚠ in a closed month" : "";
  const line = `- ${now.slice(0, 16).replace("T", " ")} · ${who} · ${action} · ${describeNote(n)}${flag} · ${n.path}`;
  const h = notesOf("history").find(x => x.props.month === mk);
  if (h) await saveNote(h, {}, (h.body ? h.body + "\n" : "") + line);
  else await createNote("history", { month: mk, title: "History" }, line);
}
store.hook = logHistory;
function historyLines() {
  return notesOf("history").flatMap(h => String(h.body || "").split(/\r?\n/).filter(l => l.startsWith("- ")).map(l => { const p = l.slice(2).split(" · "); return { when: p[0], who: p[1], action: p[2], what: p.slice(3, -1).join(" · "), path: p.at(-1), flagged: l.includes("⚠") }; }))
    .sort((a, b) => b.when.localeCompare(a.when));
}
function pageHistory() {
  const all = historyLines(), months = [...new Set(all.map(x => x.when.slice(0, 7)))], q = view.histQ.toLowerCase();
  const list = all.filter(x => (!view.histMonth || x.when.startsWith(view.histMonth)) && (!q || `${x.who} ${x.action} ${x.what}`.toLowerCase().includes(q)));
  return `<h1>History</h1><p>Every change saved in KAM – who made it, what and when. Kept in the data folder, so it travels with the handover.</p>
  <div class="row noprint"><input type="search" id="histQ" value="${esc(view.histQ)}" placeholder="Search – a name, savings, loan…" title="Show only lines with these words"><select id="histMonth" title="Only one month"><option value="">All months</option>${months.map(m => `<option ${m === view.histMonth ? "selected" : ""}>${m}</option>`).join("")}</select></div>
  ${list.length ? tbl(["When", "Who", "What happened", ""], list.slice(0, 500).map(x => tr([esc(x.when), esc(x.who), `<b>${esc(x.action)}</b> · ${esc(x.what)}`, x.flagged ? `<span class="tag warn" title="Changed after the month was closed">closed month</span>` : ""], x.flagged ? "flag" : ""))) : `<p class="muted">Nothing yet – changes appear here as they are saved.</p>`}`;
}

/* ---------------------------------------------------------------- closing a month */
const closedMonths = () => new Set(notesOf("close").map(n => String(n.props.month || "")));
function closeMonthDialog(mk) {
  const txs = db.tx.filter(t => t.month === mk), fund = db.fund.find(f => f.month === mk && !f.opening), cs = checks(db, alloc).filter(c => c.level === "err");
  const ok = c => `<span class="tag ${c ? "ok" : "warn"}">${c ? "✓" : "check"}</span>`;
  $("dlgBody").innerHTML = `<h2 style="margin-top:0">Close ${MONTHS_LONG[Number(mk.slice(5)) - 1]} ${mk.slice(0, 4)}?</h2>
  <p>Close a month once its payments and the fund statement are checked against the bank, mobile money and UAP statements. Later changes in a closed month ask first and are flagged in History.</p>
  <ul><li>${ok(txs.length)} ${txs.length} payment${txs.length === 1 ? "" : "s"} recorded for the month</li><li>${ok(fund)} Fund statement ${fund ? "entered" : "not entered yet"}</li><li>${ok(!cs.length)} ${cs.length ? cs.length + " data problems (see Settings › Checks)" : "No data problems"}</li></ul>
  <div class="row"><button class="primary" id="doClose" title="Mark the month as closed">Close the month</button><button id="dlgCancel" title="Don't close">Cancel</button></div>`;
  $("dlg").showModal(); $("dlgCancel").onclick = () => $("dlg").close();
  $("doClose").onclick = () => guarded(async () => { await createNote("close", { month: mk, closed: todayISO(), by: db.settings.admin || "" }); $("dlg").close(); refreshDb(); render(); status(`${MONTHS_LONG[Number(mk.slice(5)) - 1]} is closed.`); });
}
/* asked before a change lands in a closed month; true = go ahead */
function okToChangeClosed(mk) {
  if (!mk || !closedMonths().has(mk)) return true;
  return confirm(`${MONTHS_LONG[Number(mk.slice(5)) - 1]} ${mk.slice(0, 4)} is closed – its figures were checked. Change it anyway? The change is flagged in History.`);
}

/* ---------------------------------------------------------------- receipts to the member */
function receiptLinks(t) {
  const m = memberByCode(t.member); if (!m) return "";
  const text = `${db.settings.sacco_name || "SACCO"}: received ${money(t.amount)} – ${(KINDS[t.kind] || t.kind).toLowerCase()}${t.month ? ` for ${MONTHS_LONG[Number(t.month.slice(5)) - 1]} ${t.month.slice(0, 4)}` : ""} from ${m.name}${t.date ? ` (${t.date})` : ""}. Thank you!${amountNote() ? ` ${amountNote()}.` : ""}`;
  const phone = String(m.phone || "").replace(/[^\d]/g, "");
  return `<a class="btn" href="mailto:${encodeURIComponent(m.email || "")}?subject=${encodeURIComponent(`Receipt – ${db.settings.sacco_name || "SACCO"}`)}&body=${encodeURIComponent(text)}" title="${m.email ? "Email the receipt to " + esc(m.name) : "No email address – fill it in yourself"}">Email receipt</a>
  <a class="btn" href="https://wa.me/${phone}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener" title="${phone ? "WhatsApp the receipt to " + esc(m.name) : "Opens WhatsApp – choose " + esc(m.name)}">WhatsApp receipt</a>`;
}
function receiptDialog(t) {
  $("dlgBody").innerHTML = `<h2 style="margin-top:0">Receipt for ${esc(mName(t.member))}</h2><p>${esc(KINDS[t.kind] || t.kind)} ${money(t.amount)} · ${esc(t.date)}</p><div class="row">${receiptLinks(t)}<button id="dlgCancel" title="Close">Close</button></div>`;
  $("dlg").showModal(); $("dlgCancel").onclick = () => $("dlg").close();
}

/* ---------------------------------------------------------------- backup */
const backupAge = () => { const d = db.settings.last_backup; return d ? Math.round((Date.now() - Date.parse(d + "T12:00:00")) / 864e5) : Infinity; };
async function downloadBackup(kind) {
  const n = await handoverZip(kind === "handover" ? "handover" : "backup");
  const s = settingsNote(); if (s && !store.demo) { await saveNote(s, { last_backup: todayISO() }); refreshDb(); render(); }
  status(`${kind === "handover" ? "Handover" : "Backup"} zip downloaded (${n} files). Keep it somewhere safe.`);
}

/* ---------------------------------------------------------------- Excel export: a real .xlsx made here (no library) */
function xlsxBlob(sheets) {
  const enc = new TextEncoder(), x = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const col = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const names = sheets.map((sh, i) => (sh.name.replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31)) || `Sheet${i + 1}`);
  const sheetXml = sh => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${(sh.rows[0] || []).map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 30 : 15}" customWidth="1"/>`).join("")}</cols><sheetData>${sh.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
    const ref = `${col(ci)}${ri + 1}`, st = ri === 0 || (sh.bold && sh.bold.includes(ri)) ? ' s="1"' : "";
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v)}</t></is></c>`; }).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs></styleSheet>`],
    ...sheets.map((sh, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sh)]),
  ];
  return makeZip(files.map(([name, s]) => ({ name, data: enc.encode(s) })));
}
function exportSheets() {
  const asOf = repMonthKey(), mn = c => mName(c), years = dataYears(db);
  const sheets = [{ name: "Members", rows: [["Name", "Code", "Short name", "Status", "Role", "Country", "City", "Time zone", "Email", "Phone", "Monthly target", "Annual target", "Joined"],
    ...db.members.map(m => [m.name, m.code, sName(m.code), m.status || "", m.role || "", m.country || "", m.city || "", m.timezone || "", m.email || "", m.phone || "", num(m.monthly_target), num(m.annual_target), m.joined || ""])] },
  { name: "Payments", rows: [["Date", "Member", "Code", "Kind", "Amount", "Loan", "Project", "Reference", "Source"], ...db.tx.map(t => [t.date, t.member ? mn(t.member) : "", t.member, KINDS[t.kind] || t.kind, t.amount, t.loan, t.project, t.ref, t.source])] }];
  for (const y of years) {
    const rows = [["Member / row", "B/F", ...MONTHS, `${y} total`, "Total"]], bold = [];
    for (const m of activeMembers(db)) { bold.push(rows.length); rows.push([`${m.name} (${m.code})`]); for (const r of receiptRows(m.code, y)) rows.push([r.label, r.bf, ...r.vals, r.year === null ? "" : r.year, r.total]); }
    const rs = receiptSummary(db, y); bold.push(rows.length); rows.push(["Receipt summary"]);
    for (const [k, l] of [["savings", "Total savings"], ["membership", "Total membership"], ["welfare", "Total welfare"], ["penalty", "Total penalties"], ["loan_interest", "Loan interest received"], ["loan_repayment", "Loan repayment"], ["investment_return", "Return on investment"], ["other_income", "Other income"], ["total", "Total collections"]])
      rows.push([l, "", ...rs.rows[k], rs.rows[k].reduce((a, b) => a + b, 0)]);
    sheets.push({ name: `Receipts ${y}`, rows, bold });
  }
  sheets.push({ name: "Fund", rows: [["Month", "Deposits", "Withdrawals", "Interest", "Monthly total", "Running total", "Opening balance"], ...fundRows(db).map(f => [f.month, f.deposits, f.withdrawals, f.interest, f.total, f.running, f.opening ? "yes" : ""])] });
  const ms = [...alloc.byMonth.keys()].sort();
  sheets.push({ name: "Interest shares", rows: [["Member", "Code", ...ms, "Total"], ...db.members.map(m => [m.name, m.code, ...ms.map(k => alloc.byMonth.get(k).get(m.code) || 0), interestOf(alloc, m.code)])] });
  sheets.push({ name: "Loans", rows: [["Member", "Loan", "Guarantor", "Applied", "Approved", "Paid out", "Amount", "Rate per month", "Months", "Purpose", "Status", "Repaid", "Outstanding", "Interest charged", "Interest paid"],
    ...db.loans.map(l => { const s = loanState(db, l, asOf); return [mn(l.member), l.code, l.guarantor ? mn(l.guarantor) : "", l.applied || "", l.approved || "", l.paid_out || "", l.amount, l.rate, l.months, l.purpose || "", s.status, s.repaid, s.outstanding, s.interestCharged, s.interestPaid]; })] });
  for (const y of years) sheets.push({ name: `Statements ${y}`, rows: [["Member", "Code", "Accumulated savings", "Membership", "Welfare", "Penalties", "Loan interest received", "Loan repayment", "Interest shared (year)", "Fund balance (end of year)", `Borrowing ${y}`, `Loan paid ${y}`, "Loan outstanding"],
    ...db.members.map(m => { const s = statement(db, alloc, m.code, y); return [m.name, m.code, s.savings, s.membership, s.welfare, s.penalties, s.loanInterest, s.loanRepayment, s.interestYear, s.fundBalance, s.borrowingYear, s.repaidYear, s.outstanding]; })] });
  sheets.push({ name: "Projects", rows: [["Project / activity", "Code", "Objective", "Committee", "Cost", "Progress %", "Start", "End", "Comment"], ...db.projects.map(p => [p.title, p.code || "", linkName(p.objective), p.committee || "", num(p.cost), num(p.progress), p.start || "", p.end || "", p.comment || ""])] });
  sheets.push({ name: "Objectives", rows: [["Objective", "Code", "Measure"], ...db.objectives.map(o => [o.title, o.code || "", o.measure || ""])] });
  sheets.push({ name: "Meetings", rows: [["Date", "Meeting", "Attendees", "Notes"], ...db.meetings.map(m => [m.date || "", m.title || "", asList(m.attendees).map(a => mn(db.memberCode(a))).join(", "), String(m.note.body || "")])] });
  return sheets;
}
function exportXlsx() {
  const blob = xlsxBlob(exportSheets()), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `KAM-export-${todayISO()}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status("Excel file downloaded – it opens in Excel, Google Sheets and LibreOffice.");
}

/* ---------------------------------------------------------------- PDF: a clean A4 page, saved from the print window */
function printArea(html) {
  if (printArea.busy) return; printArea.busy = true;
  let a = $("printArea"); if (!a) { a = document.createElement("div"); a.id = "printArea"; document.body.appendChild(a); }
  a.innerHTML = html; document.body.classList.add("printarea");
  const done = () => { document.body.classList.remove("printarea"); window.removeEventListener("afterprint", done); printArea.busy = false; };
  window.addEventListener("afterprint", done); setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
}
function pdfUpdate() {
  const u = updateParts(), rows = activeMembers(db).map(m => memberRow(db, m, view.year, view.month));
  const fm = Array.from({ length: 12 }, (_, i) => { const f = db.fund.find(x => x.month === monthKey(view.year, i + 1) && !x.opening); return f ? f.interest : 0; });
  printArea(`<div class="pdfhead">${document.querySelector("header .brand svg").outerHTML}<span>${esc(db.settings.sacco_name || "KAM")}</span></div>${u.html}
  ${barChart({ title: `Savings ${view.year} against target to date`, labels: rows.map(r => sName(r.code)), bars: [{ name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }], lines: [{ name: "Target to date", values: rows.map(r => r.currentTarget) }], rotate: true })}
  ${barChart({ title: `Fund interest by month, ${view.year}`, labels: MONTHS, bars: [{ name: "Fund interest", values: fm }] })}`);
}
function pdfMember(code) { printArea(`<div class="pdfhead">${document.querySelector("header .brand svg").outerHTML}<span>${esc(db.settings.sacco_name || "KAM")} – statement ${view.year}</span></div>${amountNote() ? `<p class="small">${esc(amountNote())}</p>` : ""}${memberView(code)}`); }

/* ---------------------------------------------------------------- ▶ Present: the financial position as slides */
function presentSlides() {
  const k = kpis(db, alloc, view.year, view.month), rows = activeMembers(db).map(m => memberRow(db, m, view.year, view.month)), month = `${MONTHS_LONG[view.month - 1]} ${view.year}`;
  const fm = Array.from({ length: 12 }, (_, i) => { const f = db.fund.find(x => x.month === monthKey(view.year, i + 1) && !x.opening); return f ? f.interest : 0; });
  const next = db.meetings.filter(m => String(m.date) >= todayISO()).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const cnt = r => rows.filter(x => x.risk === r).length, fu = followUps();
  const loans = db.loans.map(l => ({ l, s: loanState(db, l, repMonthKey()) })).filter(x => x.s.outstanding > 0 || x.s.status === "requested");
  return [
    `<div class="slide title">${document.querySelector("header .brand svg").outerHTML}<h1>${esc(db.settings.sacco_name || "KAM")}</h1><h2>Financial position · ${month}</h2>${amountNote() ? `<p class="muted">${esc(amountNote())}</p>` : ""}</div>`,
    `<div class="slide"><h2>Key figures</h2><div class="kpis big">${kp("Total saved", money(k.totalSaved), "")}${kp(`Saved in ${view.year}`, money(k.yearSaved), "")}${kp("Fund value", money(k.fundValue), "")}${kp(`Interest ${view.year}`, money(k.interestYear), "")}${kp(`Interest in ${MONTHS_LONG[view.month - 1]}`, money(k.interestLastMonth), "")}${kp("Members", `${k.registered} of ${k.total} registered`, "")}</div></div>`,
    `<div class="slide"><h2>Members against target</h2><p><span class="tag ok">${cnt("On Track")} on track</span> <span class="tag warn">${cnt("Watch")} to watch</span> <span class="tag bad">${cnt("At Risk")} at risk</span></p>${barChart({ title: `Savings ${view.year} against target to date`, labels: rows.map(r => sName(r.code)), tips: rows.map(r => r.name), bars: [{ name: `${view.year} savings`, values: rows.map(r => r.yearSavings) }], lines: [{ name: "Target to date", values: rows.map(r => r.currentTarget) }], rotate: true })}</div>`,
    `<div class="slide"><h2>The fund and its interest</h2><div class="kpis big">${kp("Fund value", money(k.fundValue), "")}${kp("Interest to date", money(k.interestAll), "")}${kp("Highest per day", money(k.highestDaily), "")}</div>${barChart({ title: `Fund interest by month, ${view.year}`, labels: MONTHS, bars: [{ name: "Fund interest", values: fm }] })}</div>`,
    `<div class="slide"><h2>Loans</h2>${loans.length ? tbl(["Member and loan", ["Amount", "n"], ["Outstanding", "n"], ["Interest due", "n"], "Due by", "Status"], loans.map(({ l, s }) => tr([`${esc(mName(l.member))} ${codePill(l.code, "Loan code")}`, N(l.amount), N(s.outstanding), N(s.interestDue), esc(s.dueMonth), pillFor(s.status)]))) : "<p>No open loans.</p>"}</div>`,
    `<div class="slide"><h2>Projects and activities</h2>${tbl(["Project / activity", "Committee", "Progress", "End"], db.projects.map(p => tr([nameCode(p.title, p.code, "Project code"), esc(p.committee), `<progress max="100" value="${num(p.progress)}"></progress> ${num(p.progress)}%`, esc(p.end)])))}</div>`,
    `<div class="slide"><h2>To follow up (${fu.length})</h2><ul class="big">${fu.slice(0, 9).map(x => `<li class="${x.level === "bad" ? "bad" : ""}">${esc(x.text)}</li>`).join("")}</ul>${fu.length > 9 ? `<p class="muted">… and ${fu.length - 9} more on Home.</p>` : ""}</div>`,
    `<div class="slide"><h2>Highlights and next meeting</h2>${asList(db.settings.highlights).length ? `<ol class="big">${asList(db.settings.highlights).map(h => `<li>${esc(h)}</li>`).join("")}</ol>` : "<p>No highlights written.</p>"}<p class="big">Next meeting: <b>${next ? esc(next.date) : "not set"}</b></p></div>`,
  ];
}
const pres = { i: 0, slides: [] };
function startPresent() {
  pres.slides = presentSlides(); pres.i = 0;
  let o = $("present"); if (!o) { o = document.createElement("div"); o.id = "present"; document.body.appendChild(o); }
  o.hidden = false; showSlide();
  try { if (o.requestFullscreen) o.requestFullscreen().catch(() => {}); } catch {}
}
function showSlide() {
  const o = $("present"); pres.i = Math.max(0, Math.min(pres.slides.length - 1, pres.i));
  o.innerHTML = `${pres.slides[pres.i]}<div class="presbar"><button id="pBack" title="Previous slide (←)">←</button><span>${pres.i + 1} / ${pres.slides.length}</span><button id="pNext" title="Next slide (→ or space)">→</button><button id="pStop" title="Stop presenting (Esc)">Stop</button></div>`;
  $("pBack").onclick = () => { pres.i--; showSlide(); }; $("pNext").onclick = () => { pres.i++; showSlide(); }; $("pStop").onclick = stopPresent;
}
function stopPresent() { const o = $("present"); if (o) o.hidden = true; try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} }

/* ---------------------------------------------------------------- What's new: the pop-up after a new version, with the Try checklist */
const tryKey = (v, i) => `kam-try-${v}-${i}`;
const tryDone = (v, i) => { try { return localStorage.getItem(tryKey(v, i)) === "1"; } catch { return false; } };
function tryCard(popup) {
  const t = (APP.tries || {})[APP.version] || []; if (!t.length) return "";
  return `<div class="card" id="tryCard"><h2 style="margin-top:0">Try what's new in ${APP.version}</h2><p class="muted small">Tick each one off when you've tried it. Something wrong? Write it in AppDev.</p>
  <ul class="trylist">${t.map((x, i) => `<li><label><input type="checkbox" data-try="${i}" ${tryDone(APP.version, i) ? "checked" : ""}> ${esc(x.text)}</label>${x.show ? ` <button class="lnk" data-tshow="${esc(x.show)}" data-ttab="${esc(x.tab || "")}" title="Point out where this is">Show me</button>` : ""}</li>`).join("")}</ul></div>`;
}
function whatsNewPopup() {
  let seen = ""; try { seen = localStorage.getItem("kam-seen-version") || ""; localStorage.setItem("kam-seen-version", APP.version); } catch {}
  if (!seen || seen === APP.version || store.demo) return;
  $("dlgBody").innerHTML = `<h2 style="margin-top:0">What's new in KAM ${APP.version}</h2><div class="md">${mdToHtml(APP.latest || "")}</div>${tryCard(true)}<div class="row"><button class="primary" id="dlgCancel" title="Close – find this again under About">Close</button></div>`;
  $("dlg").showModal(); $("dlgCancel").onclick = () => $("dlg").close(); wireTry($("dlgBody"));
}
function wireTry(root) {
  root.querySelectorAll("[data-try]").forEach(el => el.onchange = () => { try { localStorage.setItem(tryKey(APP.version, el.dataset.try), el.checked ? "1" : "0"); } catch {} });
  root.querySelectorAll("[data-tshow]").forEach(el => el.onclick = () => { if ($("dlg").open) $("dlg").close(); showMe(el.dataset.tshow, el.dataset.ttab); });
}
/* point at something: open its page if needed, outline it for a few seconds */
function showMe(sel, tab) {
  if (tab && tab !== view.tab) { view.tab = tab; view.loan = ""; view.receiptsKind = "all"; render(); }
  const el = document.querySelector(sel); if (!el) { status("That isn't on this page right now.", "warn"); return; }
  el.classList.add("tourhl"); el.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => el.classList.remove("tourhl"), 3000);
}

/* ---------------------------------------------------------------- Help: the ? in the corner (as in Horizons) */
const HELP = {
  home: { title: "Home", about: "The group at a glance for the reporting month: what to follow up, the key figures, the graphs and every member against target.", items: [
    { q: "Change the month the figures report on", a: "Pick the month and year at the top right – every page follows.", show: "#period" },
    { q: "See what needs attention", a: "Follow up lists members behind on savings, overdue loans, a missing fund statement, data problems and more. Each line has a fix link.", show: "#followup" },
    { q: "Show the figures at the monthly meeting", a: "▶ Present plays the financial position as slides. Arrow keys move, Esc stops.", show: "#presentBtn" } ] },
  members: { title: "Members", about: "Everyone in the group. Click a member's pill to see their statement on this page, or several pills to compare them.", items: [
    { q: "See one member's statement", a: "Click their pill. All members brings everyone back.", show: "#mpills" },
    { q: "Compare members", a: "Click more than one pill – their key figures sit side by side, and the charts and tables show only them.", show: "#mpills" },
    { q: "Add a member or change details", a: "+ New member, or Edit in the contacts table. The short name is what the charts and pills show.", show: "[data-new='member']" },
    { q: "Give a member a statement as PDF", a: "Select the member, then Save as PDF and choose Save as PDF in the print window." } ] },
  receipts: { title: "Receipts", about: "Every payment by member and month – the old Receipts sheet, added up from the payments recorded.", items: [
    { q: "Record a payment", a: "+ Payment: member, date, kind and amount. Afterwards you can send the member a receipt.", show: "[data-pay]" },
    { q: "Enter a whole month at once", a: "Monthly round – one table for every member's payments in a month.", show: "[data-round]" },
    { q: "See only one member", a: "Click their pill; the group totals hide until you pick All members again.", show: "#mpills" },
    { q: "Open or fold the members' rows", a: "Click a member's line, or Expand all / Collapse all.", show: "#rcToggle" },
    { q: "Close a month", a: "Once a month's payments and fund statement are checked, close it. Later changes ask first and are flagged in History.", show: "#closeMonth" } ] },
  interest: { title: "Fund & interest", about: "The fund month by month and how its interest is shared among the members.", items: [
    { q: "Enter the fund statement", a: "+ Fund statement each month: deposits, withdrawals and interest from the statement.", show: "[data-new='fund']" },
    { q: "Why is a member's interest different from the workbook?", a: "The workbook's formulas credited more than the fund earned. The app shares exactly what the fund earned, by balance at the start of each month." } ] },
  loans: { title: "Loans", about: "Loans, repayments, interest on the declining balance, and the printable loan application.", items: [
    { q: "Start a loan request", a: "+ Loan request – fill in member, guarantor, amount and purpose; add the payout date when it is paid.", show: "[data-new='loan']" },
    { q: "Record a repayment", a: "Open the loan and press + Repayment, or use + Payment with kind Loan repayment." },
    { q: "Print the application form", a: "Open the loan › Loan application form › Print." } ] },
  expenses: { title: "Expenses", about: "Approved funding sources and the expenses paid from them, with the running balance.", items: [
    { q: "Record an expense", a: "+ Expense – link it to the project or activity.", show: "[data-paykind='expense']" } ] },
  projects: { title: "Projects", about: "Objectives, projects and activities, and the project tracker timeline.", items: [
    { q: "Add a project", a: "+ Project – give it a code, an objective and dates.", show: "[data-new='project']" },
    { q: "Plan the work", a: "+ Task adds a line to the tracker timeline.", show: "[data-new='task']" } ] },
  meetings: { title: "Meetings", about: "The standing agenda, the committee and the meeting notes.", items: [
    { q: "Prepare a meeting", a: "+ Meeting creates the note with the standing agenda.", show: "[data-newmeeting]" } ] },
  plans: { title: "Plans", about: "The SACCO's plans – investment, technology, treasury, welfare and more.", items: [
    { q: "Write a plan", a: "Edit next to the plan, or + Plan for a new one.", show: "[data-new='plan']" } ] },
  updates: { title: "Updates", about: "The monthly update to the members by email and WhatsApp.", items: [
    { q: "Send the monthly update", a: "Copy the update, open the email (everyone in BCC), paste, send. Then post the short version on WhatsApp and Mark as sent.", show: "#copyMail" },
    { q: "Send the update as a PDF", a: "Save as PDF, choose Save as PDF in the print window, and attach the file to the email.", show: "#pdfUpdate" } ] },
  yearend: { title: "Year-end", about: "The dividend calculation and share-out list, and the cash count.", items: [
    { q: "Share out at year-end", a: "Choose the year and the amount to share; each member gets a share by their savings. Print it for signing and save it as the year's record.", show: "#divYear" },
    { q: "Count the cash", a: "Enter the number of each banknote; the total adds up.", show: "#ccSave" } ] },
  history: { title: "History", about: "Every change saved – who, what and when. It travels with the data folder.", items: [
    { q: "Find a change", a: "Search for a name or a word, or pick a month.", show: "#histQ" } ] },
  appdev: { title: "AppDev", about: "For the admin: how KAM is built, the data model, and comments for the developer.", items: [
    { q: "Report a problem or an idea", a: "Write it under Comments, then Send to Geir.", show: "#devNew" } ] },
  settings: { title: "Settings", about: "The data folder, how amounts are shown, backups, the Excel export, the handover and the checks.", items: [
    { q: "Make a backup", a: "Download backup – keep the zip somewhere safe.", show: "#backupBtn" },
    { q: "Get everything into Excel", a: "Export to Excel – one file with every member, payment and total.", show: "#exportXlsx" },
    { q: "Hand over to next year's admin", a: "Download handover zip and send it to them.", show: "#handover" },
    { q: "Show amounts with or without the currency", a: "How amounts are shown.", show: "#amountMode" },
    { q: "Bring back something deleted", a: "Deleted notes are listed here with Restore (only when there are any)." } ] },
  about: { title: "About", about: "What KAM is, how it is built, the workbook analysis, what is waiting to be built and what's new.", items: [
    { q: "Take the tour again", a: "Start the tour – it runs on made-up data.", show: "[data-tour]" } ] },
};
const helpText = it => `${it.q} ${it.a}`.toLowerCase();
function openHelp(q = "") {
  const c = $("helpCard"), tab = HELP[view.tab] ? view.tab : "home", h = HELP[tab], Q = q.trim().toLowerCase();
  const item = (it, t) => `<details class="hlp-it"><summary>${esc(it.q)}${t !== tab ? ` <span class="muted small">– ${esc(HELP[t].title)}</span>` : ""}</summary><p>${esc(it.a)}</p>${it.show ? `<button class="lnk" data-hshow="${esc(it.show)}" data-htab="${t}" title="Point out where this is">Show me</button>` : ""}</details>`;
  const found = Q ? Object.entries(HELP).flatMap(([t, x]) => x.items.filter(it => helpText(it).includes(Q) || x.title.toLowerCase().includes(Q)).map(it => item(it, t))) : null;
  c.innerHTML = `<div class="row" style="margin-top:0"><b>Help – ${esc(h.title)}</b><button class="lnk" id="hlpClose" style="margin-left:auto" title="Close help (Esc)">Close</button></div>
  <input type="search" id="hlpQ" placeholder="Search help – e.g. loan, backup, PDF" value="${esc(q)}" title="Search every page's help" style="width:100%">
  ${found ? (found.join("") || '<p class="muted">Nothing found – try another word, or take the tour.</p>') : `<p>${esc(h.about)}</p>${h.items.map(it => item(it, tab)).join("")}`}
  <p class="small" style="margin-bottom:0"><button class="lnk" id="hlpTour" title="The guided tour on made-up data">The tour</button> · <button class="lnk" id="hlpNew" title="What changed in each version">What's new</button>${appdevOn() ? ` · <button class="lnk" id="hlpDev" title="Write to the developer">Ask the developer</button>` : ""}</p>`;
  c.hidden = false; $("helpPill").setAttribute("aria-expanded", "true");
  $("hlpClose").onclick = closeHelp;
  $("hlpQ").oninput = e => { const v = e.target.value, pos = e.target.selectionStart; openHelp(v); $("hlpQ").focus(); try { $("hlpQ").setSelectionRange(pos, pos); } catch {} };
  c.querySelectorAll("[data-hshow]").forEach(b => b.onclick = () => { closeHelp(); showMe(b.dataset.hshow, b.dataset.htab); });
  $("hlpTour").onclick = () => { closeHelp(); guarded(startTour); };
  $("hlpNew").onclick = () => { closeHelp(); go("about"); setTimeout(() => { const w = [...document.querySelectorAll("#main h2")].find(x => x.textContent === "What's new"); if (w) w.scrollIntoView(); }, 50); };
  if ($("hlpDev")) $("hlpDev").onclick = () => { closeHelp(); go("appdev"); };
}
function closeHelp() { const c = $("helpCard"); if (c) c.hidden = true; if ($("helpPill")) $("helpPill").setAttribute("aria-expanded", "false"); }
