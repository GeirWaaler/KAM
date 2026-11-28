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
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "app", "src")
VERSION = "1.4"
VERSION_DATE = "2026-11-28"
PARTS = ["store.js", "calc.js", "charts.js", "views.js", "extras.js", "features.js", "main.js"]


def read(*p):
    with open(os.path.join(ROOT, *p), encoding="utf-8") as f:
        return f.read()


def section(text, heading):
    m = re.search(rf"^## {re.escape(heading)}[^\n]*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def version_sections(text):
    """{version: section text} from the CHANGELOG headings '### KAM x.y – title · date'."""
    parts = re.split(r"^### KAM ([0-9.]+)[^\n]*\n", text, flags=re.M)
    return {parts[i]: parts[i + 1] for i in range(1, len(parts) - 1, 2)}


def latest_section(text):
    sec = version_sections(text).get(VERSION, "")
    return re.sub(r"\*\*Try:\*\*.*", "", sec, flags=re.S).strip()


def tries(text):
    """The Try checklist of each version: '- [ ] what to do <!-- show: #selector; tab: page -->'."""
    out = {}
    for v, sec in version_sections(text).items():
        m = re.search(r"\*\*Try:\*\*(.*)", sec, flags=re.S)
        if not m:
            continue
        items = []
        for line in m.group(1).splitlines():
            t = re.match(r"\s*- \[ \] (.*?)\s*(?:<!--(.*?)-->)?\s*$", line)
            if t:
                opts = dict(kv.split(":", 1) for kv in (t.group(2) or "").split(";") if ":" in kv)
                items.append({"text": t.group(1).strip(), "show": opts.get(" show", opts.get("show", "")).strip(), "tab": opts.get(" tab", opts.get("tab", "")).strip()})
        out[v] = items
    return out


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
        "changes": re.sub(r"<!--.*?-->", "", re.sub(r"^# [^\n]*\n", "", read("CHANGELOG.md"), count=1)).strip(),
        "latest": latest_section(read("CHANGELOG.md")),
        "tries": tries(read("CHANGELOG.md")),
    }
    js = "const APP = " + json.dumps(app, ensure_ascii=False) + ";\n" + "\n".join(read("app", "src", p) for p in PARTS)
    js = js.replace("</script", "<\\/script")
    logo = read("app", "src", "logo.svg").strip()
    favicon = "data:image/svg+xml," + urllib.parse.quote(logo, safe=" =:/,;#")
    html = read("app", "src", "shell.html").replace("/*__FAVICON__*/", favicon).replace("/*__LOGO__*/", logo).replace("/*__JS__*/", js)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    with open(os.path.join(ROOT, "dist", "KAM.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"dist/KAM.html  {len(html) // 1024} KB  version {VERSION}  ({len(app['demo'])} demo notes)")


if __name__ == "__main__":
    main()
