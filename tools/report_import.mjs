// Write "Import report.md" into an imported data folder: what was made, the app's totals beside the workbook's,
// and the points to confirm. Uses the app's own calculations (app/src/calc.js).
// Run:  node tools/report_import.mjs <data-folder>
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.resolve(process.argv[2]);
const ctx = { module: {}, console, Blob, File, DOMException, TextEncoder, setTimeout, clearTimeout, Promise };
vm.createContext(ctx);
for (const f of ["store.js", "calc.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, "app/src", f), "utf8"), ctx);
vm.runInContext("this.parseNote = parseNote;", ctx);
const C = ctx.module.exports;
const notes = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith(".")) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".md")) { const n = ctx.parseNote(fs.readFileSync(p, "utf8")); notes.push({ ...n, name: e.name.replace(/\.md$/, ""), type: String(n.props.type || "note") }); } } };
walk(dir);
const imp = JSON.parse(fs.readFileSync(path.join(dir, ".import.json"), "utf8"));
const db = C.buildDb(notes, notes.find(n => n.type === "settings").props), alloc = C.allocateInterest(db);
const f = n => Math.round(n).toLocaleString("en-US"), mark = (a, b) => Math.abs(a - b) < 1 ? "✓ matches" : `differs by ${f(a - b)}`;
const L = [];
L.push("# Import report", "", `Imported ${new Date().toISOString().slice(0, 10)} from the workbook (kept unchanged in \`archive/\`). Made by tools/import_workbook.py, following the data model.`, "");
L.push("## Notes made", "", "| Kind | Notes |", "| --- | --- |", ...Object.entries(imp.counts).sort().map(([k, v]) => `| ${k} | ${v} |`), "");
L.push("## Savings and membership per member", "", "The app's totals are added up from the imported payments; the workbook's are its own Total column. They should match.", "",
  "| Member | Savings – app | Savings – workbook | | Membership – app | Membership – workbook | |", "| --- | --- | --- | --- | --- | --- | --- |");
let allOk = true;
for (const [code, w] of Object.entries(imp.workbook.members)) {
  const s = C.savingsBalance(db, code, "2026-12"), m = C.kindSum(db, code, "membership", null);
  if (Math.abs(s - w.savings) >= 1 || Math.abs(m - w.membership) >= 1) allOk = false;
  L.push(`| ${code} | ${f(s)} | ${f(w.savings)} | ${mark(s, w.savings)} | ${f(m)} | ${f(w.membership)} | ${mark(m, w.membership)} |`);
}
L.push("", allOk ? "All member totals match the workbook." : "**Some totals differ – see the rows above and the points below.**", "");
L.push("## The fund", "", "| Year | Deposits – app | Deposits – workbook | | Interest – app | Interest – workbook | |", "| --- | --- | --- | --- | --- | --- | --- |");
for (const [y, w] of Object.entries(imp.workbook.fund)) {
  const fr = db.fund.filter(x => !x.opening && x.month.startsWith(y)), d = fr.reduce((s, x) => s + x.deposits - x.withdrawals, 0), i = fr.reduce((s, x) => s + x.interest, 0);
  L.push(`| ${y} | ${f(d)} | ${f(w.deposits)} | ${mark(d, w.deposits)} | ${f(i)} | ${f(w.interest)} | ${mark(i, w.interest)} |`);
}
L.push("", "## Loans", "", "| Member | Outstanding – app | Outstanding – workbook (EXP LOAN) | |", "| --- | --- | --- | --- |");
for (const [code, w] of Object.entries(imp.workbook.loans)) { const o = C.loanOutstanding(db, code, "2026-12"); L.push(`| ${code} | ${f(o)} | ${f(w.outstanding)} | ${mark(o, w.outstanding)} |`); }
L.push("", "## Interest per member – workbook vs recalculated", "", "The workbook's interest figures have known formula errors (see About › the workbook analysis). The app recalculates them by start-of-month balance; the totals below should equal what the fund earned.", "",
  "| Member | 2025 workbook | 2025 app | 2026 workbook | 2026 app |", "| --- | --- | --- | --- | --- |");
let tw = [0, 0], ta = [0, 0];
for (const m of db.members) {
  const w5 = C.num(m.workbook_interest_2025), w6 = C.num(m.workbook_interest_2026), a5 = C.interestOf(alloc, m.code, 2025), a6 = C.interestOf(alloc, m.code, 2026);
  tw[0] += w5; tw[1] += w6; ta[0] += a5; ta[1] += a6;
  L.push(`| ${m.code} | ${f(w5)} | ${f(a5)} | ${f(w6)} | ${f(a6)} |`);
}
L.push(`| **Total** | **${f(tw[0])}** | **${f(ta[0])}** | **${f(tw[1])}** | **${f(ta[1])}** |`, "");
const chk = C.checks(db, alloc);
L.push(`Checks after import: ${chk.filter(c => c.level === "err").length} errors, ${chk.filter(c => c.level === "warn").length} warnings.`, ...chk.map(c => `- ${c.text}`), "");
L.push("## Typed figures in the workbook not imported", "", ...Object.entries(imp.workbook.typed_actuals).map(([y, v]) => `- The dashboard's typed actual savings for ${y}: ${f(v)}. The app shows ${f(db.members.reduce((s, m) => s + C.savingsIn(db, m.code, Number(y)), 0))}, added up from the payments.`), "");
L.push("## To confirm with the group", "", ...imp.points.map(p => `- [ ] ${p}`),
  "- [ ] The fund's interest implies a high monthly return – check a few months against the fund's statements (Fund & interest › Return per month).",
  "- [ ] The 2026 savings target on the dashboard and in objective OB002 differ by a factor of ten – which is right? (Settings › Edit settings.)", "");
fs.writeFileSync(path.join(dir, "Import report.md"), "---\ntype: report\ntitle: Import report\n---\n\n" + L.join("\n") + "\n");
fs.unlinkSync(path.join(dir, ".import.json"));
console.log(L.slice(0, 400).join("\n"));
