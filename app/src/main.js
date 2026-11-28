/* KAM – editing, dialogs, the data folder and start. Runs last. */
const APP_SRC = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;   /* this app as loaded – goes into the handover zip */

/* the properties each kind of note has (shown in the editor; any other property already in a note is kept and shown too) */
const STATUS_MEMBER = ["active", "paused", "left", "prospective"], STATUS_LOAN = ["requested", "active", "repaid", "defaulted", "declined"];
const FIELDS = {
  member: [["code", "text"], ["title", "text"], ["status", STATUS_MEMBER], ["joined", "date"], ["role", "text"], ["country", "text"], ["city", "text"], ["timezone", "text"], ["email", "text"], ["phone", "text"],
    ["monthly_target", "number"], ["annual_target", "number"], ["workbook_interest_2025", "number"], ["workbook_interest_2026", "number"]],
  transaction: [["date", "date"], ["member", "member"], ["kind", Object.keys(KINDS)], ["amount", "number"], ["loan", "loan"], ["project", "project"], ["reference", "text"]],
  loan: [["code", "text"], ["member", "member"], ["guarantor", "member"], ["applied", "date"], ["approved", "date"], ["paid_out", "date"], ["amount", "number"], ["rate", "number"], ["months", "number"], ["purpose", "text"], ["status", STATUS_LOAN]],
  fund: [["month", "month"], ["deposits", "number"], ["withdrawals", "number"], ["interest", "number"], ["source", "text"]],
  objective: [["code", "text"], ["title", "text"], ["measure", "text"]],
  project: [["code", "text"], ["title", "text"], ["objective", "objective"], ["committee", "text"], ["cost", "number"], ["progress", "number"], ["start", "date"], ["end", "date"], ["comment", "text"]],
  task: [["title", "text"], ["project", "project"], ["phase", "text"], ["owner", "member"], ["progress", "number"], ["start", "date"], ["end", "date"], ["order", "number"]],
  meeting: [["date", "date"], ["title", "text"], ["attendees", "list"]],
  plan: [["title", "text"]], funding: [["title", "text"], ["approved", "date"], ["amount", "number"]],
  devnote: [["date", "date"], ["title", "text"], ["kind", DEV_KINDS], ["page", "text"], ["status", DEV_STATUS], ["sent", "date"]],
  year: [["year", "number"], ["pool", "number"], ["decided", "date"]], cashcount: [["date", "date"], ["title", "text"]], update: [["date", "date"], ["title", "text"]],
  settings: [["sacco_name", "text"], ["currency", "text"], ["fund_name", "text"], ["loan_rate", "number"], ["loan_max_months", "number"], ["default_fee", "number"], ["registration_fee", "number"],
    ["vision", "text"], ["highlights", "list"], ["agenda", "list"], ["banknotes", "list"], ["admin", "text"], ["admin_year", "number"], ["appdev", ["on", "off"]], ["dev_email", "text"]],
};
const LABELS = { title: "Name / title", sacco_name: "SACCO name", fund_name: "Fund name", loan_rate: "Loan interest per month (0.05 = 5%)", loan_max_months: "Longest repayment (months)", default_fee: "Default fee",
  registration_fee: "Registration fee", monthly_target: "Monthly savings target", annual_target: "Annual savings target", workbook_interest_2025: "Interest the workbook showed, 2025", workbook_interest_2026: "Interest the workbook showed, 2026",
  paid_out: "Paid out", admin: "This year's admin (code)", admin_year: "Admin year", highlights: "Last month's highlights (one per line)", agenda: "Standing agenda (item | responsible, one per line)", banknotes: "Banknotes for the cash count", attendees: "Attendees (one per line)", appdev: "AppDev page", dev_email: "Developer's email (AppDev)", page: "About the page" };
const BODY_LABEL = { devnote: "Comment", meeting: "Minutes and decisions", plan: "The plan", loan: "Notes", member: "Notes", project: "Notes", settings: "Notes" };

