// Tests for the calculations (app/src/calc.js) on the demo data and on small hand-made cases.
// Run:  node tests/test_calc.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ctx = { module: {}, console, Blob, File, DOMException, TextEncoder, setTimeout, clearTimeout, Promise };
vm.createContext(ctx);
for (const f of ["store.js", "calc.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, "app/src", f), "utf8"), ctx, { filename: f });
vm.runInContext("this.parseNote = parseNote; this.serializeNote = serializeNote; this.makeZip = makeZip;", ctx);
const C = ctx.module.exports;
let fails = 0;
const check = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) fails++; };

function load(dir) {
  const notes = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".md")) { const n = ctx.parseNote(fs.readFileSync(p, "utf8")); notes.push({ ...n, name: e.name.replace(/\.md$/, ""), type: String(n.props.type || "note") }); } } };
  walk(dir); return notes;
}
const notes = load(path.join(ROOT, "dist", "KAM demo data"));
const settings = notes.find(n => n.type === "settings").props;
const db = C.buildDb(notes, settings);
check(db.members.length === 10, `10 demo members (got ${db.members.length})`);
check(db.tx.length > 150, `demo transactions read (${db.tx.length})`);

// interest always adds up to what the fund earned
const alloc = C.allocateInterest(db);
let all = true;
for (const f of db.fund) if (f.interest && !f.opening) { const s = [...(alloc.byMonth.get(f.month) || new Map()).values()].reduce((a, b) => a + b, 0); if (!alloc.unshared.has(f.month) && s !== Math.round(f.interest)) all = false; }
check(all, "every month's interest shares add up exactly to the fund's interest");
check(C.checks(db, alloc).filter(c => c.level === "err").length === 0, "no errors in the demo data checks");

// hand-made: two members, start-of-month rule
const mk = (type, props) => ({ type, props, name: props.title || props.code || type });
const small = C.buildDb([
  mk("member", { code: "A", title: "A" }), mk("member", { code: "B", title: "B" }),
  mk("transaction", { date: "2025-01-01", member: "A", kind: "savings", amount: 300 }),
  mk("transaction", { date: "2025-01-15", member: "B", kind: "savings", amount: 100 }),
  mk("transaction", { date: "2025-02-01", member: "B", kind: "savings", amount: 200 }),
  mk("fund", { month: "2025-01", interest: 50 }), mk("fund", { month: "2025-02", interest: 100 }), mk("fund", { month: "2025-03", interest: 101 }),
], {});
const a2 = C.allocateInterest(small);
check(a2.unshared.get("2025-01") === 50, "January interest unshared: nobody had a balance on 1 January");
check(a2.byMonth.get("2025-02").get("A") === 75 && a2.byMonth.get("2025-02").get("B") === 25, "February split 300:100 → 75 / 25");
const m3 = a2.byMonth.get("2025-03");
check(m3.get("A") + m3.get("B") === 101, "March shares add up to 101 with rounding");
check(m3.get("A") === 54 && m3.get("B") === 47, `March split 375:325 → 54 / 47 (got ${m3.get("A")} / ${m3.get("B")})`);

// loans: declining balance
const sch = C.loanSchedule(1000000, 0.05, 4, "2025-01");
check(sch.length === 4 && sch[0].interest === 50000 && sch[3].closing === 0, "4-month plan: 5% of the full amount first month, ends at zero");
check(sch.reduce((s, r) => s + r.interest, 0) === 125000, "total interest on 1,000,000 over 4 months = 125,000");
const ldb = C.buildDb([mk("member", { code: "A", title: "A" }), mk("loan", { code: "L1", member: "A", amount: 1000, rate: 0.05, months: 4, paid_out: "2025-01-10" }),
  mk("transaction", { date: "2025-03-01", member: "A", kind: "loan_repayment", amount: 400, loan: "L1" })], {});
const st = C.loanState(ldb, ldb.loans[0], "2025-06");
check(st.outstanding === 600 && st.overdue, "loan: 600 outstanding and overdue after 4 months");
check(st.interestCharged === 50 + 50 + 30 + 30 + 30, `loan interest on declining balance = 190 (got ${st.interestCharged})`);

// member table logic (Group Dashboard)
const row = C.memberRow(small, small.members[1], 2025, 3);
check(row.yearSavings === 300 && row.paidMonths === 2 && row.risk === "Watch", "member row: B paid 2 of 3 months → Watch");

// words and dividends
check(C.inWords(950000) === "nine hundred and fifty thousand", "950,000 in words");
const div = C.dividendSplit(small, 2025, 1000);
check(div.reduce((s, r) => s + r.dividend, 0) === 1000, "dividends add up to the pool");

// YAML round trip and zip
const t = ctx.serializeNote({ type: "member", title: "A: B", list: ["x", "y"] }, ["type", "title", "list"], "Body");
const back = ctx.parseNote(t);
check(back.props.title === "A: B" && back.props.list.length === 2 && back.body === "Body", "note round trip keeps properties and body");
const zip = ctx.makeZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }]);
check(zip.size === 30 + 5 + 5 + 46 + 5 + 22, "zip has the expected size");

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
