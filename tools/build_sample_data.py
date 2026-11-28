"""Build the made-up demo data folder for KAM (also shipped inside the app as demo data).

Everything here is invented – no real member, amount or contact. The structure mirrors the group's real data
(see docs/data-model.md), so the demo exercises every screen.

Run:  python3 tools/build_sample_data.py [out-folder]      (default: dist/KAM demo data)
"""
import os
import random
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "KAM demo data")


def yaml(v):
    s = str(v)
    if s == "":
        return '""'
    if any(c in s for c in ':#[]{},"\'') or s.strip() != s or s.lower() in ("true", "false", "yes", "no", "null"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def note(path, props, body=""):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    lines = ["---"]
    for k, v in props.items():
        if isinstance(v, list):
            lines.append(f"{k}:")
            lines += [f"  - {yaml(x)}" for x in v]
        else:
            lines.append(f"{k}: {yaml(v)}" if v != "" else f"{k}:")
    lines += ["---", ""]
    with open(full, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + (body.strip() + "\n" if body.strip() else ""))


MEMBERS = [
    # code, name, country, city, timezone, monthly target, role
    ("K001", "Amina Nakato", "Uganda", "Kampala", "Africa/Kampala", 130000, "Treasurer"),
    ("K002", "Brian Okello", "Netherlands", "Rotterdam", "Europe/Amsterdam", 130000, "Chairperson"),
    ("K003", "Carol Achieng", "Uganda", "Jinja", "Africa/Kampala", 50000, "Secretary"),
    ("K004", "David Mugisha", "South Korea", "Busan", "Asia/Seoul", 130000, ""),
    ("K005", "Esther Namubiru", "United Kingdom", "Leeds", "Europe/London", 130000, "Welfare manager"),
    ("K006", "Frank Ssali", "United Arab Emirates", "Dubai", "Asia/Dubai", 130000, "Database"),
    ("K007", "Grace Atim", "Denmark", "Aarhus", "Europe/Copenhagen", 130000, "Investment head"),
    ("K008", "Henry Kato", "Kuwait", "Kuwait City", "Asia/Kuwait", 50000, "Technology head"),
    ("K009", "Irene Nabirye", "Uganda", "Mbale", "Africa/Kampala", 130000, ""),
]


def main():
    random.seed(7)
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    note("kam-settings.md", {
        "type": "settings", "title": "Demo SACCO", "sacco_name": "Demo Savings Group (made-up data)", "currency": "UGX",
        "fund_name": "Unit trust", "interest_rule": "start-of-month balance", "loan_rate": 0.05, "loan_max_months": 4,
        "default_fee": 20000, "registration_fee": 50000, "target_2025": 15000000, "target_2026": 16200000,
        "vision": "Members grow their savings together and support each other.",
        "highlights": ["Discussed a new savings scheme", "Welfare contribution sent to a member's family"],
        "agenda": ["Opening prayer | Selected member", "Welcome note and introduction | Chairperson", "Review of previous minutes | Secretary",
                   "Review of financial position | Treasurer", "Any other SACCO business | Chairperson", "AOB | Round table", "Closing prayer | Selected member"],
        "banknotes": [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100],
        "admin": "K001", "admin_year": 2026, "appdev": "on", "dev_email": "developer@example.com", "amount_display": "numbers", "structure_version": 2, "last_backup": "2026-11-20",
    }, "Demo data – every name and amount here is invented.")

    for code, name, country, city, tz, target, role in MEMBERS:
        note(f"members/{code} {name}.md", {
            "type": "member", "code": code, "title": name, "short_name": name.split()[0], "status": "active", "joined": "2024-01-15",
            "country": country, "city": city, "timezone": tz, "email": f"{name.split()[0].lower()}@example.com", "phone": "",
            "role": role, "monthly_target": target, "annual_target": target * 12,
            "workbook_interest_2025": random.randint(40, 90) * 10000, "workbook_interest_2026": random.randint(60, 140) * 10000,
        })
    note("members/K010 Joseph Lubega.md", {"type": "member", "code": "K010", "title": "Joseph Lubega", "status": "prospective", "country": "USA", "city": "Boston", "timezone": "America/New_York", "email": "", "monthly_target": 130000})

    # opening balances (before the records start)
    tx = []
    for code, *_ in MEMBERS[:4]:
        tx.append(("2024-12-31", code, "savings", random.choice([400000, 450000, 1500000]), "Balance brought forward"))
    # monthly payments 2025-01 … 2026-10
    months = [f"{y}-{m:02d}" for y in (2025, 2026) for m in range(1, 13) if (y, m) <= (2026, 10)]
    for code, name, *_, target, _role in MEMBERS:
        for mk in months:
            r = random.random()
            if r < 0.55:
                tx.append((f"{mk}-01", code, "savings", target, ""))
            elif r < 0.7:
                tx.append((f"{mk}-01", code, "savings", target * random.choice([2, 3]), "Paid several months"))
        for y in (2025, 2026):
            if random.random() < 0.85:
                tx.append((f"{y}-02-01", code, "membership", 50000, ""))
    tx += [("2025-01-01", "K001", "welfare", 500000, ""), ("2025-03-01", "K002", "welfare", 500000, ""),
           ("2025-09-01", "K003", "withdrawal", 40000, "Paid back on request"), ("2026-04-01", "K006", "penalty", 20000, "Late payment"),
           ("2026-05-01", "K007", "investment_return", 150000, "Share of project profit")]
    names = {m[0]: m[1] for m in MEMBERS}
    for date, code, kind, amount, ref in tx:
        base, i = f"transactions/{date[:4]}/{date} {code} {kind}", 1
        while os.path.exists(os.path.join(OUT, base + (f" {i}" if i > 1 else "") + ".md")):
            i += 1
        note(base + (f" {i}" if i > 1 else "") + ".md",
             {"type": "transaction", "date": date, "member": f"[[{code} {names[code]}]]", "kind": kind, "amount": amount, "reference": ref, "source": "demo"})

    # a loan, partly repaid
    note("loans/L2025-01 K004.md", {"type": "loan", "code": "L2025-01", "member": "[[K004 David Mugisha]]", "guarantor": "[[K002 Brian Okello]]",
                                    "applied": "2025-02-10", "approved": "2025-02-14", "paid_out": "2025-02-15", "amount": 900000, "rate": 0.05, "months": 4,
                                    "purpose": "School fees", "status": "active"}, "Approved at the February meeting.")
    for d, a in (("2025-04-01", 200000), ("2025-06-01", 250000)):
        note(f"transactions/2025/{d} K004 loan_repayment.md", {"type": "transaction", "date": d, "member": "[[K004 David Mugisha]]", "kind": "loan_repayment", "amount": a, "loan": "[[L2025-01 K004]]", "source": "demo"})
    note("transactions/2025/2025-04-01 K004 loan_interest.md", {"type": "transaction", "date": "2025-04-01", "member": "[[K004 David Mugisha]]", "kind": "loan_interest", "amount": 45000, "loan": "[[L2025-01 K004]]", "source": "demo"})

    # the fund: deposits follow the savings, interest about 1 % a month of the running value
    opening = sum(a for d, _, k, a, _ in tx if d < "2025")
    note("fund/2024-12 Opening balance.md", {"type": "fund", "month": "2024-12", "opening": "true", "deposits": opening, "interest": 3000, "title": "Opening balance"})
    running = opening + 3000
    sav = {}
    for date, code, kind, amount, ref in tx:
        if kind in ("savings", "withdrawal") and date >= "2025":
            sav[date[:7]] = sav.get(date[:7], 0) + (amount if kind == "savings" else -amount)
    for mk in months[:-1]:
        dep = sav.get(mk, 0)
        interest = round(running * random.uniform(0.007, 0.011))
        running += dep + interest
        note(f"fund/{mk[:4]}/{mk} Fund statement.md", {"type": "fund", "month": mk, "deposits": dep, "withdrawals": 0, "interest": interest, "source": "Statement (demo)"})

    # objectives, projects, tasks
    objectives = [("OB001", "Bring members together for self-development", "Self-development projects done"),
                  ("OB002", "Promote saving and investment among members", "Annual target UGX 16,200,000"),
                  ("OB003", "Share development ideas and financial knowledge", "Member project funding, investment committee"),
                  ("OB004", "Build capacity in enterprise and managing investments", "Trainings held"),
                  ("OB005", "Togetherness through a social fund", "Social gatherings, welfare")]
    for code, title, measure in objectives:
        note(f"objectives/{code} {title}.md", {"type": "objective", "code": code, "title": title, "measure": measure})
    projects = [("P250101", "Poultry start-up for a member", "OB003", "Investment", 1500000, 100, "2025-01-10", "2025-03-30", "Member started the business"),
                ("A260201", "Register the SACCO", "OB002", "Secretary", 0, 55, "2026-02-13", "2026-04-11", "Papers submitted"),
                ("A260302", "Training: using AI tools", "OB004", "Investment", 0, 90, "2026-03-12", "2026-04-04", "Training done"),
                ("A260401", "Visit to a member's family", "OB005", "Welfare", 300000, 100, "2026-04-10", "2026-05-23", "Visit done"),
                ("A260402", "Review the investment plan", "OB002", "Investment", 0, 20, "2026-04-24", "2026-12-15", "Review started")]
    for code, title, obj, committee, cost, prog, start, end, comment in projects:
        note(f"projects/{code} {title}.md", {"type": "project", "code": code, "title": title, "objective": f"[[{obj}]]", "committee": committee,
                                             "cost": cost, "progress": prog, "start": start, "end": end, "comment": comment})
    tasks = [("Initiation", "Define goals", "K002", 50, "2026-11-02", "2026-11-06"), ("Initiation", "Set up team", "K007", 100, "2026-11-04", "2026-11-09"),
             ("Planning", "Create schedule", "K003", 50, "2026-11-09", "2026-11-16"), ("Planning", "Develop budget", "K001", 0, "2026-11-16", "2026-11-23"),
             ("Execution", "Collect quotes", "K006", 0, "2026-11-23", "2026-12-04"), ("Execution", "Present to members", "K002", 0, "2026-12-07", "2026-12-11")]
    for i, (phase, title, owner, prog, start, end) in enumerate(tasks, 1):
        note(f"projects/tasks/{title}.md", {"type": "task", "title": title, "project": "[[A260402 Review the investment plan]]", "phase": phase, "owner": f"[[{owner}]]",
                                            "progress": prog, "start": start, "end": end, "order": i})

    # meetings, plans, expenses, cash count
    note("meetings/2026/2026-10-10 Monthly meeting.md", {"type": "meeting", "date": "2026-10-10", "title": "Monthly meeting", "attendees": ["[[K001]]", "[[K002]]", "[[K003]]", "[[K005]]", "[[K007]]"]},
         "## Decisions\n\n- Start reviewing the investment plan.\n- Remind members who are behind on savings.")
    note("meetings/2026/2026-12-12 Monthly meeting.md", {"type": "meeting", "date": "2026-12-12", "title": "Monthly meeting"}, "")
    note("plans/Investment Plan.md", {"type": "plan", "title": "Investment Plan"},
         "## Idea\n\nTwo pools: a rotating pool for short-term support and a long-term pool for growth.\n\n- Members contribute a fixed amount monthly\n- Consistent members earn proportional shares")
    note("plans/Tech Plan.md", {"type": "plan", "title": "Tech Plan"}, "- Automated payment reminders\n- Meeting reminders\n- Minutes stored in a shared drive")
    for t in ("Treasury Plan", "Database Plan", "Welfare Plan", "SACCO Secretary"):
        note(f"plans/{t}.md", {"type": "plan", "title": t}, "")
    note("expenses/Funding 2026-02 Membership fees.md", {"type": "funding", "title": "Membership fees", "approved": "2026-02-13", "amount": 450000})
    note("transactions/2026/2026-03-01 group expense.md", {"type": "transaction", "date": "2026-03-01", "kind": "expense", "amount": 120000, "project": "[[A260201 Register the SACCO]]", "reference": "Registration fee", "source": "demo"})
    note("cash counts/2026-10-10 Cash count.md", {"type": "cashcount", "date": "2026-10-10", "title": "Cash count", "n50000": 4, "n20000": 3, "n10000": 5, "n5000": 2, "n1000": 7})
    note("appdev/2026/2026-11-20 Remember the last month in the monthly round.md", {"type": "devnote", "date": "2026-11-20", "title": "Remember the last month in the monthly round", "kind": "Idea", "page": "Receipts", "status": "new"},
         "When I open the monthly round it should start on the month after the last one I entered.")
    note("closed months/2026-09 closed.md", {"type": "close", "month": "2026-09", "closed": "2026-10-10", "by": "K001"})
    note("history/2026/2026-11 History.md", {"type": "history", "month": "2026-11", "title": "History"},
         "- 2026-11-20 18:02 · Amina Nakato · Created · Savings 130,000 · Irene Nabirye · 2026-10-01 · transactions/2026/2026-10-01 K009 savings.md\n"
         "- 2026-11-21 09:15 · Amina Nakato · Changed · Fund statement 2026-09 · interest 210,000 · ⚠ in a closed month · fund/2026/2026-09 Fund statement.md\n"
         "- 2026-11-22 20:40 · Amina Nakato · Created · Member Joseph Lubega (K010) · members/K010 Joseph Lubega.md")
    print("demo data:", sum(len(f) for _, _, f in os.walk(OUT)), "notes in", OUT)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        OUT = os.path.abspath(sys.argv[1])
    main()