/* ---------------------------------------------------------------- the editor */
function fieldInput(key, kind, value) {
  const id = `f_${key}`, v = Array.isArray(value) ? value.join("\n") : (value ?? "");
  if (Array.isArray(kind)) return `<select id="${id}" title="${esc(LABELS[key] || key)}">${["", ...kind].map(o => `<option ${String(v) === o ? "selected" : ""} value="${esc(o)}">${esc(KINDS[o] || o)}</option>`).join("")}</select>`;
  const same = val => kind === "member" ? (v !== "" && db.memberCode(v) === db.memberCode(val)) : (v !== "" && linkName(v).toLowerCase() === linkName(val).toLowerCase());
  const opts0 = o => o.some(([val]) => same(val)) || !v ? o : [[v, `${linkName(v)} (not found)`], ...o];
  const sel = (opts) => `<select id="${id}" title="${esc(LABELS[key] || key)}"><option value="">–</option>${opts0(opts).map(([val, lab]) => `<option value="${esc(val)}" ${same(val) ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`;
  if (kind === "member") return sel(db.members.map(m => [`[[${m.code} ${m.name}]]`, `${m.code} ${m.name}`]));
  if (kind === "loan") return sel(db.loans.map(l => [`[[${l.note.name}]]`, `${l.code} – ${mName(l.member)}`]));
  if (kind === "project") return sel(db.projects.map(p => [`[[${p.note.name}]]`, `${p.code || ""} ${p.title}`]));
  if (kind === "objective") return sel(db.objectives.map(o => [`[[${o.code}]]`, `${o.code} ${o.title}`]));
  if (kind === "list") return `<textarea id="${id}" style="min-height:70px" title="${esc(LABELS[key] || key)}">${esc(v)}</textarea>`;
  return `<input id="${id}" type="${kind === "number" ? "text" : kind}" inputmode="${kind === "number" ? "decimal" : "text"}" value="${esc(v)}" title="${esc(LABELS[key] || key)}" style="width:100%">`;
}
function openEditor(type, note, preset = {}) {
  const props = note ? note.props : { ...preset };
  let fields = [...(FIELDS[type] || [])];
  if (type === "settings") for (const y of [...dataYears(db), view.year, view.year + 1]) if (!fields.some(f => f[0] === `target_${y}`)) fields.push([`target_${y}`, "number"]);
  for (const k of Object.keys(props)) if (!["type", "modified"].includes(k) && !fields.some(f => f[0] === k)) fields.push([k, Array.isArray(props[k]) ? "list" : "text"]);
  const body = note ? note.body : (preset.__body || "");
  $("dlgBody").innerHTML = `<h2 style="margin-top:0">${note ? "Edit" : "New"} ${esc(type)}</h2><div class="form">${fields.map(([k, kind]) => `<label for="f_${k}">${esc(LABELS[k] || k.replace(/_/g, " "))}</label>${fieldInput(k, kind, props[k])}`).join("")}
    ${type in BODY_LABEL || type === "meeting" || type === "plan" ? `<label for="f__body">${esc(BODY_LABEL[type] || "Notes")}</label><textarea id="f__body" title="Free text">${esc(body)}</textarea>` : ""}</div>
    <div class="row" style="margin-top:14px"><button class="primary" id="edSave" title="Save the note">Save</button><button id="edCancel" title="Close without saving">Cancel</button>
    ${note && type !== "settings" ? `<button id="edDelete" style="margin-left:auto" class="bad" title="Delete this note from the data folder">Delete</button>` : ""}</div><p class="muted small">${note ? `File: ${esc(note.path)}` : ""}</p>`;
  $("dlg").showModal();
  $("edCancel").onclick = () => $("dlg").close();
  $("edSave").onclick = () => guarded(async () => {
    const out = {};
    for (const [k, kind] of fields) {
      const el = $(`f_${k}`); if (!el) continue; let v = el.value.trim();
      if (kind === "list") v = v.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      else if (kind === "number" && v !== "") { const n = Number(v.replace(/[ ,_]/g, "")); if (!isFinite(n)) throw new Error(`"${LABELS[k] || k}" must be a number.`); v = String(n); }
      out[k] = v;
    }
    if (type === "transaction" && !(num(out.amount) > 0)) throw new Error("Give an amount above zero.");
    if (type === "member" && (!out.code || !out.title)) throw new Error("A member needs a code (e.g. K014) and a name.");
    if (type === "member" && !note && db.members.some(m => m.code.toLowerCase() === out.code.toLowerCase())) throw new Error(`There is already a member ${out.code}.`);
    const b = $("f__body") ? $("f__body").value : undefined;
    if (note) await saveNote(note, out, b); else await createNote(type, out, b || "");
    $("dlg").close(); refreshDb(); render(); status("Saved.");
  });
  if ($("edDelete")) $("edDelete").onclick = () => guarded(async () => {
    if (!confirm("Delete this note from the data folder? This cannot be undone in the app.")) return;
    await deleteNote(note); $("dlg").close(); refreshDb(); render(); status("Deleted.");
  });
}
const findNote = path => store.notes.get(path);

/* ---------------------------------------------------------------- new notes with sensible defaults */
function newOf(type) {
  const y = view.year, pre = {
    member: { code: `K${String(db.members.length + 1).padStart(3, "0")}`, status: "active", joined: todayISO(), monthly_target: 130000 },
    loan: { code: `L${y}-${String(db.loans.filter(l => String(l.code).includes(String(y))).length + 1).padStart(2, "0")}`, applied: todayISO(), rate: db.settings.loan_rate || 0.05, months: db.settings.loan_max_months || 4, status: "requested" },
    fund: { month: (() => { const m = db.fund.at(-1); return m ? addMonths(m.month, 1) : repMonthKey(); })(), deposits: "", withdrawals: 0, interest: "" },
    project: { code: "", progress: 0, start: todayISO() }, objective: { code: `OB${String(db.objectives.length + 1).padStart(3, "0")}` },
    task: { progress: 0, start: todayISO(), order: db.tasks.length + 1 }, plan: {}, funding: { approved: todayISO() },
  }[type] || {};
  openEditor(type, null, pre);
}
function openPayment(member, kind = "savings", loan = "") {
  const l = db.loans.find(x => x.code === loan);
  openEditor("transaction", null, { date: todayISO(), member: member ? mLink(member) : "", kind, amount: "", loan: l ? `[[${l.note.name}]]` : "", project: "", reference: "" });
}

/* ---------------------------------------------------------------- page events */
function wire() {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener("click", e => { e.preventDefault(); fn(el); }));
  on("#tabs [data-tab]", el => go(el.dataset.tab, { loan: "", receiptsKind: "all" }));
  on("[data-go]", el => go(el.dataset.go));
  on("#navToggle", () => { try { localStorage.setItem("kam-nav", navMini() ? "wide" : "mini"); } catch {} renderTabs(); wire(); });
  on("[data-tour]", () => guarded(startTour));
  on("[data-act]", el => { const [k, v] = el.dataset.act.split(/:(.*)/s); if (k === "member") go("member", { member: v }); else if (k === "loan") go("loans", { loan: v }); else if (k === "edit") { const n = findNote(v); if (n) openEditor(n.type, n); } else if (k === "new") newOf(v); else go(v); });
  if ($("appdevToggle")) $("appdevToggle").onclick = () => guarded(async () => { await saveNote(settingsNote(), { appdev: appdevOn() ? "off" : "on" }); refreshDb(); render(); status(`AppDev is ${appdevOn() ? "on" : "off"}.`); });
  if ($("devNew")) $("devNew").onclick = () => guarded(async () => {
    const title = $("devTitle").value.trim(), text = $("devText").value.trim();
    if (!title && !text) throw new Error("Write a subject or a comment first.");
    await createNote("devnote", { date: todayISO(), title: title || text.slice(0, 60), kind: $("devKind").value, page: $("devPage").value, status: "new" }, text);
    refreshDb(); render(); status("Comment saved. Send it with <b>Send to Geir</b> when you're ready.");
  });
  const unsentDev = () => devnotes().filter(d => (d.status || "new") === "new");
  if ($("devSend")) $("devSend").onclick = () => {
    const list = unsentDev(); if (!list.length) return;
    if (!devEmail()) { status("Add the developer's email under Settings › Edit settings first.", "err"); return; }
    let body = devMailText(list); if (body.length > 1800) body = body.slice(0, 1700) + "\n\n[Too long for an email link – the full text is copied; paste it here.]";
    if (body.includes("[Too long")) navigator.clipboard && navigator.clipboard.writeText(devMailText(list)).catch(() => {});
    location.href = `mailto:${encodeURIComponent(devEmail())}?subject=${encodeURIComponent(`KAM AppDev – ${list.length} comment${list.length > 1 ? "s" : ""}`)}&body=${encodeURIComponent(body)}`;
    $("devAfter").innerHTML = `<div class="banner warn">Did the email go? <button class="primary" id="devMark" title="Mark these comments as sent">Yes – mark ${list.length} as sent</button></div>`;
    $("devMark").onclick = () => guarded(async () => { for (const d of list) await saveNote(d.note, { status: "sent", sent: todayISO() }); refreshDb(); render(); status("Marked as sent."); });
  };
  if ($("devCopy")) $("devCopy").onclick = () => guarded(async () => { await navigator.clipboard.writeText(devMailText(unsentDev())); status("Copied – paste into an email to the developer."); });
  on("[data-member]", el => go("member", { member: el.dataset.member }));
  on("[data-edit]", el => { const n = findNote(el.dataset.edit); if (n) openEditor(n.type, n); });
  on("[data-new]", el => newOf(el.dataset.new));
  on("[data-pay]", el => openPayment(el.dataset.pay, el.dataset.paykind || "savings", el.dataset.payloan || ""));
  on("[data-loan]", el => go("loans", { loan: el.dataset.loan }));
  on("[data-loanback]", () => go("loans", { loan: "" }));
  on("[data-apply]", el => go("apply", { loan: el.dataset.apply }));
  on("[data-round]", () => go("receipts", { receiptsKind: "round" }));
  on("[data-roundback]", () => go("receipts", { receiptsKind: "all" }));
  on("[data-newmeeting]", () => { const ag = asList(db.settings.agenda).map((a, i) => `${i + 1}. ${String(a).split("|")[0].trim()}`).join("\n"); openEditor("meeting", null, { date: todayISO(), title: "Monthly meeting", attendees: [], __body: `## Agenda\n\n${ag}\n\n## Decisions\n\n- ` }); });
  on("[data-saveyear]", el => guarded(async () => {
    const y = Number(el.dataset.saveyear), pool = num($("divPool").value), rows = dividendSplit(db, y, pool, "savings");
    const body = `| Member | Savings | Dividend |\n| --- | --- | --- |\n` + rows.map(r => `| ${r.code} ${r.name} | ${r.savings} | ${r.dividend} |`).join("\n");
    await createNote("year", { title: `${y} year-end`, year: y, pool, decided: todayISO(), basis: "savings", dividends: rows.map(r => `${r.code}: ${r.dividend}`) }, body);
    refreshDb(); render(); status(`Saved the ${y} year-end record.`);
  }));
  const pick = $("pickMember"); if (pick) pick.onchange = () => pick.value && go("member", { member: pick.value });
  const gs = $("ganttStart"); if (gs) gs.onchange = () => { view.ganttStart = gs.value; render(); };
  const dy = $("divYear"); if (dy) dy.onchange = () => { view.divYear = Number(dy.value); view.divPool = ""; render(); };
  const dp = $("divPool"); if (dp) dp.onchange = () => { view.divPool = dp.value; render(); };
  const rm = $("roundMonth"); if (rm) rm.onchange = () => { view.roundMonth = rm.value; render(); };
  if ($("roundSave")) $("roundSave").onclick = () => guarded(async () => {
    const date = $("roundDate").value || `${$("roundMonth").value}-01`; let n = 0;
    if (date.slice(0, 7) !== $("roundMonth").value) throw new Error("The payment date must be in the chosen month.");
    for (const el of document.querySelectorAll(".rin")) {
      const a = num(el.value); if (!(a > 0)) continue;
      const code = el.dataset.m, kind = el.dataset.k, loan = kind.startsWith("loan_") ? db.loans.find(l => l.member === code && loanState(db, l, date.slice(0, 7)).outstanding > 0) : null;
      if (kind.startsWith("loan_") && !loan) throw new Error(`${mName(code)} has no open loan for a ${KINDS[kind].toLowerCase()}.`);
      await createNote("transaction", { date, member: mLink(code), kind, amount: a, loan: loan ? `[[${loan.note.name}]]` : "", reference: "Monthly round" }); n++;
    }
    refreshDb(); view.receiptsKind = "all"; render(); status(`Saved ${n} payment${n === 1 ? "" : "s"}.`);
  });
  /* cash count */
  const ccUpdate = () => { let t = 0; document.querySelectorAll(".cc").forEach(el => { const v = num(el.dataset.d) * num(el.value); t += v; $("cc" + el.dataset.d).textContent = nn(v); }); if ($("ccTotal")) $("ccTotal").textContent = money(t); };
  document.querySelectorAll(".cc").forEach(el => el.addEventListener("input", ccUpdate)); ccUpdate();
  if ($("ccSave")) $("ccSave").onclick = () => guarded(async () => {
    const p = { date: $("ccDate").value || todayISO(), title: "Cash count" }; document.querySelectorAll(".cc").forEach(el => { if (num(el.value)) p["n" + el.dataset.d] = num(el.value); });
    await createNote("cashcount", p); refreshDb(); render(); status("Cash count saved.");
  });
  /* updates */
  if ($("copyMail")) $("copyMail").onclick = () => guarded(async () => {
    const u = updateParts();
    if (navigator.clipboard && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([u.html], { type: "text/html" }), "text/plain": new Blob([u.text], { type: "text/plain" }) })]);
    else await navigator.clipboard.writeText(u.text);
    status("Copied. Open the email and paste (Ctrl+V).");
  });
  if ($("markSent")) $("markSent").onclick = () => guarded(async () => { const u = updateParts(); await createNote("update", { date: todayISO(), title: u.subject, month: repMonthKey(), recipients: u.emails }, u.text); refreshDb(); render(); status("Recorded as sent."); });
  /* settings */
  if ($("pickFolder")) $("pickFolder").onclick = pickFolder;
  if ($("reload")) $("reload").onclick = () => guarded(async () => { await scanStore(); refreshDb(); render(); status("Read again."); });
  if ($("setup")) $("setup").onclick = () => guarded(setupFolder);
  if ($("handover")) $("handover").onclick = () => guarded(handover);
}

