/* KAM – calculations. Pure functions on `db` (built from the notes by buildDb). Nothing here reads or writes files,
   so the same code runs in the app and in the tests (node tests/test_calc.mjs). Amounts are whole shillings. */

const KINDS = {
  savings: "Savings", withdrawal: "Savings withdrawn", membership: "Membership fee", welfare: "Welfare", penalty: "Penalty",
  loan_interest: "Loan interest received", loan_repayment: "Loan repayment", investment_return: "Return on investment",
  other_income: "Other income", expense: "Expense",
};
const MONEY_IN = ["savings", "membership", "welfare", "penalty", "loan_interest", "loan_repayment", "investment_return", "other_income"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const num = v => { const x = Number(String(v ?? "").replace(/[ ,_]/g, "")); return isFinite(x) ? x : 0; };
const monthOf = d => String(d || "").slice(0, 7);
const yearOf = d => Number(String(d || "").slice(0, 4)) || 0;
const monthKey = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
const addMonths = (mk, k) => { let [y, m] = mk.split("-").map(Number); m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return monthKey(y, m); };
const daysInMonth = mk => { const [y, m] = mk.split("-").map(Number); return new Date(y, m, 0).getDate(); };
function monthRange(a, b) { const out = []; if (!a || !b || a > b) return out; for (let m = a; m <= b; m = addMonths(m, 1)) out.push(m); return out; }
const linkName = v => { const s = String(v ?? ""); const m = s.match(/\[\[([^\]|#]+)/); return (m ? m[1] : s).trim(); };
/* how amounts are written – the app sets MONEY_FMT from Settings › How amounts are shown (1.4) */
let MONEY_FMT = null;
const fmt = (n, cur) => MONEY_FMT && cur !== false ? MONEY_FMT(n) : (cur === false ? "" : (cur || "UGX") + " ") + Math.round(num(n)).toLocaleString("en-US");
const fmtN = n => Math.round(num(n)).toLocaleString("en-US");

/* ---------------------------------------------------------------- from notes to db */
function buildDb(notes, settingsProps) {
  const s = settingsProps || {};
  const of = t => notes.filter(n => n.type === t);
  const members = of("member").map(n => ({ ...n.props, code: String(n.props.code || n.name), name: n.props.title || n.name, note: n }))
    .sort((a, b) => natural(a.code, b.code));
  const byName = new Map();
  for (const m of members) { byName.set(m.code.toLowerCase(), m.code); byName.set(String(m.name).toLowerCase(), m.code); byName.set(`${m.code} ${m.name}`.toLowerCase(), m.code); }
  const memberCode = v => { const t = linkName(v); return byName.get(t.toLowerCase()) || t; };
  const loans = of("loan").map(n => ({ ...n.props, code: String(n.props.code || n.name), member: memberCode(n.props.member), guarantor: memberCode(n.props.guarantor), amount: num(n.props.amount), rate: n.props.rate === undefined || n.props.rate === "" ? num(s.loan_rate || 0.05) : num(n.props.rate), months: num(n.props.months || s.loan_max_months || 4), note: n }));
  const loanCode = v => { const t = linkName(v); const l = loans.find(x => x.code.toLowerCase() === t.toLowerCase() || `${x.code} ${x.member}`.toLowerCase() === t.toLowerCase() || x.note.name.toLowerCase() === t.toLowerCase()); return l ? l.code : t; };
  const tx = of("transaction").map(n => {
    const p = n.props, date = String(p.date || "");
    return { date, month: monthOf(date), year: yearOf(date), member: p.member ? memberCode(p.member) : "", kind: String(p.kind || "").trim(), amount: num(p.amount),
      loan: p.loan ? loanCode(p.loan) : "", project: linkName(p.project), ref: p.reference || "", source: p.source || "", note: n };
  }).filter(t => t.date && t.kind).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const fund = of("fund").map(n => ({ month: String(n.props.month || ""), deposits: num(n.props.deposits), withdrawals: num(n.props.withdrawals), interest: num(n.props.interest), opening: String(n.props.opening) === "true", note: n }))
    .filter(f => /^\d{4}-\d{2}$/.test(f.month)).sort((a, b) => a.month < b.month ? -1 : 1);
  const simple = t => of(t).map(n => ({ ...n.props, title: n.props.title || n.name, note: n }));
  return {
    settings: s, members, tx, loans, fund, memberCode,
    objectives: simple("objective").sort((a, b) => natural(a.code || a.title, b.code || b.title)),
    projects: simple("project").sort((a, b) => natural(a.code || a.title, b.code || b.title)),
    tasks: simple("task").sort((a, b) => num(a.order) - num(b.order) || String(a.start).localeCompare(String(b.start))),
    meetings: simple("meeting").sort((a, b) => String(b.date).localeCompare(String(a.date))),
    plans: simple("plan").sort((a, b) => natural(a.title, b.title)),
    funding: simple("funding").sort((a, b) => String(a.approved).localeCompare(String(b.approved))),
    years: simple("year"), cashcounts: simple("cashcount").sort((a, b) => String(b.date).localeCompare(String(a.date))),
    updates: simple("update").sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}

/* ---------------------------------------------------------------- sums */
const sumTx = (db, f) => db.tx.filter(f).reduce((s, t) => s + t.amount, 0);
/* amount of one kind for a member (or the group if code is null) in a year (and optionally one month) */
function kindSum(db, code, kind, year, month) {
  return sumTx(db, t => (code === null || t.member === code) && t.kind === kind && (!year || t.year === year) && (!month || t.month === month));
}
function savingsIn(db, code, year, month) { return kindSum(db, code, "savings", year, month) - kindSum(db, code, "withdrawal", year, month); }
const lastDataMonth = db => { const ms = [...db.tx.map(t => t.month), ...db.fund.filter(f => f.interest || f.deposits).map(f => f.month)].sort(); return ms.at(-1) || monthOf(new Date().toISOString()); };
const dataYears = db => [...new Set([...db.tx.map(t => t.year), ...db.fund.map(f => yearOf(f.month))])].filter(Boolean).sort();

/* ---------------------------------------------------------------- fund interest split
   Rule (default, until the group decides): each month's fund interest is shared in proportion to each member's balance
   at the start of that month = savings paid in before that month − withdrawals before that month + interest already shared.
   Payments made during a month count from the next month. Shares are whole shillings and always add up to the month's
   interest exactly (largest remainder). Interest of a month when nobody had a balance stays unshared and is reported. */
function allocateInterest(db) {
  const codes = db.members.map(m => m.code);
  const months = db.fund.filter(f => f.interest && !f.opening).map(f => f.month);
  const result = { byMonth: new Map(), unshared: new Map(), perMember: new Map(codes.map(c => [c, 0])), balanceStart: new Map() };
  if (!months.length) return result;
  /* net savings per member per month */
  const flow = new Map();
  for (const t of db.tx) if (t.kind === "savings" || t.kind === "withdrawal") {
    const k = `${t.member}|${t.month}`; flow.set(k, (flow.get(k) || 0) + (t.kind === "savings" ? t.amount : -t.amount));
  }
  const first = [db.tx[0] && db.tx[0].month, months[0]].filter(Boolean).sort()[0];
  const bal = new Map(codes.map(c => [c, 0]));
  for (const m of monthRange(first, months.at(-1))) {
    const f = db.fund.find(x => x.month === m && !x.opening);
    const start = new Map(codes.map(c => [c, Math.max(0, bal.get(c))]));
    result.balanceStart.set(m, start);
    if (f && f.interest) {
      const W = [...start.values()].reduce((a, b) => a + b, 0), I = Math.round(f.interest), shares = new Map();
      if (W > 0) {
        const raw = codes.map(c => ({ c, x: I * start.get(c) / W }));
        let given = 0; for (const r of raw) { const v = Math.floor(r.x); shares.set(r.c, v); given += v; }
        raw.sort((a, b) => (b.x - Math.floor(b.x)) - (a.x - Math.floor(a.x)) || b.x - a.x);
        for (let i = 0; i < I - given; i++) shares.set(raw[i % raw.length].c, shares.get(raw[i % raw.length].c) + 1);
        for (const c of codes) { bal.set(c, bal.get(c) + shares.get(c)); result.perMember.set(c, result.perMember.get(c) + shares.get(c)); }
      } else result.unshared.set(m, I);
      result.byMonth.set(m, shares);
    }
    for (const c of codes) bal.set(c, bal.get(c) + (flow.get(`${c}|${m}`) || 0));
  }
  return result;
}
const interestOf = (alloc, code, year, month) => [...alloc.byMonth].filter(([m]) => (!year || yearOf(m) === year) && (!month || m === month)).reduce((s, [, sh]) => s + (sh.get(code) || 0), 0);
/* the member's fund balance (savings + shared interest) at the end of a month */
const fundBalance = (db, alloc, code, upTo) => savingsBalance(db, code, upTo) + [...alloc.byMonth].filter(([m]) => m <= upTo).reduce((s, [, sh]) => s + (sh.get(code) || 0), 0);
const savingsBalance = (db, code, upTo) => sumTx(db, t => t.member === code && t.kind === "savings" && t.month <= upTo) - sumTx(db, t => t.member === code && t.kind === "withdrawal" && t.month <= upTo);

/* ---------------------------------------------------------------- the fund (UAP) month by month – Receipts rows 107–111 */
function fundRows(db) {
  let running = 0;
  return db.fund.map(f => { const total = f.deposits - f.withdrawals + f.interest; running += total; return { ...f, total, running }; });
}

/* ---------------------------------------------------------------- loans – EXP LOAN, Loan Application rules */
function loanRepaid(db, loan, upTo) { return sumTx(db, t => t.kind === "loan_repayment" && t.loan === loan.code && (!upTo || t.month <= upTo)); }
function loanInterestPaid(db, loan, upTo) { return sumTx(db, t => t.kind === "loan_interest" && t.loan === loan.code && (!upTo || t.month <= upTo)); }
/* repayment plan: equal principal, interest each month on the balance still owed (declining balance) */
function loanSchedule(amount, rate, months, startMonth) {
  const rows = []; let bal = Math.round(num(amount)); const n = Math.max(1, Math.round(num(months))), p = Math.round(bal / n);
  for (let i = 1; i <= n; i++) {
    const interest = Math.round(bal * num(rate)), principal = i === n ? bal : p;
    rows.push({ n: i, month: startMonth ? addMonths(startMonth, i) : "", opening: bal, interest, principal, payment: interest + principal, closing: bal - principal });
    bal -= principal;
  }
  return rows;
}
/* where a loan stands at the end of month asOf: outstanding, interest charged so far on the declining balance, paid, due, overdue */
function loanState(db, loan, asOf) {
  const out = { repaid: 0, outstanding: loan.amount, interestCharged: 0, interestPaid: 0, interestDue: 0, overdue: false, dueMonth: "", status: loan.status || "" };
  const start = monthOf(loan.paid_out);
  if (!start) { out.status = out.status || "requested"; return out; }
  out.repaid = loanRepaid(db, loan, asOf); out.outstanding = Math.max(0, loan.amount - out.repaid);
  out.dueMonth = addMonths(start, loan.months);
  for (const m of monthRange(addMonths(start, 1), asOf)) {
    const owed = loan.amount - loanRepaid(db, loan, addMonths(m, -1));
    if (owed <= 0) break;
    out.interestCharged += Math.round(owed * loan.rate);
  }
  out.interestPaid = loanInterestPaid(db, loan, asOf);
  out.interestDue = Math.max(0, out.interestCharged - out.interestPaid);
  out.overdue = out.outstanding > 0 && asOf > out.dueMonth;
  if (!loan.status || loan.status === "active") out.status = out.outstanding <= 0 ? "repaid" : out.overdue ? "overdue" : "active";
  return out;
}
/* EXP LOAN: per member and year – borrowing in the year, repayment in the year, outstanding at the end of the year */
function loanYear(db, code, year) {
  const ls = db.loans.filter(l => l.member === code);
  const end = monthKey(year, 12);
  const borrowing = ls.filter(l => yearOf(l.paid_out) === year).reduce((s, l) => s + l.amount, 0);
  const repayment = sumTx(db, t => t.member === code && t.kind === "loan_repayment" && t.year === year);
  const outstanding = ls.filter(l => l.paid_out && monthOf(l.paid_out) <= end).reduce((s, l) => s + Math.max(0, l.amount - loanRepaid(db, l, end)), 0);
  return { borrowing, repayment, outstanding };
}
const loanOutstanding = (db, code, asOf) => db.loans.filter(l => l.member === code && l.paid_out && monthOf(l.paid_out) <= asOf).reduce((s, l) => s + Math.max(0, l.amount - loanRepaid(db, l, asOf)), 0);

/* ---------------------------------------------------------------- the receipt summary – Receipts rows 114–129 */
function receiptSummary(db, year) {
  const months = Array.from({ length: 12 }, (_, i) => monthKey(year, i + 1));
  const row = kind => months.map(m => kindSum(db, null, kind, year, m));
  const rows = {
    savings: months.map(m => savingsIn(db, null, year, m)), membership: row("membership"), welfare: row("welfare"), penalty: row("penalty"),
    loan_interest: row("loan_interest"), loan_repayment: row("loan_repayment"), investment_return: row("investment_return"), other_income: row("other_income"),
  };
  rows.total = months.map((_, i) => Object.values(rows).reduce((s, r) => s + r[i], 0));
  return { months, rows };
}
/* cash held outside the fund at the end of a month: everything received − put into the fund + taken out of the fund
   − loans paid out − expenses − savings paid back to members */
function cashAtHand(db, upTo) {
  const inn = sumTx(db, t => MONEY_IN.includes(t.kind) && t.month <= upTo);
  const out = sumTx(db, t => (t.kind === "expense" || t.kind === "withdrawal") && t.month <= upTo);
  const fund = db.fund.filter(f => f.month <= upTo && !f.opening).reduce((s, f) => s + f.deposits - f.withdrawals, 0);
  const lent = db.loans.filter(l => l.paid_out && monthOf(l.paid_out) <= upTo && !l.before_records).reduce((s, l) => s + l.amount, 0);
  return inn - out - fund - lent;
}

/* ---------------------------------------------------------------- member table – Group Dashboard rows 124–140 */
function memberRow(db, m, year, mIdx) {
  const repMonth = monthKey(year, mIdx), monthly = Array.from({ length: 12 }, (_, i) => savingsIn(db, m.code, year, monthKey(year, i + 1)));
  const yearSavings = monthly.slice(0, mIdx).reduce((a, b) => a + b, 0);
  const monthlyTarget = num(m.monthly_target), annualTarget = num(m.annual_target) || monthlyTarget * 12;
  const currentTarget = monthlyTarget * mIdx, gap = currentTarget - yearSavings;
  const paidMonths = monthly.slice(0, mIdx).filter(v => v > 0).length;
  const consistency = paidMonths === 0 ? "None" : paidMonths < mIdx ? "Partial" : "Saved";
  const insight = gap === 0 ? "On target" : gap > 0 ? `${fmt(gap)} to catch up` : `Ahead by ${fmt(-gap)}`;
  const momentum = yearSavings === 0 ? "Not started" : yearSavings > currentTarget ? "Above" : yearSavings === currentTarget ? "Stable" : "Declining/Stagnant";
  const risk = paidMonths === mIdx ? "On Track" : mIdx - paidMonths === 1 ? "Watch" : "At Risk";
  return {
    code: m.code, name: m.name, registration: kindSum(db, m.code, "membership", year), yearSavings, totalSavings: savingsBalance(db, m.code, repMonth),
    loan: loanOutstanding(db, m.code, repMonth), monthlyTarget, currentTarget, annualTarget, gap, consistency, insight, paidMonths, momentum, risk, monthly,
  };
}
const activeMembers = db => db.members.filter(m => !m.status || /^(active|paused)$/i.test(m.status));

/* ---------------------------------------------------------------- dashboard figures – Group Dashboard rows 5–7 and 65–73 */
function kpis(db, alloc, year, mIdx) {
  const rep = monthKey(year, mIdx), act = activeMembers(db);
  const interestYear = db.fund.filter(f => yearOf(f.month) === year && f.month <= rep && !f.opening).reduce((s, f) => s + f.interest, 0);
  const interestAll = db.fund.filter(f => f.month <= rep).reduce((s, f) => s + f.interest, 0);
  const last = db.fund.find(f => f.month === rep);
  const daily = db.fund.filter(f => yearOf(f.month) === year && f.month <= rep && !f.opening).map(f => f.interest / daysInMonth(f.month));
  return {
    registered: act.filter(m => kindSum(db, m.code, "membership", year) > 0).length, total: act.length,
    totalSaved: act.reduce((s, m) => s + savingsBalance(db, m.code, rep), 0),
    yearSaved: act.reduce((s, m) => s + memberRow(db, m, year, mIdx).yearSavings, 0),
    interestYear, interestAll, interestLastMonth: last ? last.interest : 0, highestDaily: daily.length ? Math.max(...daily) : 0,
    fundValue: fundRows(db).filter(f => f.month <= rep).at(-1)?.running || 0,
    shared: [...alloc.perMember.values()].reduce((a, b) => a + b, 0),
  };
}
const yearTarget = (db, y) => num(db.settings[`target_${y}`]);
function yearActuals(db, years) { return years.map(y => ({ year: y, actual: db.members.reduce((s, m) => s + savingsIn(db, m.code, y), 0), target: yearTarget(db, y) })); }
/* quarters, cumulative from 1 January, against a quarter of the annual target per quarter */
function quarterActuals(db, year, upToMonth) {
  return [1, 2, 3, 4].map(q => {
    const end = monthKey(year, q * 3), cut = upToMonth && end > upToMonth ? upToMonth : end;
    const actual = db.tx.filter(t => t.year === year && t.month <= cut && (t.kind === "savings" || t.kind === "withdrawal")).reduce((s, t) => s + (t.kind === "savings" ? t.amount : -t.amount), 0);
    return { label: `${year} Q${q}`, actual: upToMonth && monthKey(year, q * 3 - 2) > upToMonth ? 0 : actual, target: Math.round(yearTarget(db, year) / 12 * q * 3) };
  });
}

/* ---------------------------------------------------------------- statement – STT */
function statement(db, alloc, code, year) {
  const end = monthKey(year, 12), ly = loanYear(db, code, year);
  return {
    savings: savingsBalance(db, code, end), membership: kindSum(db, code, "membership", null), welfare: kindSum(db, code, "welfare", null), penalties: kindSum(db, code, "penalty", null),
    loanInterest: kindSum(db, code, "loan_interest", null), loanRepayment: kindSum(db, code, "loan_repayment", null),
    interestYear: interestOf(alloc, code, year), interestAll: interestOf(alloc, code), fundBalance: fundBalance(db, alloc, code, end),
    borrowingYear: ly.borrowing, repaidYear: ly.repayment, outstanding: ly.outstanding,
  };
}

/* ---------------------------------------------------------------- year-end dividend and share-out – the 2021 sheets */
function dividendSplit(db, year, pool, basis) {
  const end = monthKey(year, 12), act = activeMembers(db);
  const base = act.map(m => ({ m, w: Math.max(0, basis === "fund" ? fundBalance(db, allocateInterest(db), m.code, end) : savingsBalance(db, m.code, end)) }));
  const W = base.reduce((s, x) => s + x.w, 0), P = Math.round(num(pool));
  const rows = base.map(({ m, w }) => ({ code: m.code, name: m.name, savings: savingsBalance(db, m.code, end), weight: w, dividend: W ? Math.floor(P * w / W) : 0, borrowing: loanOutstanding(db, m.code, end) }));
  let rest = P - rows.reduce((s, r) => s + r.dividend, 0);
  for (const r of [...rows].sort((a, b) => b.weight - a.weight)) { if (rest <= 0 || !r.weight) break; r.dividend++; rest--; }
  return rows;
}

/* ---------------------------------------------------------------- checks shown on every money screen */
function checks(db, alloc) {
  const out = [];
  for (const f of db.fund) {
    if (!f.interest || f.opening) continue;
    const sh = alloc.byMonth.get(f.month), sum = sh ? [...sh.values()].reduce((a, b) => a + b, 0) : 0;
    if (alloc.unshared.has(f.month)) out.push({ level: "warn", text: `${f.month}: fund interest ${fmt(f.interest)} could not be shared – no member had a balance at the start of the month.` });
    else if (Math.round(f.interest) !== sum) out.push({ level: "err", text: `${f.month}: shared ${fmt(sum)} but the fund earned ${fmt(f.interest)}.` });
  }
  const opening = db.fund.filter(f => f.opening && f.interest);
  for (const f of opening) out.push({ level: "info", text: `Opening fund interest ${fmt(f.interest)} (${f.month}) is brought forward and not shared, since it predates the records.` });
  for (const t of db.tx) if (t.member && !db.members.some(m => m.code === t.member)) out.push({ level: "err", text: `${t.date}: a ${KINDS[t.kind] || t.kind} names "${t.member}", who is not in the member list.` });
  for (const t of db.tx) if (t.kind === "loan_repayment" && !db.loans.some(l => l.code === t.loan)) out.push({ level: "warn", text: `${t.date}: a loan repayment of ${fmt(t.amount)} is not linked to a loan.` });
  return out;
}

/* ---------------------------------------------------------------- numbers in words (Loan Application: "In words") */
function inWords(n) {
  n = Math.round(num(n)); if (n === 0) return "zero";
  const a = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const three = x => { let s = ""; if (x >= 100) { s += a[Math.floor(x / 100)] + " hundred"; x %= 100; if (x) s += " and "; } if (x >= 20) { s += b[Math.floor(x / 10)]; if (x % 10) s += "-" + a[x % 10]; } else if (x) s += a[x]; return s; };
  const parts = []; const units = [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"], [1, ""]];
  for (const [u, w] of units) if (n >= u) { parts.push(three(Math.floor(n / u)) + (w ? " " + w : "")); n %= u; }
  return parts.join(" ").trim();
}

if (typeof module !== "undefined") module.exports = { KINDS, MONTHS, num, monthKey, addMonths, monthRange, buildDb, allocateInterest, interestOf, fundBalance, savingsBalance, savingsIn, kindSum, fundRows, loanSchedule, loanState, loanYear, loanOutstanding, receiptSummary, cashAtHand, memberRow, kpis, yearActuals, quarterActuals, statement, dividendSplit, checks, inWords, lastDataMonth, dataYears };
