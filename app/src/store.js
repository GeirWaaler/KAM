/* KAM – the data folder: Markdown notes with YAML properties.
   The note reading/writing core is copied from Horizons (vault.js, story.js) and trimmed for KAM.
   Notes are found by `type`, never by folder. Unknown properties are kept on save. */

const pad2 = n => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const nowISO = () => { const d = new Date(); return `${todayISO()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const asList = v => Array.isArray(v) ? v : (v === undefined || v === null || v === "" ? [] : [v]);
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
const LINK_RE = /\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g;
const stripLinks = s => String(s ?? "").replace(LINK_RE, (_, t, a) => (a || t).trim());
function safeFileName(s) {
  return stripLinks(s).replace(/[\\/:*?"<>|#^[\]]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 90) || "Untitled";
}

/* ---------------------------------------------------------------- YAML front matter (the subset Obsidian writes) – from Horizons */
function unquote(v) {
  v = v.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}
function splitInline(s) {
  const out = []; let cur = "", q = null, depth = 0;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === "[") depth++; if (ch === "]") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(unquote).filter(x => x !== "");
}
function parseNote(text) {
  const t = text.replace(/^﻿/, "");
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
  if (!m) return { props: {}, keys: [], body: t.replace(/\s+$/, "") };
  const props = {}, keys = [], emptyKeys = new Set();
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const item = raw.match(/^\s+-\s?(.*)$/) || (listKey && raw.match(/^-\s(.*)$/));
    if (item && listKey) { const v = unquote(item[1]); if (v !== "") { props[listKey].push(v); emptyKeys.delete(listKey); } continue; }
    const kv = raw.match(/^([^\s:][^:]*):(?:\s(.*)|)$/);
    if (!kv) throw new Error(`unreadable property line: ${raw}`);
    const k = kv[1].trim(), v = (kv[2] ?? "").trim();
    if (!keys.includes(k)) keys.push(k);
    listKey = null;
    if (v === "") { props[k] = []; listKey = k; emptyKeys.add(k); }
    else if (v.startsWith("[") && v.endsWith("]") && !v.startsWith("[[")) props[k] = splitInline(v.slice(1, -1));
    else props[k] = unquote(v);
  }
  for (const k of emptyKeys) if (Array.isArray(props[k]) && props[k].length === 0) props[k] = "";
  return { props, keys, body: m[2].replace(/^\r?\n/, "").replace(/\s+$/, "") };
}
function yamlScalar(v) {
  const s = String(v ?? "");
  if (s === "") return '""';
  if (/^[A-Za-z0-9ÆØÅæøåÄÖÜäöüé][A-Za-z0-9ÆØÅæøåÄÖÜäöüé _./()+@-]*$/.test(s) && !/^(true|false|null|yes|no|~)$/i.test(s) && !s.includes(": ")) return s;
  if (/^(true|false)$/.test(s)) return s;
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ") + '"';
}
function serializeNote(props, keys, body) {
  const order = [...keys, ...Object.keys(props).filter(k => !keys.includes(k))];
  const lines = ["---"];
  for (const k of order) {
    if (!(k in props)) continue;
    const v = props[k];
    if (Array.isArray(v)) { if (!v.length) lines.push(`${k}: []`); else { lines.push(`${k}:`); for (const x of v) lines.push(`  - ${yamlScalar(x)}`); } }
    else lines.push(v === "" || v === undefined || v === null ? `${k}:` : `${k}: ${yamlScalar(v)}`);
  }
  lines.push("---", "");
  return lines.join("\n") + (body && body.trim() ? body.replace(/\s+$/, "") + "\n" : "");
}

/* ---------------------------------------------------------------- in-memory folder (demo data) – from Horizons */
class MemFile {
  constructor(name, data) { this.kind = "file"; this.name = name; this._b = new Blob([data || ""]); this._m = Date.now(); }
  async getFile() { return new File([this._b], this.name, { lastModified: this._m }); }
  async createWritable() { const parts = [], self = this; return { async write(x) { parts.push(x && x.data !== undefined ? x.data : x); }, async close() { self._b = new Blob(parts); self._m = Math.max(Date.now(), self._m + 1); } }; }
}
class MemDir {
  constructor(name) { this.kind = "directory"; this.name = name; this._c = new Map(); }
  async getDirectoryHandle(n, o = {}) { let d = this._c.get(n); if (!d) { if (!o.create) throw new DOMException(`${n} not found`, "NotFoundError"); d = new MemDir(n); this._c.set(n, d); } return d; }
  async getFileHandle(n, o = {}) { let f = this._c.get(n); if (!f) { if (!o.create) throw new DOMException(`${n} not found`, "NotFoundError"); f = new MemFile(n, ""); this._c.set(n, f); } return f; }
  async removeEntry(n) { if (!this._c.delete(n)) throw new DOMException(`${n} not found`, "NotFoundError"); }
  async *entries() { for (const e of [...this._c]) yield e; }
}

/* ---------------------------------------------------------------- the store */
const store = { root: null, demo: false, notes: new Map(), errors: [], writing: 0 };

/* Where each kind of note is created. Reading looks at `type` only, so notes can be moved. */
const FOLDER = {
  settings: "", member: "members", transaction: "transactions/{year}", loan: "loans", fund: "fund", objective: "objectives",
  project: "projects", task: "projects/tasks", meeting: "meetings/{year}", plan: "plans", funding: "expenses", year: "years",
  cashcount: "cash counts", update: "updates/{year}", devnote: "appdev/{year}",
};
const TYPES = Object.keys(FOLDER);

function withTimeout(p, ms, what) {
  let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error(what), { name: "TimeoutError" })), ms); })]).finally(() => clearTimeout(t));
}
async function readNoteFile(path, dirPath, dir, fileName, handle) {
  const file = await withTimeout(handle.getFile(), 15000, "the file didn't answer within 15 s");
  const text = await file.text();
  const n = { path, dirPath, dir, handle, fileName, name: fileName.replace(/\.md$/i, ""), lastModified: file.lastModified, size: file.size, text };
  try { const p = parseNote(text); Object.assign(n, p); n.type = String(p.props.type || "note").trim().toLowerCase(); }
  catch (e) { n.error = e.message; n.type = "?"; n.props = {}; n.keys = []; n.body = ""; }
  store.notes.set(path, n);
  return n;
}
async function walk(dir, dirPath, depth = 0) {
  const files = [], dirs = [];
  for await (const [name, h] of dir.entries()) {
    if (name.startsWith(".")) continue;
    if (h.kind === "directory") dirs.push([name, h]);
    else if (name.toLowerCase().endsWith(".md")) files.push([name, h]);
  }
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(files.slice(i, i + 8).map(async ([name, h]) => {
      const path = dirPath ? `${dirPath}/${name}` : name;
      try { await readNoteFile(path, dirPath, dir, name, h); }
      catch (e) { store.errors.push({ path, why: e.message }); }
    }));
  }
  for (const [name, h] of dirs) if (depth < 10) await walk(h, dirPath ? `${dirPath}/${name}` : name, depth + 1);
}
async function scanStore() {
  store.notes = new Map(); store.errors = [];
  if (store.root) await walk(store.root, "");
  for (const n of store.notes.values()) if (n.error) store.errors.push({ path: n.path, why: n.error });
}
const notesOf = type => [...store.notes.values()].filter(n => !n.error && n.type === type);
const settingsNote = () => notesOf("settings")[0] || null;

async function dirFor(path, create = true) {
  let d = store.root;
  for (const part of path.split("/").filter(Boolean)) d = await d.getDirectoryHandle(part, { create });
  return d;
}
async function writeFile(handle, text) { const w = await handle.createWritable(); await w.write(text); await w.close(); }
async function canWrite() {
  if (!store.root) return false;
  if (!store.root.queryPermission) return true;
  let p = await store.root.queryPermission({ mode: "readwrite" });
  if (p !== "granted") p = await store.root.requestPermission({ mode: "readwrite" });
  return p === "granted";
}
class ConflictError extends Error { constructor(note) { super("conflict"); this.note = note; } }
/* Is the file on disk still the one we read? If not, re-read it and throw ConflictError. – from Horizons */
async function assertUnchanged(n) {
  const file = await n.handle.getFile();
  if (file.lastModified === n.lastModified && file.size === n.size) return;
  const text = await file.text();
  if (text === n.text) { n.lastModified = file.lastModified; n.size = file.size; return; }
  await readNoteFile(n.path, n.dirPath, n.dir, n.fileName, n.handle);
  throw new ConflictError(store.notes.get(n.path));
}
async function uniqueName(dir, base) {
  for (let i = 1; i < 500; i++) {
    const name = `${base}${i > 1 ? " " + i : ""}.md`;
    try { await dir.getFileHandle(name); } catch { return name; }
  }
  throw new Error("Too many notes with the same name.");
}
function folderFor(type, props) {
  const y = String(props.date || props.month || todayISO()).slice(0, 4);
  return (FOLDER[type] ?? "other").replace("{year}", y);
}
/* The file name: readable, unique. */
function baseNameFor(type, p) {
  switch (type) {
    case "settings": return "kam-settings";
    case "member": return `${p.code || ""} ${p.title || ""}`.trim();
    case "transaction": return `${p.date} ${p.member || "group"} ${p.kind}`;
    case "loan": return `${p.code || ""} ${p.member || ""}`.trim();
    case "fund": return `${p.month} ${p.title || "fund statement"}`;
    case "meeting": case "update": case "cashcount": case "devnote": return `${p.date || p.month || todayISO()} ${p.title || type}`;
    default: return `${p.code ? p.code + " " : ""}${p.title || type}`;
  }
}
async function createNote(type, props, body = "") {
  if (!(await canWrite())) throw new Error("No permission to write to the data folder – reconnect it under Settings.");
  const p = { type, ...props, modified: nowISO() };
  const keys = ["type", ...Object.keys(props)];
  const dirPath = folderFor(type, p), dir = await dirFor(dirPath, true);
  const fileName = await uniqueName(dir, safeFileName(stripLinks(baseNameFor(type, p))));
  const handle = await dir.getFileHandle(fileName, { create: true });
  await writeFile(handle, serializeNote(p, keys, body));
  return readNoteFile(dirPath ? `${dirPath}/${fileName}` : fileName, dirPath, dir, fileName, handle);
}
const REMOVE = Symbol("remove");
async function saveNote(n, changes, body) {
  if (!(await canWrite())) throw new Error("No permission to write to the data folder – reconnect it under Settings.");
  await assertUnchanged(n);
  const p = Object.assign({}, n.props, changes, { modified: nowISO() });
  for (const k of Object.keys(p)) if (p[k] === REMOVE) delete p[k];
  await writeFile(n.handle, serializeNote(p, n.keys, body === undefined ? n.body : body));
  return readNoteFile(n.path, n.dirPath, n.dir, n.fileName, n.handle);
}
async function deleteNote(n) {
  if (!(await canWrite())) throw new Error("No permission to write to the data folder.");
  await assertUnchanged(n);
  await n.dir.removeEntry(n.fileName);
  store.notes.delete(n.path);
}

/* ---------------------------------------------------------------- remembering the folder (IndexedDB) – from Horizons */
function idb(mode, fn) {
  return new Promise((res, rej) => {
    try {
      const rq = indexedDB.open("kam-app", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onsuccess = () => { try { const tx = rq.result.transaction("kv", mode); const r = fn(tx.objectStore("kv")); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); } catch (e) { rej(e); } };
      rq.onerror = () => rej(rq.error);
    } catch (e) { rej(e); }
  });
}

/* ---------------------------------------------------------------- zip (store only) for the handover file */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {   /* files: [{ name, data: Uint8Array }] */
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/zip" });
}