/* ---------------------------------------------------------------- the data folder */
async function useFolder(h, ask) {
  if (h.queryPermission) { let p = await h.queryPermission({ mode: "readwrite" }); if (p !== "granted" && ask) p = await h.requestPermission({ mode: "readwrite" }); if (p !== "granted") return welcome(h); }
  store.root = h; store.demo = false; $("demoBand").hidden = true;
  try { await idb("readwrite", st => st.put(h, "folder")); } catch {}
  $("main").innerHTML = `<p class="muted">Reading ${esc(h.name)}…</p>`;
  await scanStore();
  $("folderChip").textContent = `📁 ${h.name}`; $("folderChip").title = "The data folder KAM is working in";
  refreshDb();
  if (!settingsNote()) { view.tab = "settings"; render(); status("This folder has no KAM settings yet. If it is the right (empty) folder, press <b>Set up this folder for KAM</b>.", "warn"); return; }
  render();
}
async function pickFolder() {
  if (!window.showDirectoryPicker) { status("This browser can't open folders. Use <b>Chrome</b> or <b>Edge</b> on a computer, and open KAM.html directly.", "err"); return; }
  try { await useFolder(await window.showDirectoryPicker({ id: "kam-data", mode: "readwrite" }), true); } catch (e) { if (e.name !== "AbortError") status(esc(e.message), "err"); }
}
async function setupFolder() {
  await createNote("settings", { title: "KAM settings", sacco_name: "", currency: "UGX", fund_name: "UAP", interest_rule: "start-of-month balance", loan_rate: 0.05, loan_max_months: 4, default_fee: "", registration_fee: 50000,
    [`target_${new Date().getFullYear()}`]: "", vision: "", highlights: [], agenda: ["Opening prayer | Selected member", "Welcome note and introduction | Chairperson", "Review of previous minutes | Secretary", "Review of financial position | Treasurer", "Any other SACCO business | Chairperson", "AOB | Round table", "Closing prayer | Selected member"],
    banknotes: [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100], admin: "", admin_year: new Date().getFullYear() }, "");
  refreshDb(); render(); status("The folder is set up. Add the members under <b>Members</b>, then record payments.");
}
async function startDemo() {
  const root = new MemDir("Demo data");
  for (const [path, text] of Object.entries(APP.demo)) {
    const parts = path.split("/"), name = parts.pop(); let d = root;
    for (const p of parts) d = await d.getDirectoryHandle(p, { create: true });
    const f = await d.getFileHandle(name, { create: true }), w = await f.createWritable(); await w.write(text); await w.close();
  }
  store.root = root; store.demo = true; $("demoBand").hidden = false; $("folderChip").textContent = "Demo data";
  await scanStore(); view.year = 0; refreshDb(); view.tab = "home"; render();
}
function welcome(h) {
  $("tabs").hidden = true; $("frame").classList.add("nomenu"); $("period").hidden = true;
  $("main").innerHTML = `<div class="welcome"><div class="card"><h1>Welcome to KAM</h1>
  <p>KAM keeps the SACCO's records in a <b>data folder</b> on this computer. The folder usually comes from last year's admin, in the handover zip – unzip it first.</p>
  <div class="row">${h ? `<button class="primary" id="wReconnect" title="Give KAM access to ${esc(h.name)} again">Reconnect ${esc(h.name)}</button>` : ""}
  <button class="primary" id="wTour" title="A short guided tour on made-up data">Take the tour</button>
  <button id="wPick" title="Choose the data folder (or an empty folder to start a new one)">Open the data folder</button><button id="wDemo" title="Look around with made-up data – nothing is saved">Try the demo</button></div>
  <p class="muted small">Works in Chrome or Edge on a computer. The data stays on this computer – KAM sends nothing anywhere.</p></div></div>`;
  $("wPick").onclick = pickFolder; $("wTour").onclick = () => guarded(startTour); $("wDemo").onclick = () => guarded(startDemo);
  if (h) $("wReconnect").onclick = () => guarded(() => useFolder(h, true));
}

