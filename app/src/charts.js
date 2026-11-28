/* KAM – charts drawn as SVG by the app itself (no libraries; the app must work offline). */

const SERIES_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
const short = v => { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B" : a >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : a >= 1e3 ? Math.round(v / 1e3) + "K" : String(Math.round(v)); };

/* grouped bars (bars: [{name, values}]) with optional lines on top (lines: [{name, values}]) */
function barChart({ title, labels, tips, bars = [], lines = [], height = 240, rotate = false }) {
  const W = Math.max(360, labels.length * (bars.length * 16 + 20) + 70), H = height, L = 54, R = 10, T = 14, B = rotate ? 86 : 34;
  const all = [...bars, ...lines].flatMap(s => s.values).map(Number).filter(isFinite);
  const max = niceMax(Math.max(0, ...all)), min = Math.min(0, ...all), span = max - min || 1;
  const y = v => T + (H - T - B) * (max - v) / span, gw = (W - L - R) / Math.max(1, labels.length), bw = Math.min(28, (gw - 10) / Math.max(1, bars.length));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" style="max-width:${Math.round(W * 1.35)}px" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
  for (let i = 0; i <= 4; i++) { const v = min + span * i / 4, yy = y(v); s += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 4}" class="ax" text-anchor="end">${short(v)}</text>`; }
  labels.forEach((lab, i) => {
    const gx = L + gw * i + (gw - bw * bars.length) / 2;
    bars.forEach((b, j) => {
      const v = Number(b.values[i]) || 0, y0 = y(Math.max(0, v)), h = Math.abs(y(v) - y(0));
      s += `<rect x="${gx + j * bw}" y="${y0}" width="${bw - 2}" height="${Math.max(h, v ? 1 : 0)}" fill="${b.color || SERIES_COLORS[j]}"><title>${esc(tips ? tips[i] : lab)} – ${esc(b.name)}: ${fmtN(v)}</title></rect>`;
    });
    const tx = L + gw * i + gw / 2;
    s += rotate ? `<text transform="translate(${tx},${H - B + 10}) rotate(-40)" class="ax" text-anchor="end">${esc(lab)}</text>` : `<text x="${tx}" y="${H - B + 16}" class="ax" text-anchor="middle">${esc(lab)}</text>`;
  });
  lines.forEach((ln, j) => {
    const c = ln.color || SERIES_COLORS[(bars.length + j) % 4];
    const pts = labels.map((_, i) => `${L + gw * i + gw / 2},${y(Number(ln.values[i]) || 0)}`);
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="2"/>`;
    labels.forEach((lab, i) => { s += `<circle cx="${L + gw * i + gw / 2}" cy="${y(Number(ln.values[i]) || 0)}" r="3.5" fill="${c}"><title>${esc(tips ? tips[i] : lab)} – ${esc(ln.name)}: ${fmtN(ln.values[i])}</title></circle>`; });
  });
  s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" class="zero"/></svg>`;
  const legend = [...bars.map((b, j) => [b.name, b.color || SERIES_COLORS[j], "bar"]), ...lines.map((l, j) => [l.name, l.color || SERIES_COLORS[(bars.length + j) % 4], "line"])];
  return `<figure class="chartbox"><figcaption>${esc(title)}</figcaption><div class="chartscroll">${s}</div><div class="legend">${legend.map(([n, c, k]) => `<span><i class="${k}" style="background:${c}"></i>${esc(n)}</span>`).join("")}</div></figure>`;
}

/* Project Tracker: a timeline of tasks by week, with progress and today */
function ganttChart(tasks, { weeks = 8, start } = {}) {
  if (!tasks.length) return `<p class="muted">No tasks yet.</p>`;
  const day = 86400000, monday = d => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const first = start ? monday(start) : monday(tasks.map(t => t.start).filter(Boolean).sort()[0] || todayISO());
  const days = weeks * 7, W = 260 + days * 14, rowH = 26, H = 40 + tasks.length * rowH, x0 = 260, dx = 14;
  const xOf = d => x0 + (new Date(d + "T00:00:00") - first) / day * dx;
  let s = `<svg class="chart gantt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Project timeline">`;
  for (let i = 0; i < days; i++) {
    const d = new Date(first.getTime() + i * day);
    if (i % 7 === 0) s += `<text x="${x0 + i * dx + 2}" y="14" class="ax">${d.getDate()} ${MONTHS[d.getMonth()]}</text><line x1="${x0 + i * dx}" x2="${x0 + i * dx}" y1="20" y2="${H}" class="grid"/>`;
    s += `<text x="${x0 + i * dx + 7}" y="32" class="ax small" text-anchor="middle">${"MTWTFSS"[i % 7]}</text>`;
  }
  tasks.forEach((t, i) => {
    const yy = 40 + i * rowH;
    s += `<text x="4" y="${yy + 16}" class="lab">${esc((t.phase ? t.phase + " · " : "") + t.title)}</text>`;
    if (!t.start || !t.end) return;
    const a = Math.max(x0, xOf(t.start)), b = Math.min(W, xOf(t.end) + dx);
    if (b <= x0 || a >= W) return;
    const p = Math.max(0, Math.min(100, num(t.progress)));
    s += `<rect x="${a}" y="${yy + 4}" width="${b - a}" height="16" rx="3" class="gbar"><title>${esc(t.title)}: ${esc(t.start)} – ${esc(t.end)}, ${p}%</title></rect>`;
    s += `<rect x="${a}" y="${yy + 4}" width="${(b - a) * p / 100}" height="16" rx="3" class="gdone"/>`;
  });
  const tx = xOf(todayISO()) + dx / 2;
  if (tx > x0 && tx < W) s += `<line x1="${tx}" x2="${tx}" y1="20" y2="${H}" class="today"><title>Today</title></line>`;
  return `<div class="chartscroll">${s}</svg></div>`;
}
