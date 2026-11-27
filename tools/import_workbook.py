"""Import the group's Excel workbook into a KAM data folder, following docs/data-model.md.

Runs only in the cloud workspace. The output (the data folder and its zip) holds the group's real data and must
never be committed – .gitignore blocks KAM-data*/ and *.zip. This script holds no data itself: it reads cell
positions described in docs/workbook-analysis.md.

Run:  python3 tools/import_workbook.py <workbook.xlsx> <out-folder> [--dev-email ADDRESS] [--admin CODE]
Then: node tools/report_import.mjs <out-folder>   (writes the import report, comparing with the workbook figures)
"""
import argparse
import datetime as dt
import difflib
import json
import os
import re
import shutil
import warnings

import openpyxl

warnings.filterwarnings("ignore")
YEARS = {2025: 7, 2026: 22}          # first month column (G, V) per year in Receipts
KIND_ROWS = ["savings", "membership", "welfare", "penalty", "loan_interest", "loan_repayment"]
TZ_BY_COUNTRY = {"uganda": "Africa/Kampala", "netherlands": "Europe/Amsterdam", "south korea": "Asia/Seoul", "kuwait": "Asia/Kuwait",
                 "united arab emirates": "Asia/Dubai", "united kingdom": "Europe/London", "denmark": "Europe/Copenhagen", "usa": "America/New_York",
                 "kenya": "Africa/Nairobi", "sweden": "Europe/Stockholm", "norway": "Europe/Oslo", "germany": "Europe/Berlin"}


def yaml(v):
    s = str(v)
    if s == "":
        return '""'
    if re.search(r'[:#\[\]{},"\'|>&*!%@`]', s) or s.strip() != s or s.lower() in ("true", "false", "yes", "no", "null", "on", "off"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


class Out:
    def __init__(self, root):
        self.root, self.count = root, {}

    def note(self, folder, name, props, body=""):
        name = re.sub(r'[\\/:*?"<>|#^\[\]]+', " ", name).strip()
        path = os.path.join(self.root, folder, name + ".md")
        i = 2
        while os.path.exists(path):
            path = os.path.join(self.root, folder, f"{name} {i}.md"); i += 1
        os.makedirs(os.path.dirname(path), exist_ok=True)
        lines = ["---"]
        for k, v in props.items():
            if isinstance(v, list):
                lines += [f"{k}:"] + [f"  - {yaml(x)}" for x in v] if v else [f"{k}: []"]
            elif v is None or v == "":
                lines.append(f"{k}:")
            else:
                lines.append(f"{k}: {yaml(v)}")
        lines += ["---", ""]
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + (body.strip() + "\n" if body and body.strip() else ""))
        t = props.get("type", "?"); self.count[t] = self.count.get(t, 0) + 1
        return os.path.basename(path)[:-3]


def num(v):
    try:
        return float(v) if v not in (None, "") else 0.0
    except (TypeError, ValueError):
        return 0.0


def iso(v):
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    return ""


def tokens(name):
    return [t for t in re.split(r"[\s.]+", str(name or "").lower()) if len(t) > 1]


