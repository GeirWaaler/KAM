# Notes for Claude

**Start here:** read `docs/working-with-claude.md` – how Geir wants to work, the decisions so far, and the list of features agreed and waiting to be built. Update it at each milestone.

This repository holds **KAM** – an app for Kamuli Kwagalana SACCO, a savings and credit group of friends (13 members in several countries, amounts in UGX). The app replaces the group's Excel workbook. It is one HTML file run locally that reads and writes a separate data folder of Markdown notes with YAML properties.
Builder: Geir (not a member of the group). The group's contact: Arnold. Each year one member is the app's only admin; the role rotates every year.

## Rules

- **Ask one question at a time, with clickable options** (Geir, 2026-11-27).
- **Build now or keep collecting – ask every time.** When Geir and Claude agree on a feature, Claude asks **Build it now** or **Wait – collect it**. Waiting items go in *Waiting to be built* in `docs/working-with-claude.md`. Every build-or-wait question lists **all** the features on the waiting list. Never start building without a *Build it now*.
- **The group's real data never goes into this repository** – no member names, amounts, contacts or the workbook itself. The real data lives in the data folder and travels as a zip. Docs refer to members by code (K001…), never by name. Demo and test data must be made up.
- **Never run commands on the user's own computer.** Build and test only in the cloud workspace.
- Work on a branch and open a pull request unless Geir asks to commit straight to `main`.
- Code borrowed from Horizons (GeirWaaler/CRM-Horizons) is copied into this repo; nothing about KAM is ever written to the Horizons repo.
- App language: English. Users are not developers – explain changes in plain language.
