"""Tests for KAM in headless Chromium (Playwright).

The browser's private file system (OPFS) stands in for the data folder, so the real reading and writing code runs.
Run:  python3 build.py && python3 tests/test_app.py [--shots]
"""
import functools
import http.server
import os
import sys
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
SHOTS = os.path.join(ROOT, "tests", "screenshots")
TABS = ["home", "members", "receipts", "interest", "loans", "projects", "meetings", "expenses", "plans", "yearend", "updates", "about", "settings"]
failures = []


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=DIST))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


POPULATE = """async (files) => {
  const root = await navigator.storage.getDirectory();
  try { await root.removeEntry('data', { recursive: true }); } catch {}
  const v = await root.getDirectoryHandle('data', { create: true });
  for (const [path, text] of Object.entries(files)) {
    const parts = path.split('/'); let d = v;
    for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
    const h = await d.getFileHandle(parts.at(-1), { create: true }); const w = await h.createWritable(); await w.write(text); await w.close();
  }
}"""
COUNT = """async (folder) => { let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('data'); for (const p of folder.split('/')) d = await d.getDirectoryHandle(p);
  let n = 0; for await (const _ of d.entries()) n++; return n; }"""
PICKER = "window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('data', { create: true });"


def main():
    shots = "--shots" in sys.argv
    os.makedirs(SHOTS, exist_ok=True)
    srv = serve()
    url = f"http://127.0.0.1:{srv.server_address[1]}/KAM.html"
    with sync_playwright() as p:
        b = p.chromium.launch()
        for width, tag in ((1280, "wide"), (400, "phone")):
            ctx = b.new_context(viewport={"width": width, "height": 900}, accept_downloads=True)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            pg.goto(url + "#demo")
            pg.wait_for_selector("#tabs button", timeout=15000)
            for t in TABS:
                pg.click(f'#tabs [data-tab="{t}"]')
                pg.wait_for_timeout(120)
                txt = pg.inner_text("#main")
                check(len(txt) > 40 and "NaN" not in txt and "undefined" not in txt, f"[{tag}] {t}: renders, no NaN/undefined")
                if shots:
                    pg.screenshot(path=os.path.join(SHOTS, f"{tag}-{t}.png"), full_page=True)
            check(not errors, f"[{tag}] no script errors {errors[:3]}")
            ctx.close()

        # demo checks
        ctx = b.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        pg = ctx.new_page()
        pg.goto(url + "#demo"); pg.wait_for_selector("#tabs button")
        check("✓ Interest shares add up" in pg.inner_text("#main"), "home: interest check passes on demo data")
        check(pg.locator("svg.chart").count() == 3, "home: 3 charts (year, quarter, interest by month)")
        pg.click('#tabs [data-tab="members"]'); check(pg.locator("svg.chart").count() == 2, "members: 2 charts (contributions, savings vs targets)")
        pg.click('#tabs [data-tab="loans"]'); pg.click("[data-loan]"); check("Repayment plan" in pg.inner_text("#main"), "loan page shows the repayment plan")
        pg.click("[data-apply]"); check("In words" in pg.inner_text("#main") and "nine hundred thousand" in pg.inner_text("#main"), "loan application with the amount in words")
        pg.click('#tabs [data-tab="projects"]'); check(pg.locator("svg.gantt").count() == 1, "project tracker timeline")
        pg.click('#tabs [data-tab="about"]'); t = pg.inner_text("#main")
        check("Waiting to be built" in t and "Sheet by sheet" in t, "About shows the waiting list and the workbook analysis")
        pg.click('#tabs [data-tab="yearend"]'); pg.fill(".cc[data-d='50000']", "2"); check("100,000" in pg.inner_text("#cc50000"), "cash count adds up a banknote")

        # a real folder (OPFS): read, record a payment, monthly round, handover zip
        files = {}
        base = os.path.join(DIST, "KAM demo data")
        for d, _, fs in os.walk(base):
            for f in fs:
                files[os.path.relpath(os.path.join(d, f), base).replace(os.sep, "/")] = open(os.path.join(d, f), encoding="utf-8").read()
        pg = ctx.new_page(); pg.add_init_script(PICKER); pg.goto(url)
        pg.evaluate(POPULATE, files)
        pg.click("#wPick"); pg.wait_for_selector("#tabs button", timeout=15000)
        before = pg.evaluate(COUNT, "transactions/2026")
        pg.click('#tabs [data-tab="receipts"]'); pg.click("[data-pay]")
        pg.select_option("#f_member", index=1); pg.fill("#f_amount", "130000"); pg.fill("#f_date", "2026-11-01"); pg.click("#edSave")
        pg.wait_for_selector(".banner.ok")
        check(pg.evaluate(COUNT, "transactions/2026") == before + 1, "recording a payment writes one note")
        pg.click("[data-round]"); pg.fill("#roundMonth", "2026-11"); pg.dispatch_event("#roundMonth", "change"); pg.wait_for_timeout(100)
        ins = pg.locator(".rin[data-k='savings']"); ins.nth(1).fill("50000"); ins.nth(2).fill("60000"); pg.click("#roundSave"); pg.wait_for_selector(".banner.ok")
        check(pg.evaluate(COUNT, "transactions/2026") == before + 3, "the monthly round writes one note per amount")
        pg.click('#tabs [data-tab="settings"]')
        with pg.expect_download() as dl:
            pg.click("#handover")
        path = dl.value.path()
        import zipfile
        z = zipfile.ZipFile(path)
        names = z.namelist()
        check("KAM.html" in names and "Handover summary.txt" in names and any(n.startswith("KAM-data/members/") for n in names), f"handover zip holds app, summary and data ({len(names)} files)")
        check(z.read("KAM.html").decode()[:15] == "<!DOCTYPE html>", "the app in the zip is a whole HTML page")
        b.close()
    srv.shutdown()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