def same_person(a, b):
    """Two spellings of one name: at least two words match closely (order doesn't matter)."""
    ta, tb = tokens(a), tokens(b)
    hits = sum(1 for x in ta if any(difflib.SequenceMatcher(None, x, y).ratio() >= 0.8 for y in tb))
    return hits >= min(2, len(ta), len(tb))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx"); ap.add_argument("out")
    ap.add_argument("--dev-email", default=""); ap.add_argument("--admin", default="")
    a = ap.parse_args()
    wb = openpyxl.load_workbook(a.xlsx, data_only=True)
    if os.path.exists(a.out):
        shutil.rmtree(a.out)
    o = Out(a.out)
    rec, gd, ind, exl = wb["Receipts"], wb["Group Dashboard"], wb["Individuals Dashboard "], wb["EXP LOAN"]
    report = {"points": [], "workbook": {}}
    point = lambda s: report["points"].append(s)

    # ---------------------------------------------------------------- members: dashboard table + contacts
    members = []   # dicts with code, title, ...
    for r in range(125, 140):
        code, name = gd.cell(r, 1).value, gd.cell(r, 2).value
        if code and name:
            members.append({"code": str(code).strip(), "title": str(name).strip(), "monthly_target": num(gd.cell(r, 7).value), "annual_target": num(gd.cell(r, 9).value), "status": "active"})
    contacts = {}
    for r in range(71, 90):
        code, name = ind.cell(r, 1).value, ind.cell(r, 2).value
        if not code or not name:
            continue
        contacts[str(code).strip()] = {"name": str(name).strip(), "country": ind.cell(r, 3).value or "", "city": ind.cell(r, 4).value or "", "tz": ind.cell(r, 5).value or "", "email": ind.cell(r, 7).value or ""}
    for code, c in contacts.items():
        if not any(m["code"] == code for m in members):
            members.append({"code": code, "title": c["name"], "status": "prospective", "monthly_target": 0, "annual_target": 0})
            point(f"{code} is in the contact list only – imported as prospective; confirm whether they are a member.")
    for m in members:
        c = contacts.get(m["code"], {})
        if c and not same_person(c["name"], m["title"]):
            point(f"{m['code']}: the contact list name doesn't match the member list name – check the member note.")
        m.update({"country": c.get("country", ""), "city": c.get("city", ""), "email": c.get("email", "")})
        m["timezone"] = TZ_BY_COUNTRY.get(str(m["country"]).strip().lower(), "")
        if m["country"] and not m["timezone"]:
            point(f"{m['code']}: no time zone known for '{m['country']}' – set it on the member note.")

    # ---------------------------------------------------------------- Receipts blocks → members
    blocks = []
    for r in range(3, 110, 8):
        name = rec.cell(r, 2).value
        if name and rec.cell(r, 3).value and str(rec.cell(r, 3).value).strip().lower().startswith("saving"):
            blocks.append((r, str(name).strip()))
    code_of_block = {}
    for i, (r, name) in enumerate(blocks):
        m = next((m for m in members if same_person(name, m["title"])), None)
        if not m and i < len(members):
            m = members[i]; point(f"The Receipts block at row {r} was matched to {m['code']} by position (names differ) – check.")
        if m:
            code_of_block[r] = m["code"]

    # ---------------------------------------------------------------- committee → roles
    mm = wb["Monthly Meeting  "]
    for r in range(13, 30):
        role, name = mm.cell(r, 3).value, mm.cell(r, 4).value
        if not role or not name:
            continue
        m = next((m for m in members if same_person(name, m["title"])), None)
        if m:
            m["role"] = ", ".join(x for x in [m.get("role", ""), str(role).strip()] if x)
        else:
            point(f"Committee role '{str(role).strip()}' – the name given doesn't match any member; the role is not set. Set it on the right member note.")

    # ---------------------------------------------------------------- interest the workbook showed (for comparison)
    for r, _ in blocks:
        m = next(x for x in members if x["code"] == code_of_block.get(r))
        m["workbook_interest_2025"] = round(num(rec.cell(r + 6, 19).value))   # S
        m["workbook_interest_2026"] = round(num(rec.cell(r + 6, 34).value))   # AH

    mlink = {}
    for m in members:
        note_name = o.note("members", f"{m['code']} {m['title']}", {"type": "member", "code": m["code"], "title": m["title"], "status": m["status"], "joined": "",
            "role": m.get("role", ""), "country": m["country"], "city": m["city"], "timezone": m["timezone"], "email": m["email"], "phone": "",
            "monthly_target": round(m["monthly_target"]), "annual_target": round(m["annual_target"]),
            **({"workbook_interest_2025": m["workbook_interest_2025"], "workbook_interest_2026": m["workbook_interest_2026"]} if "workbook_interest_2025" in m else {})})
        mlink[m["code"]] = f"[[{note_name}]]"

    # ---------------------------------------------------------------- loans (EXP LOAN)
    loans = {}
    for r in range(6, 90, 6):
        name = exl.cell(r, 2).value
        if not name or str(exl.cell(r, 3).value or "").strip().lower() != "loan borrowing":
            continue
        m = next((m for m in members if same_person(name, m["title"])), None)
        d_amt, h_amt = num(exl.cell(r, 4).value), sum(num(exl.cell(r, c).value) for c in (8, 9, 10))
        amount = d_amt or h_amt
        if not amount or not m:
            continue
        paid_out = "2024-12-12" if d_amt else "2025-02-28"
        if d_amt and h_amt and d_amt == h_amt:
            point(f"{m['code']}: the loan appears in both the Dec 2024 and the 2025 columns of EXP LOAN with the same amount – imported as one loan paid out {paid_out}.")
        code = f"L{paid_out[:4]}-{len(loans) + 1:02d}"
        loans[m["code"]] = {"code": code, "amount": amount, "repay_total": abs(num(exl.cell(r, 12).value)), "outstanding": num(exl.cell(r, 13).value)}
        loans[m["code"]]["link"] = "[[" + o.note("loans", f"{code} {m['code']}", {"type": "loan", "code": code, "member": mlink[m["code"]], "guarantor": "", "applied": "", "approved": "",
            "paid_out": paid_out, "amount": round(amount), "rate": 0.05, "months": 4, "purpose": "", "status": "active", "source": "workbook"},
            "Imported from EXP LOAN. Guarantor, purpose and the exact dates are not in the workbook – fill them in.") + "]]"
        point(f"Loan {code} ({m['code']}): guarantor, purpose and approval date are not in the workbook – add them on the loan note.")

    # ---------------------------------------------------------------- payments (Receipts)
    def tx(date, code, kind, amount, ref="", loan=""):
        o.note(f"transactions/{date[:4]}", f"{date} {code} {kind}", {"type": "transaction", "date": date, "member": mlink[code], "kind": kind, "amount": round(amount),
            **({"loan": loan} if loan else {}), "reference": ref, "source": "workbook"})
    for r, _ in blocks:
        code = code_of_block.get(r)
        if not code:
            continue
        for k, kind in enumerate(KIND_ROWS):
            row = r + k
            bf = num(rec.cell(row, 6).value)   # F: balance brought forward into 2025
            if bf:
                tx("2024-12-31", code, "withdrawal" if (kind == "savings" and bf < 0) else kind, abs(bf), "Balance brought forward (workbook column F)", loans.get(code, {}).get("link", "") if kind.startswith("loan_") else "")
            for year, c0 in YEARS.items():
                for i in range(12):
                    v = num(rec.cell(row, c0 + i).value)
                    if not v:
                        continue
                    date = f"{year}-{i + 1:02d}-01"
                    if kind == "savings" and v < 0:
                        tx(date, code, "withdrawal", -v)
                    elif kind.startswith("loan_"):
                        ln = loans.get(code)
                        if not ln:
                            point(f"{code}: a {kind.replace('_', ' ')} of {abs(v):,.0f} in {date[:7]} has no loan in EXP LOAN – it is imported without a loan link; link it or correct it.")
                        tx(date, code, kind, abs(v), "", ln["link"] if ln else "")
                    else:
                        tx(date, code, kind, abs(v))
        # the workbook's typed repayment total vs the monthly cells
        ln = loans.get(code)
        if ln:
            cells = sum(abs(num(rec.cell(r + 5, c0 + i).value)) for c0 in YEARS.values() for i in range(12)) + abs(num(rec.cell(r + 5, 6).value))
            gap = ln["repay_total"] - cells
            if gap > 0:
                tx("2025-12-31", code, "loan_repayment", gap, "Workbook total – check with the treasurer (the monthly cells add up to less)", ln["link"])
                point(f"Loan {ln['code']} ({code}): EXP LOAN shows {ln['repay_total']:,.0f} repaid, the monthly cells only {cells:,.0f}. A correcting repayment of {gap:,.0f} dated 2025-12-31 was added – check with the treasurer.")

    # ---------------------------------------------------------------- the fund (rows 108–109)
    f_dep, f_int = num(rec.cell(108, 6).value), num(rec.cell(109, 6).value)
    if f_dep or f_int:
        o.note("fund", "2024-12 Opening balance", {"type": "fund", "month": "2024-12", "opening": "true", "deposits": round(f_dep), "withdrawals": 0, "interest": round(f_int), "source": "Workbook column F (balance brought forward)"})
        if f_int:
            point(f"Opening fund interest of {f_int:,.0f} (before 2025) is kept as 'brought forward' and not shared – the group should decide what to do with it.")
    for year, c0 in YEARS.items():
        for i in range(12):
            d, it = num(rec.cell(108, c0 + i).value), num(rec.cell(109, c0 + i).value)
            if not d and not it:
                continue
            mk = f"{year}-{i + 1:02d}"
            o.note(f"fund/{year}", f"{mk} Fund statement", {"type": "fund", "month": mk, "deposits": round(max(d, 0)), "withdrawals": round(max(-d, 0)), "interest": round(it), "source": "Workbook rows 108–109"})
    report["workbook"]["fund"] = {str(y): {"deposits": sum(num(rec.cell(108, c0 + i).value) for i in range(12)), "interest": sum(num(rec.cell(109, c0 + i).value) for i in range(12))} for y, c0 in YEARS.items()}
    report["workbook"]["members"] = {code_of_block[r]: {"savings": num(rec.cell(r, 35).value), "membership": num(rec.cell(r + 1, 35).value)} for r, _ in blocks if r in code_of_block}
    report["workbook"]["loans"] = {c: {"outstanding": l["outstanding"]} for c, l in loans.items()}
    report["workbook"]["typed_actuals"] = {str(gd.cell(66, c).value): num(gd.cell(67, c).value) for c in (2, 3)}

    # ---------------------------------------------------------------- objectives and projects (Group Dashboard)
    obj_of = {}
    for r in range(12, 20):
        code = gd.cell(r, 1).value
        if not code or not str(code).startswith("OB"):
            continue
        o.note("objectives", f"{code} {str(gd.cell(r, 2).value or '').strip()[:60]}", {"type": "objective", "code": code, "title": str(gd.cell(r, 2).value or "").strip(), "measure": str(gd.cell(r, 6).value or "").strip()})
        for c in (10, 11):
            for p in re.split(r"[,\s]+", str(gd.cell(r, c).value or "")):
                if p:
                    if p in obj_of and obj_of[p] != code:
                        point(f"Project {p} is listed under both {obj_of[p]} and {code} – linked to {obj_of[p]}.")
                    obj_of.setdefault(p, code)
    for r in range(50, 63):
        code, title = gd.cell(r, 1).value, gd.cell(r, 2).value
        if not code or not title:
            continue
        prog = num(gd.cell(r, 6).value)
        o.note("projects", f"{code} {str(title).strip()}", {"type": "project", "code": code, "title": str(title).strip(), "objective": f"[[{obj_of[code]}]]" if code in obj_of else "",
            "committee": str(gd.cell(r, 4).value or "").strip(), "cost": round(num(gd.cell(r, 5).value)), "progress": round(prog * 100 if prog <= 1 else prog),
            "start": iso(gd.cell(r, 7).value), "end": iso(gd.cell(r, 8).value), "comment": str(gd.cell(r, 3).value or "").strip()})

    # ---------------------------------------------------------------- plans
    def plan_text(ws, first, last):
        out = []
        for r in range(first, last + 1):
            a_, b_, c_ = (ws.cell(r, c).value for c in (1, 2, 3))
            a_, b_, c_ = [str(x).strip() if x is not None else "" for x in (a_, b_, c_)]
            if b_:
                out.append(f"- {b_}" + (f" – {c_}" if c_ else "") + ("" if not a_ or re.fullmatch(r"[0-9a-z]", a_) else f" ({a_})"))
            elif a_:
                out.append(("\n" if out else "") + a_ + (f" {c_}" if c_ else "") + "\n")
        return "\n".join(out).strip()
    o.note("plans", "Investment Plan", {"type": "plan", "title": "Investment Plan", "source": "workbook"}, plan_text(wb["Investment Plan"], 1, 70))
    o.note("plans", "Tech Plan", {"type": "plan", "title": "Tech Plan", "source": "workbook"}, plan_text(wb["Tech Plan"], 1, 40))
    for t in ("Treasury Plan", "Database Plan", "Welfare Plan", "Sacco Secretary"):
        o.note("plans", t.strip(), {"type": "plan", "title": t.strip()})

    # ---------------------------------------------------------------- meeting, funding, settings
    nm = gd.cell(7, 3).value
    if isinstance(nm, dt.datetime):
        o.note(f"meetings/{nm.year}", f"{iso(nm)} Monthly meeting", {"type": "meeting", "date": iso(nm), "title": "Monthly meeting", "attendees": []})
    ex = wb["Expenses"]
    for r in range(2, 5):
        if ex.cell(r, 2).value and ex.cell(r, 4).value:
            o.note("expenses", f"Funding {iso(ex.cell(r, 3).value)[:7]} {str(ex.cell(r, 2).value).strip()}", {"type": "funding", "title": str(ex.cell(r, 2).value).strip(), "approved": iso(ex.cell(r, 3).value), "amount": round(num(ex.cell(r, 4).value))})
    agenda = [f"{str(mm.cell(r, 3).value).strip()} | {str(mm.cell(r, 4).value or '').strip()}" for r in range(2, 10) if mm.cell(r, 3).value]
    highlights = [str(gd.cell(r, 2).value).strip() for r in range(46, 50) if gd.cell(r, 2).value]
    targets = {f"target_{int(gd.cell(66, c).value)}": round(num(gd.cell(68, c).value)) for c in (2, 3, 4) if isinstance(gd.cell(66, c).value, (int, float))}
    title = str(wb["Loan Application"].cell(1, 2).value or "").strip().title().replace("Sacco", "SACCO")
    o.note("", "kam-settings", {"type": "settings", "title": "KAM settings", "sacco_name": title, "currency": "UGX", "fund_name": "UAP", "interest_rule": "start-of-month balance",
        "loan_rate": 0.05, "loan_max_months": 4, "default_fee": "", "registration_fee": 50000, **targets, "vision": "", "highlights": highlights, "agenda": agenda,
        "banknotes": [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100], "admin": a.admin, "admin_year": dt.date.today().year, "appdev": "on", "dev_email": a.dev_email},
        "Imported from the workbook. The default fee for loans is not in the workbook – add it if the group uses one.")

    # ---------------------------------------------------------------- the original workbook, unchanged
    os.makedirs(os.path.join(a.out, "archive"), exist_ok=True)
    shutil.copy2(a.xlsx, os.path.join(a.out, "archive", os.path.basename(a.xlsx).split("-", 1)[-1] if re.match(r"^[0-9a-f]{8}-", os.path.basename(a.xlsx)) else os.path.basename(a.xlsx)))
    report["counts"] = o.count
    with open(os.path.join(a.out, ".import.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("notes:", o.count)


if __name__ == "__main__":
    main()