/* ---------------------------------------------------------------- the handover zip */
async function handover() {
  const enc = new TextEncoder(), files = [], end = repMonthKey(), k = kpis(db, alloc, view.year, view.month);
  const addDir = async (dir, path) => { for await (const [name, h] of dir.entries()) { if (name.startsWith(".")) continue; const p = path ? `${path}/${name}` : name;
    if (h.kind === "directory") await addDir(h, p); else files.push({ name: `KAM-data/${p}`, data: new Uint8Array(await (await h.getFile()).arrayBuffer()) }); } };
  await addDir(store.root, "");   /* every file in the folder – notes, the archive, anything else kept there */
  const lines = [`KAM handover – ${db.settings.sacco_name || ""}`, `Made ${nowISO()} by the ${db.settings.admin_year || view.year} admin (${db.settings.admin || "–"})`, `Figures as at the end of ${end}`, "",
    `Notes in the data folder: ${store.notes.size}`, `Total saved: ${money(k.totalSaved)}`, `Fund value: ${money(k.fundValue)}`, `Interest shared to date: ${money(k.shared)}`, "", "Member            Savings      Fund balance   Loan outstanding"];
  let check = 0;
  for (const m of db.members) { const s = savingsBalance(db, m.code, end), f = fundBalance(db, alloc, m.code, end), l = loanOutstanding(db, m.code, end); check += s + f + l; lines.push(`${(m.code + " " + m.name).padEnd(28).slice(0, 28)} ${nn(s).padStart(12)} ${nn(f).padStart(14)} ${nn(l).padStart(14)}`); }
  lines.push("", `Check number: ${check}`, "", "The next admin: unzip, open KAM.html in Chrome or Edge, choose Open the data folder › KAM-data. Settings › Download handover zip shows the same check number when everything arrived.");
  files.push({ name: "Handover summary.txt", data: enc.encode(lines.join("\r\n")) }, { name: "KAM.html", data: enc.encode(APP_SRC) });
  const blob = makeZip(files), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `KAM-handover-${todayISO()}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status(`Handover zip made: ${files.length} files. Check number ${check}.`);
}

/* ---------------------------------------------------------------- start */
$("repYear").onchange = () => { view.year = Number($("repYear").value); render(); };
$("repMonth").onchange = () => { view.month = Number($("repMonth").value); render(); };
$("leaveDemo").onclick = () => location.reload();
document.title = `KAM ${APP.version}`;
(async () => {
  let h = null; try { h = await idb("readonly", st => st.get("folder")); } catch {}
  if (location.hash === "#demo") return guarded(startDemo);
  if (h) { try { if (h.queryPermission && (await h.queryPermission({ mode: "readwrite" })) === "granted") return guarded(() => useFolder(h, false)); } catch {} }
  welcome(h);
})();
