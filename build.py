"""Build KAM into one HTML file: dist/KAM.html

  python3 build.py

Concatenates app/src (store, calc, charts, views, main) into shell.html, and ships inside the app:
- the made-up demo data (tools/build_sample_data.py, built fresh),
- About: the waiting list (docs/working-with-claude.md) and the workbook analysis (docs/workbook-analysis.md),
- What's new (CHANGELOG.md).
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "app", "src")
VERSION = "1.2"
VERSION_DATE = "2026-11-28"
PARTS = ["store.js", "calc.js", "charts.js", "views.js", "extras.js", "main.js"]


def read(*p):
    with open(os.path.join(ROOT, *p), encoding="utf-8") as f:
        return f.read()


def section(text, heading):
    m = re.search(rf"^## {re.escape(heading)}[^\n]*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def demo_files():
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "demo")
        subprocess.run([sys.executable, os.path.join(ROOT, "tools", "build_sample_data.py"), out], check=True, stdout=subprocess.DEVNULL)
        files = {}
        for d, _, fs in os.walk(out):
            for f in fs:
                full = os.path.join(d, f)
                files[os.path.relpath(full, out).replace(os.sep, "/")] = open(full, encoding="utf-8").read()
        return files


def main():
    analysis = re.sub(r"^# [^\n]*\n", "", read("docs", "workbook-analysis.md"), count=1).strip()
    app = {
        "version": VERSION, "date": VERSION_DATE, "demo": demo_files(),
        "waiting": section(read("docs", "working-with-claude.md"), "Waiting to be built"),
        "analysis": analysis,
        "datamodel": re.sub(r"^# [^\n]*\n", "", read("docs", "data-model.md"), count=1).strip(),
        "structure": re.sub(r"^# [^\n]*\n", "", read("docs", "app-structure.md"), count=1).strip(),
        "changes": re.sub(r"^# [^\n]*\n", "", read("CHANGELOG.md"), count=1).strip(),
    }
    js = "const APP = " + json.dumps(app, ensure_ascii=False) + ";\n" + "\n".join(read("app", "src", p) for p in PARTS)
    js = js.replace("</script", "<\\/script")
    html = read("app", "src", "shell.html").replace("/*__JS__*/", js)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    with open(os.path.join(ROOT, "dist", "KAM.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"dist/KAM.html  {len(html) // 1024} KB  version {VERSION}  ({len(app['demo'])} demo notes)")


if __name__ == "__main__":
    main()
