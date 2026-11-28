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
TABS = ["home", "members", "receipts", "interest", "loans", "projects", "meetings", "expenses", "plans", "yearend", "updates", "history", "appdev", "about", "settings"]
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


def poll(pg, want, folder="transactions/2026"):
    """The note count in a folder, waiting up to 5 s for it to reach `want`."""
    n = None
    for _ in range(50):
        n = pg.evaluate(COUNT, folder)
        if n == want:
            break
        pg.wait_for_timeout(100)
    return n


def main():
    import subprocess
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "build_sample_data.py")], check=True, stdout=subprocess.DEVNULL)   # the demo folder fresh
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
            if tag == "phone":
                box = pg.locator("#tabs").bounding_box(); check(box["width"] > 350 and box["y"] < 200, "[phone] the menu is a row along the top")
            check(not errors, f"[{tag}] no script errors {errors[:3]}")
            ctx.close()

        # demo checks
        ctx = b.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        pg = ctx.new_page()
        pg.goto(url + "#demo"); pg.wait_for_selector("#tabs button")
        box = pg.locator("#tabs").bounding_box(); check(box["height"] > 600 and box["width"] < 220, "the menu is a column on the left")
        check(pg.locator("#tabs svg.ni").count() >= 14, "every menu item has an icon")
        check(pg.evaluate("document.querySelector('link[rel=icon]').href.startsWith('data:image/svg+xml')") and pg.locator("header .brand svg").count() == 1, "the logo is the favicon and sits in the header")
        fav = pg.evaluate("document.querySelector('link[rel=icon]').getAttribute('href')")
        check("#" not in fav, "favicon data URI has no raw # (it would cut the icon off)")
        check(pg.evaluate("""h => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = h; })""", fav), "favicon image loads in the browser")
        check(pg.evaluate("(() => { const n = document.getElementById('tabs'); return getComputedStyle(n).overflowY !== 'auto' && n.scrollHeight <= n.clientHeight + 1; })()"), "the menu has no scrollbar of its own")
        pg.set_viewport_size({"width": 1280, "height": 560}); pg.mouse.wheel(0, 5000); pg.wait_for_timeout(200)
        last = pg.locator("#navToggle").bounding_box(); check(last["y"] + last["height"] <= 560, "in a short window the last menu item can be reached by scrolling the page")
        pg.set_viewport_size({"width": 1280, "height": 900}); pg.mouse.wheel(0, -5000)
        pg.click("#navToggle"); check(pg.locator("#frame.mini").count() == 1 and pg.locator("#tabs").bounding_box()["width"] < 70, "Narrow menu shrinks it to icons")
        pg.reload(); pg.wait_for_selector("#tabs button"); check(pg.locator("#frame.mini").count() == 1, "the narrow menu is remembered")
        pg.click("#navToggle"); check(pg.locator("#frame.mini").count() == 0, "Wide menu brings the names back")
        check("<h3>Data</h3>" not in pg.inner_html("#followup"), "home: no data problems in Follow up on the demo data")
        pg.click('#tabs [data-tab="interest"]'); check("✓ Interest shares add up" in pg.inner_text("#main"), "interest check passes on demo data"); pg.click('#tabs [data-tab="home"]')
        check(pg.locator("svg.chart").count() == 3, "home: 3 charts (year, quarter, interest by month)")
        hh = pg.evaluate("[...document.querySelectorAll('.grid2 svg.chart')].map(e => Math.round(e.getBoundingClientRect().height))")
        check(len(hh) == 2 and len(set(hh)) == 1, f"home: the year and quarter charts are the same height {hh}")
        pg.click('#tabs [data-tab="members"]'); check(pg.locator("svg.chart").count() == 2, "members: 2 charts (contributions, savings vs targets)")
        hs = pg.evaluate("[...document.querySelectorAll('svg.chart')].map(e => Math.round(e.getBoundingClientRect().height))")
        check(len(set(hs)) == 1, f"members: the two charts are the same height {hs}")
        pg.click('#tabs [data-tab="loans"]'); pg.click("[data-loan]"); check("Repayment plan" in pg.inner_text("#main"), "loan page shows the repayment plan")
        pg.click("[data-apply]"); check("In words" in pg.inner_text("#main") and "nine hundred thousand" in pg.inner_text("#main"), "loan application with the amount in words")
        pg.click('#tabs [data-tab="projects"]'); check(pg.locator("svg.gantt").count() == 1, "project tracker timeline")
        pg.click('#tabs [data-tab="about"]'); t = pg.inner_text("#main")
        check("Waiting to be built" in t and "Sheet by sheet" in t, "About shows the waiting list and the workbook analysis")
        pg.click('#tabs [data-tab="yearend"]'); pg.fill(".cc[data-d='50000']", "2"); check("100,000" in pg.inner_text("#cc50000"), "cash count adds up a banknote")
        # 1.4 – pills, folding, names first, help, present, PDF, amounts
        pg.click('#tabs [data-tab="members"]'); pg.click("#mpills [data-sel='K002']")
        check(pg.locator("#memberView").count() == 1 and pg.locator("#mpills [aria-pressed='true']").count() == 1, "members: one pill shows that member on the same page")
        pg.click("#mpills [data-sel='K003']"); check(pg.locator(".cmp .card").count() == 2 and pg.locator("svg.chart").count() == 2, "members: two pills compare side by side")
        labels = pg.evaluate("[...document.querySelectorAll('svg.chart text.ax')].map(t => t.textContent)"); check("Brian" in labels and "K002" not in labels, "charts show short names, not codes")
        pg.click("#mpills [data-sel='']"); check(pg.locator("#memberView").count() == 0 and "Committee" in pg.inner_text("#main"), "All members brings the overview back")
        pg.click('#tabs [data-tab="receipts"]'); check(pg.locator("tr.mhead").count() >= 9 and pg.locator("#rcTotals").count() == 1, "receipts: every member folded to one line, totals at the bottom")
        rows0 = pg.locator(".rctable tbody.rcblock tr").count(); pg.click("#rcToggle"); rows1 = pg.locator(".rctable tbody.rcblock tr").count()
        check(rows1 > rows0 * 5, f"Expand all opens every member ({rows0} → {rows1} rows)")
        pg.click("#rcToggle"); pg.locator("tr.mhead").first.click(); check(pg.locator(".rctable tbody.rcblock tr").count() == rows0 + 8, "clicking a member's line opens only that member")
        pg.click("#mpills [data-sel='K001']"); check(pg.locator("#rcTotals").count() == 0 and pg.locator("tr.mhead").count() == 1, "receipts: one pill shows only that member, no group totals")
        pg.click("#mpills [data-sel='K002']"); check("Selected members – total" in pg.inner_text("#main"), "receipts: two pills add a selected-members total")
        pg.click("#mpills [data-sel='']")
        pg.click('#tabs [data-tab="home"]'); check(pg.locator("#main table th").first.inner_text() in ("Objective", "Project / activity", "Member"), "tables start with the name, not the code")
        check(pg.locator("#main .code").count() > 10, "codes are shown as pills")
        check("All amounts in UGX" in pg.inner_text("#main") and "UGX 24" not in pg.inner_text(".kpis"), "amounts as plain numbers with one 'All amounts in UGX' line")
        pg.click("#helpPill"); check(pg.locator("#helpCard").is_visible() and "Help – Home" in pg.inner_text("#helpCard"), "the ? opens help for the page")
        pg.fill("#hlpQ", "backup"); check("Make a backup" in pg.inner_text("#helpCard"), "help search finds other pages' help")
        pg.keyboard.press("Escape"); check(not pg.locator("#helpCard").is_visible(), "Esc closes help")
        tabs = pg.evaluate("TABS.map(t => t[0])"); nohelp = pg.evaluate("TABS.map(t => t[0]).filter(t => !HELP[t])"); check(not nohelp, f"every page in the menu has help {nohelp}")
        bad = []
        for t, sel in pg.evaluate("Object.entries(HELP).flatMap(([t, x]) => x.items.filter(i => i.show).map(i => [t, i.show]))"):
            pg.evaluate(f"go({t!r})"); pg.wait_for_timeout(30)
            if not pg.evaluate(f"!!document.querySelector({sel!r})"): bad.append(f"{t}:{sel}")
        check(not bad, f"every help Show me points at something {bad}")
        pg.evaluate("go('home')"); pg.click("#presentBtn"); check(pg.locator("#present").is_visible() and pg.evaluate("pres.slides.length") >= 7, "▶ Present opens the slides")
        pg.keyboard.press("ArrowRight"); check("2 /" in pg.inner_text(".presbar"), "arrow keys move the slides"); pg.keyboard.press("Escape"); check(not pg.locator("#present").is_visible(), "Esc stops presenting")
        pg.evaluate("window.print = () => { window.__printed = (window.__printed || 0) + 1; }; 0")
        pg.click('#tabs [data-tab="updates"]'); pg.click("#pdfUpdate"); pg.wait_for_timeout(250)
        check(pg.evaluate("window.__printed") == 1 and pg.locator("#printArea svg.chart").count() == 2, "Save as PDF prints the update with its charts")
        pg.evaluate("document.body.classList.remove('printarea')")
        pg.click('#tabs [data-tab="history"]'); check("Fund statement 2026-09" in pg.inner_text("#main") and pg.locator("tr.flag").count() == 1, "History lists changes and flags one in a closed month")
        pg.click('#tabs [data-tab="about"]'); check("How KAM is built" in pg.inner_text("#main") and pg.locator("#whatsNew").count() == 1 and pg.locator(".wn [data-test]").count() >= 2, "About has How KAM is built and What's new with each version's steps")
        # 1.5 – the top bar as in Horizons, test mode
        check(pg.inner_text("#appVersion").startswith("v1.") and "·" in pg.inner_text("#appVersion"), "the version and date sit under the logo")
        check("Demo data" in pg.inner_text("#folderChip") and pg.locator("#leaveDemo").count() == 1 and pg.locator("#demoBand").count() == 0, "the demo shows in the folder chip, no yellow band")
        hb = pg.locator("header .brand").bounding_box(); fb = pg.locator("#folderChip").bounding_box(); check(fb["x"] > hb["x"] + 600, "the data folder sits on the right of the top bar")
        pg.click('#tabs [data-tab="settings"]'); check(pg.locator("#testModeCard [data-test]").count() >= 2, "Settings › Test mode lists the versions")
        pg.click(f"#testModeCard [data-test='{pg.evaluate('APP.version')}']"); pg.wait_for_selector("#testPanel")
        check("step 1 of" in pg.inner_text("#testPanel"), "the test panel guides one step at a time")
        pg.click("#tOk"); check("step 2 of" in pg.inner_text("#testPanel") and pg.evaluate("testState(APP.version, 0)") == "ok", "✓ Works ticks the step and moves on")
        pg.click("#tNo"); check(view_tab := pg.evaluate("view.tab") == "appdev", "✗ Doesn't opens AppDev")
        check(pg.input_value("#devTitle").startswith("Test ") and "while testing" in pg.input_value("#devText") and pg.input_value("#devKind") == "Problem", "the comment has the version and the step filled in")
        pg.click("#tStop"); check(pg.locator("#testPanel").count() == 0, "the test panel closes")
        check("Send to the developer" in pg.inner_text("#main") and "Geir" not in pg.inner_text("#main"), "AppDev says Send to the developer")
        bad = []
        for v, steps in pg.evaluate("APP.tries").items():
            if len(steps) < 2: bad.append(f"{v}: only {len(steps)} steps")
            for x in steps:
                pg.evaluate(f"go({x['tab']!r})"); pg.wait_for_timeout(30)
                if not pg.evaluate(f"!!document.querySelector({x['show']!r})"): bad.append(f"{v}: {x['show']}")
        check(not bad and len(pg.evaluate("APP.tries[APP.version] || []")) >= 2, f"every version's Try steps point at something {bad}")
        pg.click('#tabs [data-tab="home"]'); check(pg.locator("#followup").count() == 1 and "Follow up" in pg.inner_text("#followup"), "home: Follow up list")
        check(pg.locator('#tabs [data-tab="home"] .pill').count() == 1, "home tab shows the follow-up count")
        pg.locator("#followup [data-act]").first.click(); check(pg.inner_text("#main") != "", "a follow-up 'fix' link opens something")
        # AppDev: comment, send link, switch off
        pg.click('#tabs [data-tab="appdev"]'); t = pg.inner_text("#main")
        check("The data model" in t and "How KAM is built" in t, "AppDev shows the data model and the app structure")
        pg.fill("#devTitle", "Test idea"); pg.fill("#devText", "Some text"); pg.click("#devNew"); pg.wait_for_selector(".banner.ok")
        check("2 not sent" in pg.inner_text("#main"), "AppDev: a new comment is saved, 2 not sent")
        pg.click('#tabs [data-tab="settings"]'); pg.click("#appdevToggle"); pg.wait_for_selector(".banner.ok")
        check(pg.locator('#tabs [data-tab="appdev"]').count() == 0, "AppDev can be switched off in Settings")
        pg.click("#appdevToggle"); pg.wait_for_selector('#tabs [data-tab="appdev"]')
        # the tour: every step points at something on its page
        pg.click('#tabs [data-tab="about"]'); pg.click("[data-tour]"); pg.wait_for_selector("#tourPanel")
        n = pg.evaluate("tourSteps().length"); missing = []
        for i in range(n):
            ok = pg.evaluate(f"(() => {{ tour.i = {i}; showTourStep(); const s = tourSteps()[{i}]; const tab = document.querySelector('#tabs [data-tab=\"' + s.tab + '\"]'); return !!(tab && document.querySelector(s.sel) && document.querySelector('.tourhl')); }})()")
            if not ok: missing.append(i + 1)
        check(not missing, f"tour: all {n} steps point at something on their page {missing}")
        names = pg.evaluate("TABS.map(t => t[0])"); bad = pg.evaluate("TOUR.filter(s => !TABS.some(t => t[0] === s.tab)).length")
        check(bad == 0, "tour: every step names a page in the menu")
        pg.click("#tClose"); check(pg.locator("#tourPanel").count() == 0, "tour closes")

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
        pg.wait_for_selector("text=Email receipt", timeout=8000)
        check("Email receipt" in pg.inner_text("#main") and "WhatsApp receipt" in pg.inner_text("#main"), "after a payment the admin can send a receipt")
        after = poll(pg, before + 1); check(after == before + 1, f"recording a payment writes one note ({before} → {after})")
        pg.click("[data-round]"); pg.fill("#roundMonth", "2026-11"); pg.dispatch_event("#roundMonth", "change"); pg.wait_for_timeout(100)
        ins = pg.locator(".rin[data-k='savings']"); ins.nth(1).fill("50000"); ins.nth(2).fill("60000"); pg.click("#roundSave"); pg.wait_for_selector(".banner.ok")
        check(poll(pg, before + 3) == before + 3, "the monthly round writes one note per amount")
        # history logs every write; delete goes to the archive; restore
        check(pg.evaluate(COUNT, "history/" + __import__("datetime").date.today().strftime("%Y")) >= 1, "History is written to the data folder")
        pg.click('#tabs [data-tab="history"]'); check("Created" in pg.inner_text("#main") and "Savings" in pg.inner_text("#main"), "History shows the new payments")
        pg.evaluate("go('members', { sel: ['K002'] })"); pg.locator("#memberView [data-edit*='transactions/2026/2026-11-01']").first.click()
        pg.once("dialog", lambda d: d.accept()); pg.click("#edDelete"); pg.wait_for_selector(".banner.ok")
        check(poll(pg, 1, "archive/deleted/transactions/2026") == 1, "a deleted payment moves to the archive")
        pg.click('#tabs [data-tab="settings"]'); check("Deleted notes (1)" in pg.inner_text("#main"), "Settings lists the deleted note")
        pg.click("[data-restore]"); pg.wait_for_selector(".banner.ok"); check(poll(pg, 0, "archive/deleted/transactions/2026") == 0, "Restore puts it back")
        # close a month, then a change there asks first
        pg.click('#tabs [data-tab="receipts"]')
        if pg.locator("#closeMonth[data-close]").get_attribute("data-close"):
            pg.click("#closeMonth"); pg.click("#doClose"); pg.wait_for_function("!document.getElementById('dlg').open")
        mk = pg.evaluate("[...closedMonths()].sort().at(-1)")
        asked = []
        pg.once("dialog", lambda d: (asked.append(d.message), d.dismiss()))
        pg.evaluate(f"openEditor('transaction', null, {{ date: '{mk}-05', member: mLink('K001'), kind: 'savings', amount: 1000 }})"); pg.click("#edSave"); pg.wait_for_timeout(200)
        check(asked and "closed" in asked[0], "a payment in a closed month asks first")
        pg.evaluate("document.getElementById('dlg').close()")
        # amounts setting, Excel export, backup
        pg.click('#tabs [data-tab="settings"]'); pg.select_option("#amountMode", "USh"); pg.wait_for_selector(".banner.ok")
        pg.click('#tabs [data-tab="home"]'); check("USh " in pg.inner_text(".kpis"), "amounts can be shown with USh")
        pg.click('#tabs [data-tab="settings"]')
        with pg.expect_download() as dl:
            pg.click("#exportXlsx")
        import openpyxl
        dl.value.save_as("/tmp/kam-export-test.xlsx"); wbx = openpyxl.load_workbook("/tmp/kam-export-test.xlsx")
        check({"Members", "Payments", "Fund", "Loans", "Interest shares", "Receipts 2026", "Projects"} <= set(wbx.sheetnames), f"Excel export has the sheets {wbx.sheetnames[:6]}")
        check(wbx["Payments"].max_row > 150 and isinstance(wbx["Payments"]["E2"].value, (int, float)), "Excel: every payment, amounts as numbers")
        with pg.expect_download() as dl:
            pg.click("#backupBtn")
        check(dl.value.suggested_filename.startswith("KAM-backup-"), "Download backup gives a backup zip")
        try: pg.wait_for_function("db.settings.last_backup === new Date().toISOString().slice(0, 10)", timeout=5000)
        except Exception: pass
        check(pg.evaluate("db.settings.last_backup") == __import__("datetime").date.today().isoformat(), "the backup date is remembered")
        with pg.expect_download() as dl:
            pg.click("#handover")
        path = dl.value.path()
        import zipfile
        z = zipfile.ZipFile(path)
        names = z.namelist()
        check("KAM.html" in names and "Handover summary.txt" in names and any(n.startswith("KAM-data/members/") for n in names), f"handover zip holds app, summary and data ({len(names)} files)")
        check(z.read("KAM.html").decode()[:15] == "<!DOCTYPE html>", "the app in the zip is a whole HTML page")
        # an older data folder: the update button, and What's new after a new version
        old = dict(files); old["kam-settings.md"] = old["kam-settings.md"].replace("structure_version: 2\n", "").replace("amount_display: numbers\n", "")
        pg = ctx.new_page(); pg.add_init_script(PICKER); pg.add_init_script("try { localStorage.setItem('kam-seen-version', '1.3'); } catch {}"); pg.goto(url)
        pg.evaluate(POPULATE, old); pg.evaluate("localStorage.setItem('kam-seen-version', '1.3')"); pg.reload(); pg.wait_for_selector("#tabs button")
        check(pg.locator("#testLine").count() == 1 and "new thing" in pg.inner_text("#testLine"), "after an update a line offers to test what's new")
        pg.click("#testStart"); check(pg.locator("#testPanel").count() == 1, "Test them opens the panel"); pg.click("#tStop")
        check("KAM-data" not in pg.inner_text("#folderChip") and "notes" in pg.inner_text("#folderChip") and "read" in pg.inner_text("#folderChip") and pg.locator("#refreshBtn").is_visible(), "the folder chip shows the folder, notes and when it was read, with ⟳")
        pg.click("#refreshBtn"); pg.wait_for_selector("text=Read the data folder again")
        check(pg.locator("#structBanner").count() == 1, "an older data folder is offered an update")
        pg.click("#structUpdate"); pg.wait_for_selector("#structBanner", state="detached", timeout=8000)
        check(pg.evaluate("db.settings.structure_version") == "2" and pg.evaluate("db.settings.amount_display") == "numbers" and pg.locator("#structBanner").count() == 0, "the update adds the settings, nothing else changes")
        b.close()
    srv.shutdown()
    print("ALL PASSED" if not failures else f"{len(failures)} FAILED")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
