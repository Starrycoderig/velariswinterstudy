import {
  PLAN, PLAN_BY_DATE, PLAN_START, PLAN_END, EXAM_DATE, CATS, NET_CATS, SECTIONS, SECTION_HINT, PHASES, UNITS, UNIT_FLOW,
} from "./plan.js";
import { ORIGINAL, QUOTES, CAT_LINES, MILESTONES, GREET, TINY_VICTORY, ALL_DONE } from "./quotes.js";
import { Store, Sync, LS, makeClient } from "./sync.js";

/* ============================ helpers ============================ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const todayISO = () => iso(new Date());
const fmtLong = (s) => parse(s).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtShort = (s) => parse(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const dow = (s) => parse(s).getDay();
const weekStart = (s) => addDays(s, -dow(s)); // weeks run Sunday → Saturday, like the plan
const hm = (min) => { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`; };
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ============================ state ============================ */
const store = new Store();
const sync = new Sync(store, (s) => renderSync(s));
const ctx = { mode: null, user: null, client: null, offlineOnly: false };
const ui = { view: LS.get("vw:ui", {}).view || "day", date: todayISO(), month: null, menuFor: null, focusId: null, justTicked: new Set(), shelfMore: 40 };
const DEFAULTS = { name: "", examDate: EXAM_DATE, snow: true, motion: "auto", decor: "full", haptics: true, catLines: true, cat: "ink" };
const settings = () => { const s = { ...DEFAULTS, ...(store.get("settings") || {}) }; if (!s.examDate) s.examDate = EXAM_DATE; return s; };
const saveSettings = (patch) => store.set("settings", { ...settings(), ...patch });
const saveUi = () => LS.set("vw:ui", { view: ui.view });

/* ============================ derived data ============================ */
let _idx = null, _idxVer = -1;
function index() {
  if (_idx && _idxVer === store.ver) return _idx;
  const byDate = new Map(), byId = new Map();
  const add = (t) => { if (!byDate.has(t.date)) byDate.set(t.date, []); byDate.get(t.date).push(t); byId.set(t.id, t); };
  for (const d of PLAN) {
    for (const bt of d.tasks) {
      const rec = store.get("task:" + bt.id) || {};
      const f = rec.f || {};
      if (f.deleted) continue;
      add({ ...bt, date: d.date, ...f, id: bt.id, done: !!rec.done, doneAt: rec.doneAt || null, note: rec.note || "", planNote: bt.n || "", base: true });
    }
  }
  for (const key of store.keys("task:c-")) {
    const rec = store.get(key);
    if (!rec) continue;
    const f = rec.f || {};
    if (f.deleted) continue;
    add({ ord: 1e6, ...f, id: key.slice(5), done: !!rec.done, doneAt: rec.doneAt || null, note: rec.note || "", planNote: "", base: false });
  }
  const si = (s) => { const i = SECTIONS.indexOf(s); return i < 0 ? 9 : i; };
  for (const arr of byDate.values()) arr.sort((a, b) => si(a.s) - si(b.s) || a.ord - b.ord || a.id.localeCompare(b.id));
  _idx = { byDate, byId };
  _idxVer = store.ver;
  return _idx;
}
const tasksOn = (date) => index().byDate.get(date) || [];
function dayStats(date) {
  let total = 0, done = 0, min = 0, doneMin = 0, net = 0, netDone = 0;
  for (const t of tasksOn(date)) {
    total++; min += t.m || 0;
    if (t.done) { done++; doneMin += t.m || 0; }
    if (NET_CATS.includes(t.c)) { net += t.m || 0; if (t.done) netDone += t.m || 0; }
  }
  return { total, done, min, doneMin, net, netDone };
}
function doneInfo() {
  const dates = new Set();
  let count = 0;
  for (const t of index().byId.values()) if (t.done) { count++; if (t.doneAt) dates.add(iso(new Date(t.doneAt))); }
  return { dates, count };
}
function streak() {
  const { dates } = doneInfo();
  let d = todayISO();
  if (!dates.has(d)) d = addDays(d, -1);
  let n = 0;
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ============================ task mutations ============================ */
function patchTask(id, fPatch = {}, recPatch = {}) {
  const key = "task:" + id;
  const rec = { ...(store.get(key) || {}) };
  rec.f = { ...(rec.f || {}), ...fPatch };
  Object.assign(rec, recPatch);
  store.set(key, rec);
}
function toggleTask(id) {
  const t = index().byId.get(id);
  if (!t) return;
  const nowDone = !t.done;
  ui.focusId = id;
  if (nowDone) ui.justTicked.add(id);
  patchTask(id, {}, { done: nowDone, doneAt: nowDone ? new Date().toISOString() : null });
  if (nowDone) onTicked(id);
}
function moveTask(id, date) { patchTask(id, { date }); }
function reorderTask(id, dir) {
  const t = index().byId.get(id);
  if (!t) return;
  const sibs = tasksOn(t.date).filter((x) => x.s === t.s);
  const i = sibs.findIndex((x) => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= sibs.length) return;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  sibs.forEach((x, k) => { if (x.ord !== k * 10) patchTask(x.id, { ord: k * 10 }); });
}
function deleteTask(id) { patchTask(id, { deleted: true }); }
function swapDays(a, b) {
  const A = [...tasksOn(a)], B = [...tasksOn(b)];
  A.forEach((t) => patchTask(t.id, { date: b }));
  B.forEach((t) => patchTask(t.id, { date: a }));
}
function newCustomId() { return "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function createTasks(form) {
  const base = { t: form.t, s: form.s, c: form.c, m: form.m, start: form.start, prio: form.prio, u: form.u || undefined, ord: 1e6 };
  const dates = [form.date];
  if (form.repeat !== "none") {
    const end = settings().examDate || EXAM_DATE;
    const step = form.repeat === "weekly" ? 7 : 1;
    for (let d = addDays(form.date, step); d <= end && dates.length < 120; d = addDays(d, step)) dates.push(d);
  }
  const series = dates.length > 1 ? newCustomId() : undefined;
  for (const date of dates) {
    store.set("task:" + newCustomId(), { f: { ...base, date, series }, done: false, note: form.note || "" });
  }
}

/* ============================ rewards ============================ */
function drawReward() {
  const bags = LS.get("vw:bags", { o: [], q: [] });
  const useQ = Math.random() < 0.25;
  const name = useQ ? "q" : "o";
  const pool = useQ ? QUOTES : ORIGINAL;
  if (!Array.isArray(bags[name]) || !bags[name].length) bags[name] = shuffle([...pool.keys()]);
  const i = bags[name].pop();
  LS.set("vw:bags", bags);
  return useQ ? { kind: "quote", ...QUOTES[i] } : { kind: "original", text: ORIGINAL[i] };
}
let rewardTimer = 0;
function onTicked(id) {
  const t = index().byId.get(id) || { t: "" };
  const r = drawReward();
  const { count } = doneInfo();
  const extras = [];
  const st = dayStats(t.date);
  const todayDone = tasksOn(todayISO()).filter((x) => x.done).length;
  if (t.date === todayISO() && todayDone === 1) extras.push(TINY_VICTORY);
  const seen = LS.get("vw:ms:" + store.uid, []);
  const m = MILESTONES[count];
  if (m && !seen.includes(count)) { extras.push(`${m.title}. ${m.body}`); LS.set("vw:ms:" + store.uid, [...seen, count]); }
  const allDone = st.total > 0 && st.done === st.total;
  if (allDone) extras.push(ALL_DONE);
  const at = new Date().toISOString();
  store.set(`reward:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, { ...r, taskId: id, taskTitle: t.t, at });
  showReward(r, extras);
  if (settings().haptics && navigator.vibrate) { try { navigator.vibrate(allDone ? [18, 40, 18] : 14); } catch { /* ignore */ } }
  if (allDone) celebrate();
  if (settings().catLines) ui.catLine = CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)];
}
function showReward(r, extras = []) {
  const el = $("#reward");
  const label = r.kind === "quote" ? `From <em>${esc(r.work)}</em>` : "A line from the winter library";
  const badge = r.kind === "quote" ? "Published quotation" : "Original message";
  el.innerHTML = `
    <div class="rw-top"><span class="rw-badge" data-kind="${r.kind}">${badge}</span>
      <button class="rw-x" data-act="close-reward" aria-label="Dismiss this message">✕</button></div>
    <p class="rw-text">${r.kind === "quote" ? "“" + esc(r.text) + "”" : esc(r.text)}</p>
    <p class="rw-src">${r.kind === "quote" ? "— " + esc(r.author) + ", " + label : label}</p>
    ${extras.map((x) => `<p class="rw-extra">${esc(x)}</p>`).join("")}
    <button class="link" data-act="open-shelf">Open the Bookshelf</button>`;
  el.classList.add("show");
  clearTimeout(rewardTimer);
  rewardTimer = setTimeout(() => el.classList.remove("show"), 15000);
}
function celebrate() {
  if (document.documentElement.dataset.motion === "off") return;
  const c = $("#confetti");
  c.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s"></i>`).join("");
  setTimeout(() => { c.innerHTML = ""; }, 3600);
}
function sparkleAt(btn) {
  if (document.documentElement.dataset.motion === "off") return;
  for (let i = 0; i < 7; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    const a = (i / 7) * Math.PI * 2, d = 20 + Math.random() * 12;
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", Math.sin(a) * d + "px");
    btn.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

/* ============================ art: moon, cats, star map ============================ */
function moonSVG(date = new Date(), size = 56) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  let p = ((jd - 2451550.1) / 29.530588853) % 1;
  if (p < 0) p += 1;
  const r = 20, c = 24, k = Math.cos(2 * Math.PI * p), rx = Math.abs(k) * r;
  const waxing = p < 0.5;
  const outer = waxing ? 1 : 0;
  const sweep = waxing ? (k > 0 ? 0 : 1) : (k < 0 ? 0 : 1);
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx.toFixed(2)} ${r} 0 0 ${sweep} ${c} ${c - r} Z`;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" role="img" aria-label="Moon phase"><circle cx="24" cy="24" r="20" fill="#1a2250" stroke="#8fa2d8" stroke-opacity=".5"/><path d="${lit}" fill="#f4ecd0"/></svg>`;
}
const CATS_DEF = [
  { id: "ink", name: "Ink", at: 0, fur: "#1b1f3b", shade: "#11142a", ear: "#6a4a7e", eye: "#f2d27a" },
  { id: "frost", name: "Frost", at: 10, fur: "#dfe8f6", shade: "#b4c4de", ear: "#e8b7c8", eye: "#5b7fb5" },
  { id: "ember", name: "Ember", at: 40, fur: "#c97b3a", shade: "#a35f27", ear: "#f0b88a", eye: "#3f6b3a" },
  { id: "nyx", name: "Nyx", at: 100, fur: "#8576ad", shade: "#665a8c", ear: "#d9b5d9", eye: "#f2e08a" },
];
function catSVG(c, pose) {
  const f = c.fur, sh = c.shade, e = c.ear, dark = "#0b0e20";
  const face = (cx, cy, open) => open
    ? `<ellipse cx="${cx - 5}" cy="${cy}" rx="2.6" ry="3.6" fill="${c.eye}"/><ellipse cx="${cx + 5}" cy="${cy}" rx="2.6" ry="3.6" fill="${c.eye}"/><ellipse cx="${cx - 5}" cy="${cy}" rx="1" ry="3" fill="${dark}"/><ellipse cx="${cx + 5}" cy="${cy}" rx="1" ry="3" fill="${dark}"/>`
    : `<path d="M${cx - 8} ${cy} q3 3 6 0 M${cx + 2} ${cy} q3 3 6 0" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const nose = (cx, cy) => `<path d="M${cx - 2} ${cy} l2 2.4 l2 -2.4z" fill="#e6a0b4"/><path d="M${cx - 8} ${cy + 3} h-7 M${cx + 8} ${cy + 3} h7" stroke="#cdd6f5" stroke-opacity=".6" stroke-width=".8"/>`;
  let body = "";
  if (pose === "sit") {
    body = `<rect x="14" y="50" width="8" height="30" rx="1.5" fill="#efe6cf"/><ellipse cx="18" cy="43" rx="4.2" ry="7.5" fill="#ffd77a"/><circle cx="18" cy="43" r="12" fill="#ffd77a" opacity=".12"/>
      <path d="M86 78 C114 80 122 58 106 52" stroke="${f}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M54 80 C46 56 56 40 70 40 C84 40 94 56 86 80Z" fill="${f}"/>
      <circle cx="70" cy="30" r="14" fill="${f}"/><path d="M58 22 L60 7 L71 17Z M82 22 L80 7 L69 17Z" fill="${f}"/><path d="M61 19 L62 11 L67 17Z M79 19 L78 11 L73 17Z" fill="${e}"/>
      ${face(70, 30, true)}${nose(70, 36)}
      <ellipse cx="64" cy="80" rx="7" ry="4" fill="${sh}"/><ellipse cx="78" cy="80" rx="7" ry="4" fill="${sh}"/>`;
  } else if (pose === "loaf") {
    body = `<circle cx="112" cy="22" r="9" fill="#f4ecd0"/><circle cx="116" cy="20" r="8" fill="#0d1230"/>
      <path d="M22 66 C4 66 4 46 20 46" stroke="${f}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="66" cy="62" rx="38" ry="19" fill="${f}"/>
      <circle cx="100" cy="54" r="14" fill="${f}"/><path d="M89 46 L92 31 L103 43Z M101 43 L110 31 L114 48Z" fill="${f}"/><path d="M92 43 L93 36 L99 42Z M104 42 L109 36 L111 45Z" fill="${e}"/>
      ${face(100, 55, false)}${nose(100, 60)}`;
  } else {
    body = `<rect x="8" y="68" width="124" height="12" rx="3" fill="#3a4a8c"/><rect x="12" y="71" width="116" height="3" rx="1" fill="#e9e2cf" opacity=".8"/><rect x="20" y="60" width="100" height="9" rx="3" fill="#6a4a8c"/>
      <path d="M30 56 C8 58 4 38 22 36" stroke="${f}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="68" cy="50" rx="38" ry="15" fill="${f}"/>
      <circle cx="104" cy="49" r="14" fill="${f}"/><path d="M93 41 L96 26 L107 38Z M105 37 L114 26 L117 43Z" fill="${f}"/><path d="M96 38 L97 31 L103 37Z M108 36 L113 31 L114 40Z" fill="${e}"/>
      ${face(104, 50, false)}${nose(104, 55)}
      <text x="118" y="22" font-size="10" fill="#cbd6ff" opacity=".8">z</text><text x="124" y="14" font-size="7" fill="#cbd6ff" opacity=".6">z</text>`;
  }
  return `<svg viewBox="0 0 140 90" class="catsvg" role="img" aria-label="${c.name}, a ${pose === "sit" ? "sitting" : pose === "loaf" ? "resting" : "sleeping"} cat">${body}</svg>`;
}
function starMapSVG(done, total) {
  const W = 300, H = 140, n = Math.min(Math.max(total, done), 480), pts = [];
  const r = rng(20261216);
  for (let i = 0; i < n; i++) pts.push({ x: 8 + r() * (W - 16), y: 8 + r() * (H - 16), s: 0.7 + r() * 1.5 });
  let lines = "", dots = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i], lit = i < done;
    if (lit && i % 6 !== 5 && i + 1 < done) {
      const q = pts[i + 1];
      if (Math.hypot(p.x - q.x, p.y - q.y) < 70) lines += `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}"/>`;
    }
    dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(lit ? p.s : 0.7).toFixed(1)}" class="${lit ? "lit" : "dim"}${lit && i >= done - 3 ? " new" : ""}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="starmap" role="img" aria-label="Star map with ${done} stars lit"><g class="lines">${lines}</g>${dots}</svg>`;
}

/* ============================ rendering ============================ */
const catLabelCls = (c) => "c-" + slug(c);
function greeting() {
  const h = new Date().getHours();
  const k = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 22 ? "evening" : "night";
  const pool = GREET[k];
  const tpl = pool[new Date().getDate() % pool.length];
  const name = settings().name.trim();
  return tpl.replace(", {name}", name ? ", " + name : "").replace("{name}", name);
}
function ring(pct, label) {
  const R = 26, C = 2 * Math.PI * R;
  return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${label}"><circle cx="32" cy="32" r="${R}" class="rbg"/><circle cx="32" cy="32" r="${R}" class="rfg" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
}
const cbSVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect class="box" x="4" y="4" width="24" height="24" rx="3.5"/><path class="ink" pathLength="1" d="M8.5 16.8 C11 19.4 12.6 21.6 14 24.2 C17.6 16.4 21.8 11.2 26.4 6.6" /></svg>`;

function taskRow(t) {
  const meta = [];
  meta.push(`<span class="chip ${catLabelCls(t.c)}">${esc(t.c)}</span>`);
  if (t.m) meta.push(`<span>${hm(t.m)}</span>`);
  if (t.start) meta.push(`<span>starts ${esc(t.start)}</span>`);
  if (t.prio && t.prio !== "none") meta.push(`<span class="prio p-${esc(t.prio)}">${esc(t.prio)} priority</span>`);
  if (t.u) meta.push(`<span>${esc(t.u)}</span>`);
  if (t.base && t.date !== t.id.slice(0, 10)) meta.push(`<span class="moved">moved from ${fmtShort(t.id.slice(0, 10))}</span>`);
  const open = ui.menuFor === t.id;
  const anim = ui.justTicked.has(t.id) ? " draw" : "";
  return `<li class="task${t.done ? " done" : ""}" data-id="${esc(t.id)}">
    <button class="cb${anim}" role="checkbox" aria-checked="${t.done}" data-act="toggle" data-id="${esc(t.id)}" aria-label="${t.done ? "Completed" : "Mark complete"}: ${esc(t.t)}">${cbSVG}</button>
    <div class="tbody">
      <div class="ttitle">${esc(t.t)}</div>
      <div class="tmeta">${meta.join("")}</div>
      ${t.planNote ? `<div class="tnote plan">${esc(t.planNote)}</div>` : ""}
      ${t.note ? `<div class="tnote mine">${esc(t.note)}</div>` : ""}
    </div>
    <button class="more" data-act="menu" data-id="${esc(t.id)}" aria-haspopup="menu" aria-expanded="${open}" aria-label="Options for ${esc(t.t)}">⋯</button>
    ${open ? `<div class="menu" role="menu">
      <button role="menuitem" data-act="edit" data-id="${esc(t.id)}">Edit…</button>
      <button role="menuitem" data-act="up" data-id="${esc(t.id)}">Move up</button>
      <button role="menuitem" data-act="down" data-id="${esc(t.id)}">Move down</button>
      <button role="menuitem" data-act="tomorrow" data-id="${esc(t.id)}">Carry to the next day</button>
      <button role="menuitem" class="danger" data-act="del" data-id="${esc(t.id)}">Delete</button></div>` : ""}
  </li>`;
}

function weekStrip(date) {
  const ws = weekStart(date), today = todayISO();
  return `<nav class="weekstrip" aria-label="This week">` + Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i), st = dayStats(d);
    const pct = st.total ? st.done / st.total : 0;
    const ev = PLAN_BY_DATE[d]?.phase === "EV";
    return `<button data-act="goto" data-date="${d}" class="wd${d === date ? " cur" : ""}${d === today ? " today" : ""}${st.total && st.done === st.total ? " full" : ""}" aria-label="${fmtLong(d)}, ${st.done} of ${st.total} done"${d === date ? ' aria-current="date"' : ""}>
      <span class="wl">${parse(d).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3)}</span><span class="wn">${parse(d).getDate()}</span>
      <span class="wbar"><i style="width:${Math.round(pct * 100)}%"></i></span>${ev ? '<span class="wev" title="Event day">✦</span>' : ""}</button>`;
  }).join("") + `</nav>`;
}

function viewDay() {
  const date = ui.date, day = PLAN_BY_DATE[date], arr = tasksOn(date), st = dayStats(date);
  const pct = st.total ? st.done / st.total : 0;
  const collapsed = LS.get("vw:collapsed", {});
  const today = todayISO();
  const unfinished = [...index().byId.values()].filter((t) => !t.done && t.date < today).length;
  const secs = SECTIONS.map((s) => {
    const list = arr.filter((t) => t.s === s);
    if (!list.length) return "";
    const d = list.filter((t) => t.done).length, mins = list.reduce((a, t) => a + (t.m || 0), 0);
    return `<details class="sec" data-sec="${esc(s)}" ${collapsed[s] ? "" : "open"}>
      <summary><span class="sname">${esc(s)}</span><span class="shint">${esc(SECTION_HINT[s] || "")}</span><span class="scount">${d}/${list.length} · ${hm(mins)}</span></summary>
      <ul class="tasks">${list.map(taskRow).join("")}</ul>
      <button class="addin" data-act="add" data-sec="${esc(s)}">+ Add to ${esc(s)}</button></details>`;
  }).join("");
  const other = arr.filter((t) => !SECTIONS.includes(t.s));
  return `<section class="page">
    <div class="datebar">
      <button class="ghost sq" data-act="shift" data-n="-1" aria-label="Previous day">‹</button>
      <button class="ghost" data-act="today">Today</button>
      <button class="ghost sq" data-act="shift" data-n="1" aria-label="Next day">›</button>
      <label class="pick"><span class="sr">Pick a date</span><input type="date" id="datePick" value="${date}"></label>
    </div>
    <header class="pagehead">
      <div><h2>${fmtLong(date)}</h2>
        <p class="chips">${day ? `<span class="chip phase">${esc(PHASES[day.phase] || "")}</span><span class="chip">${esc(day.mode)}</span>` : '<span class="chip">Outside the plan</span>'}
          ${st.net ? `<span class="chip">${hm(st.netDone)} of ${hm(st.net)} NET study</span>` : ""}</p>
        ${day && day.commit ? `<p class="commit">${esc(day.commit)}</p>` : ""}
      </div>
      <div class="progress">${ring(pct, `${st.done} of ${st.total} tasks done`)}<p><strong>${st.done}</strong> of <strong>${st.total}</strong><br><span>tasks done</span></p></div>
    </header>
    ${weekStrip(date)}
    ${date === today && unfinished ? `<p class="gentle">${unfinished} earlier task${unfinished > 1 ? "s are" : " is"} still open. They are kept, never deleted. <button class="link" data-act="view" data-view="week">Review them</button></p>` : ""}
    <div class="journal">${secs || '<p class="empty">A blank page. Add a task, or simply rest. Both are allowed.</p>'}
      ${other.length ? `<ul class="tasks">${other.map(taskRow).join("")}</ul>` : ""}</div>
    <div class="dayactions"><button class="primary" data-act="add">+ Add a task</button>
      <button class="ghost" data-act="swap">Swap this day with another…</button></div>
  </section>`;
}

function viewMonth() {
  const ref = ui.month || ui.date.slice(0, 7);
  const [y, m] = ref.split("-").map(Number);
  const first = `${ref}-01`, lead = dow(first), days = new Date(y, m, 0).getDate(), today = todayISO();
  let cells = "";
  for (let i = 0; i < lead; i++) cells += `<span class="mc blank"></span>`;
  for (let d = 1; d <= days; d++) {
    const date = `${ref}-${pad(d)}`, st = dayStats(date), ev = PLAN_BY_DATE[date]?.phase === "EV";
    const cls = st.total ? (st.done === st.total ? "full" : st.done ? "part" : (date < today ? "open" : "plan")) : "";
    cells += `<button class="mc ${cls}${date === today ? " today" : ""}${date === ui.date ? " cur" : ""}" data-act="goto" data-date="${date}" aria-label="${fmtLong(date)}${st.total ? `, ${st.done} of ${st.total} done` : ", nothing planned"}">
      <span class="mn">${d}</span>${st.total ? `<span class="ms">${st.done}/${st.total}</span>` : ""}${ev ? '<span class="mev">✦</span>' : ""}</button>`;
  }
  const monthTotals = (() => { let t = 0, dn = 0; for (let d = 1; d <= days; d++) { const s = dayStats(`${ref}-${pad(d)}`); t += s.total; dn += s.done; } return { t, dn }; })();
  return `<section class="page"><div class="datebar">
    <button class="ghost sq" data-act="month" data-n="-1" aria-label="Previous month">‹</button>
    <h2 class="mtitle">${new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
    <button class="ghost sq" data-act="month" data-n="1" aria-label="Next month">›</button></div>
    <p class="muted">${monthTotals.dn} of ${monthTotals.t} tasks done this month. ✦ marks an event day. Open days stay open for you to move or finish.</p>
    <div class="mgrid" role="group" aria-label="Month"><span class="mh">S</span><span class="mh">M</span><span class="mh">T</span><span class="mh">W</span><span class="mh">T</span><span class="mh">F</span><span class="mh">S</span>${cells}</div>
    <p class="legend"><span class="lg full"></span>all done <span class="lg part"></span>some done <span class="lg plan"></span>planned <span class="lg open"></span>earlier, still open</p></section>`;
}

function viewWeek() {
  const ws = weekStart(ui.date), today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const stats = days.map((d) => ({ d, ...dayStats(d) }));
  const maxNet = Math.max(300, ...stats.map((s) => s.net));
  const tot = stats.reduce((a, s) => ({ net: a.net + s.net, done: a.done + s.netDone, t: a.t + s.total, td: a.td + s.done }), { net: 0, done: 0, t: 0, td: 0 });
  const bars = stats.map((s) => `<button class="bar" data-act="goto" data-date="${s.d}" aria-label="${fmtLong(s.d)}: ${hm(s.netDone)} of ${hm(s.net)} NET study">
      <span class="col"><i class="plan" style="height:${(s.net / maxNet) * 100}%"></i><i class="did" style="height:${(s.netDone / maxNet) * 100}%"></i></span>
      <span class="bl">${parse(s.d).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3)}</span><span class="bv">${s.net ? hm(s.netDone) + "/" + hm(s.net) : "–"}</span></button>`).join("");
  const open = [...index().byId.values()].filter((t) => !t.done && t.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = PLAN.filter((d) => d.date >= today && d.commit && d.date <= addDays(today, 21)).slice(0, 10);
  return `<section class="page"><div class="datebar">
    <button class="ghost sq" data-act="shift" data-n="-7" aria-label="Previous week">‹</button>
    <h2 class="mtitle">${fmtShort(ws)} – ${fmtShort(days[6])}</h2>
    <button class="ghost sq" data-act="shift" data-n="7" aria-label="Next week">›</button></div>
    <p class="muted">NET study (Psychology, Paper 1, mocks): <strong>${hm(tot.done)}</strong> done of <strong>${hm(tot.net)}</strong> planned. ${tot.td} of ${tot.t} tasks ticked.</p>
    <div class="bars">${bars}</div>
    <h3>Still open from earlier days <small>(${open.length})</small></h3>
    <p class="muted">Nothing here has been dropped. Move what still matters to today; the rest can wait or be deleted by you.</p>
    <ul class="openlist">${open.slice(0, 40).map((t) => `<li><span class="od">${fmtShort(t.date)}</span><span class="ot">${esc(t.t)}</span>
      <span class="oa"><button class="ghost sm" data-act="toggle" data-id="${esc(t.id)}">Mark done</button><button class="ghost sm" data-act="totoday" data-id="${esc(t.id)}">Move to today</button><button class="ghost sm" data-act="goto" data-date="${t.date}">Open day</button></span></li>`).join("") || '<li class="empty">Nothing left behind. Lovely.</li>'}</ul>
    ${open.length > 40 ? `<p class="muted">Showing the latest 40.</p>` : ""}
    <h3>Coming up</h3><ul class="openlist">${upcoming.map((d) => `<li><span class="od">${fmtShort(d.date)}</span><span class="ot">${esc(d.commit)}</span><span class="oa"><button class="ghost sm" data-act="goto" data-date="${d.date}">Open</button></span></li>`).join("") || '<li class="empty">No commitments listed.</li>'}</ul></section>`;
}

function viewUnits() {
  const all = [...index().byId.values()];
  const row = (u, info) => {
    const list = all.filter((t) => t.u === u && t.c !== "Commute");
    const tot = list.reduce((a, t) => a + (t.m || 0), 0), dn = list.filter((t) => t.done).reduce((a, t) => a + (t.m || 0), 0);
    const rp = list.filter((t) => /unit session/.test(t.t));
    const rpDone = rp.filter((t) => t.done).length;
    const pct = tot ? dn / tot : 0;
    return `<li class="unit"><div class="uh"><strong>${u}</strong> <span>${esc(info.name)}</span> <span class="chip tier-${info.tier}">Tier ${info.tier}</span></div>
      <div class="ubar" role="img" aria-label="${Math.round(pct * 100)} percent done"><i style="width:${Math.round(pct * 100)}%"></i></div>
      <div class="ud">${hm(dn)} of ${hm(tot)} planned · budget ${info.budget}h · ma'am's replay: ${rp.length ? (rpDone ? "watched" : "not yet") : "not scheduled"}</div></li>`;
  };
  const sum = (cat) => { const l = all.filter((t) => t.c === cat); return { n: l.length, d: l.filter((t) => t.done).length, tot: l.reduce((a, t) => a + (t.m || 0), 0), dn: l.filter((t) => t.done).reduce((a, t) => a + (t.m || 0), 0) }; };
  const p1 = sum("Paper 1"), mk = sum("Mock");
  return `<section class="page"><h2>Units</h2>
    <p class="muted">Progress is the planned time of ticked tasks. "Budget" is first-pass study time; "planned" also includes ma'am's replay and the patch days. Tier A units had repeated misses in your papers and get the most time.</p>
    <ul class="units">${Object.entries(UNITS).map(([u, i]) => row(u, i)).join("")}</ul>
    <h3>Paper 1 and mocks</h3>
    <ul class="units"><li class="unit"><div class="uh"><strong>Paper 1</strong> <span>daily blocks</span></div><div class="ubar"><i style="width:${p1.tot ? Math.round(p1.dn / p1.tot * 100) : 0}%"></i></div><div class="ud">${p1.d} of ${p1.n} sessions · ${hm(p1.dn)} of ${hm(p1.tot)}</div></li>
    <li class="unit"><div class="uh"><strong>Mocks and analysis</strong></div><div class="ubar"><i style="width:${mk.tot ? Math.round(mk.dn / mk.tot * 100) : 0}%"></i></div><div class="ud">${mk.d} of ${mk.n} blocks · ${hm(mk.dn)} of ${hm(mk.tot)}</div></li></ul>
    <h3>The flow for each unit</h3><p class="flow">${esc(UNIT_FLOW)}</p></section>`;
}

function viewShelf() {
  const { count } = doneInfo();
  const cur = settings().cat;
  const rewards = store.keys("reward:").map((k) => store.get(k)).filter(Boolean).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  const past = []; for (let d = todayISO(); d >= PLAN_START && past.length < 21; d = addDays(d, -1)) if (PLAN_BY_DATE[d]) past.push(d);
  return `<section class="page"><h2>The Bookshelf</h2>
    <h3>Cats of the library</h3><p class="muted">${count} stars so far. New cats arrive as you keep ticking; tap an unlocked cat to have it keep you company.</p>
    <div class="catgrid">${CATS_DEF.map((c) => { const un = count >= c.at; return `<button class="catcard${un ? "" : " locked"}${cur === c.id ? " sel" : ""}" ${un ? `data-act="pickcat" data-id="${c.id}"` : "disabled"} aria-label="${c.name}${un ? "" : ", unlocks at " + c.at + " stars"}">${un ? catSVG(c, "sit") : '<div class="lock">?</div>'}<strong>${un ? c.name : "A new cat"}</strong><small>${un ? (cur === c.id ? "with you now" : "tap to choose") : `arrives at ${c.at} stars`}</small></button>`; }).join("")}</div>
    <h3>Words of encouragement <small>(${rewards.length})</small></h3>
    <ul class="rlist">${rewards.slice(0, ui.shelfMore).map((r) => `<li data-kind="${r.kind}"><p>${r.kind === "quote" ? "“" + esc(r.text) + "”" : esc(r.text)}</p><small>${r.kind === "quote" ? esc(r.author) + ", <em>" + esc(r.work) + "</em> · published quotation" : "Original message"} · for “${esc(r.taskTitle || "a task")}” · ${r.at ? new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}</small></li>`).join("") || '<li class="empty">Tick your first task and a line will land here.</li>'}</ul>
    ${rewards.length > ui.shelfMore ? `<button class="ghost" data-act="shelfmore">Show more</button>` : ""}
    <h3>Past pages</h3><ul class="openlist">${past.map((d) => { const s = dayStats(d); return `<li><span class="od">${fmtShort(d)}</span><span class="ot">${s.done} of ${s.total} done</span><span class="oa"><button class="ghost sm" data-act="goto" data-date="${d}">Open</button></span></li>`; }).join("") || '<li class="empty">No past pages yet.</li>'}</ul></section>`;
}

function viewSettings() {
  const s = settings();
  const acct = ctx.mode === "cloud" ? `Signed in as <strong>${esc(ctx.user?.email || "your account")}</strong>.` : "You are using the app on this device only. Nothing is synced.";
  return `<section class="page settings"><h2>Settings</h2>
    <div class="field"><label for="s-name">Your name (for the greeting)</label><input id="s-name" data-set="name" type="text" value="${esc(s.name)}" autocomplete="given-name"></div>
    <div class="field"><label for="s-exam">Exam date</label><input id="s-exam" data-set="examDate" type="date" value="${esc(s.examDate)}"><small>Assumed Dec 16. Change it once NTA publishes your shift.</small></div>
    <div class="field"><label><input data-set="snow" type="checkbox" ${s.snow ? "checked" : ""}> Falling snow</label></div>
    <div class="field"><label for="s-motion">Animations</label><select id="s-motion" data-set="motion"><option value="auto" ${s.motion === "auto" ? "selected" : ""}>Follow my device setting</option><option value="off" ${s.motion === "off" ? "selected" : ""}>Off (no animation)</option></select></div>
    <div class="field"><label for="s-decor">Decoration</label><select id="s-decor" data-set="decor"><option value="full" ${s.decor === "full" ? "selected" : ""}>Full</option><option value="minimal" ${s.decor === "minimal" ? "selected" : ""}>Minimal (no sky, no snow)</option></select></div>
    <div class="field"><label><input data-set="haptics" type="checkbox" ${s.haptics ? "checked" : ""}> Gentle vibration when I tick (where supported)</label></div>
    <div class="field"><label><input data-set="catLines" type="checkbox" ${s.catLines ? "checked" : ""}> Cat messages</label></div>
    <h3>Account and sync</h3><p>${acct}</p>
    <p class="row"><button class="ghost" data-act="syncnow">Sync now</button>${ctx.mode === "cloud" ? '<button class="ghost" data-act="signout">Sign out</button>' : '<button class="ghost" data-act="signin">Sign in or create an account</button>'}</p>
    <p class="muted" id="syncDetail"></p>
    <h3>Backup</h3><p class="muted">Your data lives in Supabase. A downloaded copy is a good extra safety net.</p>
    <p class="row"><button class="ghost" data-act="export">Export backup (JSON)</button><label class="ghost filebtn">Import backup<input type="file" id="importFile" accept="application/json" hidden></label></p>
    <h3>This device</h3><p class="row"><button class="ghost danger" data-act="clearcache">Clear cached data on this device</button></p>
    <p class="muted">Clearing only removes the local copy. Anything not yet synced would be lost, so the app will refuse while changes are still queued.</p></section>`;
}
const VIEWS = { day: viewDay, month: viewMonth, week: viewWeek, units: viewUnits, shelf: viewShelf, settings: viewSettings };
const TABS = [["day", "Day"], ["month", "Month"], ["week", "Week"], ["units", "Units"], ["shelf", "Shelf"], ["settings", "Settings"]];

function renderTop() {
  $("#greet").textContent = greeting();
  $("#tabs").innerHTML = TABS.map(([v, l]) => `<button data-act="view" data-view="${v}" ${ui.view === v ? 'aria-current="page"' : ""}>${l}</button>`).join("");
}
function renderSide() {
  const s = settings(), { count } = doneInfo(), total = index().byId.size, st = streak();
  const days = Math.round((parse(s.examDate) - parse(todayISO())) / 86400000);
  const cat = CATS_DEF.find((c) => c.id === s.cat && count >= c.at) || CATS_DEF[0];
  const poses = ["sleep", "sit", "loaf"], pose = poses[Math.floor(new Date().getTime() / 86400000) % 3];
  const todayAll = dayStats(todayISO());
  const line = ui.catLine || CAT_LINES[Math.floor(new Date().getTime() / 3600000) % CAT_LINES.length];
  $("#side").innerHTML = `
    <section class="card window" aria-label="Moon and exam countdown"><div class="arch"><span class="moonwrap">${moonSVG()}</span><i class="mtn"></i></div>
      <p class="count">${days > 0 ? `<strong>${days}</strong> day${days === 1 ? "" : "s"} to the exam` : days === 0 ? "<strong>Exam day.</strong> You are ready." : "The exam date has passed"}</p><small>Exam date: ${fmtShort(s.examDate)}${s.examDate === EXAM_DATE ? " (assumed)" : ""}</small></section>
    <section class="card"><div class="two"><div><strong class="big">${st}</strong><small>${st ? `day${st === 1 ? "" : "s"} in a row with a tick` : "a new page begins today"}</small></div>
      <div><strong class="big">${count}</strong><small>stars lit</small></div></div>
      <p class="muted">Today: ${todayAll.done}/${todayAll.total} tasks, ${hm(todayAll.doneMin)} of ${hm(todayAll.min)}.</p></section>
    <section class="card cat"><button class="catbtn" data-act="catline" aria-label="Pet the cat">${catSVG(cat, pose)}</button><p class="bubble">${esc(line)}</p></section>
    <section class="card"><h3>Star map</h3>${starMapSVG(count, total)}<small>Every ticked task lights a star. Faint stars are still to come.</small></section>`;
}
function renderSync(s) {
  const el = $("#syncPill");
  if (!el) return;
  const t = { local: "On this device only", synced: "Saved to cloud", syncing: "Syncing…", offline: `Offline · ${s.pending} queued`, error: "Sync problem · retrying" }[s.kind];
  el.dataset.kind = s.kind;
  el.textContent = t;
  el.title = s.msg || "";
  const d = $("#syncDetail");
  if (d) d.textContent = s.kind === "error" ? `Last error: ${s.msg}` : s.pending ? `${s.pending} change${s.pending > 1 ? "s" : ""} waiting to sync.` : "Everything is saved.";
}
function render() {
  if (!ctx.mode) return;
  renderTop();
  const main = $("#main");
  // Don't rebuild the page under someone who is typing (e.g. a background sync arrives), unless they just acted.
  const typing = !forceNext && document.activeElement && main.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  forceNext = false;
  if (!typing) {
    const y = window.scrollY;
    main.innerHTML = VIEWS[ui.view]();
    window.scrollTo(0, y);
    if (ui.focusId) { const b = $(`.cb[data-id="${CSS.escape(ui.focusId)}"]`, main); if (b) { b.focus({ preventScroll: true }); if (ui.justTicked.has(ui.focusId)) sparkleAt(b); } ui.focusId = null; }
    ui.justTicked.clear();
  }
  renderSide();
  renderSync(sync.status);
}
let rafId = 0, forceNext = false;
const scheduleRender = (force) => { if (force === true) forceNext = true; cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); };

/* ============================ effects: snow, motion ============================ */
let snowRaf = 0, flakes = [];
function applyEffects() {
  const s = settings();
  const osReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const off = s.motion === "off" || (s.motion === "auto" && osReduce);
  document.documentElement.dataset.motion = off ? "off" : "on";
  document.documentElement.dataset.decor = s.decor;
  const canvas = $("#snow");
  cancelAnimationFrame(snowRaf);
  const g = canvas.getContext("2d");
  if (off || !s.snow || s.decor === "minimal") { g.clearRect(0, 0, canvas.width, canvas.height); canvas.hidden = true; return; }
  canvas.hidden = false;
  const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; const n = Math.round(Math.min(110, (canvas.width * canvas.height) / 15000)); flakes = Array.from({ length: n }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: 0.6 + Math.random() * 1.7, v: 0.25 + Math.random() * 0.7, d: Math.random() * 6.28 })); };
  size();
  const step = () => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "rgba(232,240,255,.78)";
    for (const f of flakes) { f.y += f.v; f.d += 0.012; f.x += Math.sin(f.d) * 0.3; if (f.y > canvas.height + 4) { f.y = -4; f.x = Math.random() * canvas.width; } g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill(); }
    snowRaf = document.hidden ? 0 : requestAnimationFrame(step);
  };
  step();
}
let resizeT = 0;
addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(applyEffects, 250); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && !snowRaf) applyEffects(); });

/* ============================ task dialog ============================ */
const dlg = () => $("#dlg");
function openDialog({ id, date, section } = {}) {
  const t = id ? index().byId.get(id) : null;
  const f = $("#dlgForm");
  f.reset();
  $("#dlgTitle").textContent = t ? "Edit task" : "New task";
  $("#f-sec").innerHTML = SECTIONS.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#f-cat").innerHTML = CATS.map((c) => `<option>${esc(c)}</option>`).join("");
  $("#f-unit").innerHTML = `<option value="">—</option>` + Object.keys(UNITS).map((u) => `<option>${u}</option>`).join("");
  f.dataset.id = id || "";
  $("#f-title").value = t ? t.t : "";
  $("#f-sec").value = t ? t.s : section || "Evening";
  $("#f-cat").value = t ? t.c : "Psychology";
  $("#f-min").value = t ? t.m || "" : 60;
  $("#f-start").value = t ? t.start || "" : "";
  $("#f-prio").value = t ? t.prio || "none" : "none";
  $("#f-date").value = t ? t.date : date || ui.date;
  $("#f-unit").value = t ? t.u || "" : "";
  $("#f-note").value = t ? t.note || "" : "";
  $("#f-repeat").value = "none";
  $("#repeatRow").hidden = !!t;
  $("#f-del").hidden = !t;
  dlg().showModal();
  $("#f-title").focus();
}
function submitDialog() {
  const f = $("#dlgForm"), id = f.dataset.id;
  const form = {
    t: $("#f-title").value.trim(), s: $("#f-sec").value, c: $("#f-cat").value, m: Math.max(0, parseInt($("#f-min").value, 10) || 0),
    start: $("#f-start").value, prio: $("#f-prio").value, date: $("#f-date").value || ui.date, u: $("#f-unit").value,
    note: $("#f-note").value.trim(), repeat: $("#f-repeat").value,
  };
  if (!form.t) { $("#f-title").focus(); return; }
  if (id) {
    patchTask(id, { t: form.t, s: form.s, c: form.c, m: form.m, start: form.start, prio: form.prio, date: form.date, u: form.u || undefined }, { note: form.note });
  } else {
    createTasks(form);
  }
  dlg().close();
}

/* ============================ actions ============================ */
const taskIdOf = (el) => el.closest("[data-id]")?.dataset.id || el.dataset.id;
const actions = {
  toggle: (el) => toggleTask(el.dataset.id),
  menu: (el) => { ui.menuFor = ui.menuFor === el.dataset.id ? null : el.dataset.id; ui.focusId = null; },
  edit: (el) => { ui.menuFor = null; openDialog({ id: el.dataset.id }); },
  up: (el) => { reorderTask(el.dataset.id, -1); ui.menuFor = null; },
  down: (el) => { reorderTask(el.dataset.id, 1); ui.menuFor = null; },
  tomorrow: (el) => { const t = index().byId.get(el.dataset.id); if (t) moveTask(t.id, addDays(t.date, 1)); ui.menuFor = null; },
  del: (el) => { ui.menuFor = null; const t = index().byId.get(el.dataset.id); if (t && confirm(`Delete “${t.t}”? It will disappear from your pages.`)) deleteTask(t.id); },
  totoday: (el) => moveTask(el.dataset.id, todayISO()),
  add: (el) => openDialog({ section: el.dataset.sec }),
  swap: () => {
    const other = prompt(`Swap everything on ${fmtLong(ui.date)} with which day? Enter a date as YYYY-MM-DD (for example ${addDays(ui.date, 1)}).`, addDays(ui.date, 1));
    if (!other) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(other) || isNaN(parse(other))) { alert("That date doesn't look right. Please use YYYY-MM-DD."); return; }
    if (other !== ui.date) swapDays(ui.date, other);
  },
  goto: (el) => { ui.date = el.dataset.date; ui.view = "day"; ui.menuFor = null; saveUi(); window.scrollTo(0, 0); },
  shift: (el) => { ui.date = addDays(ui.date, Number(el.dataset.n)); ui.menuFor = null; },
  today: () => { ui.date = todayISO(); ui.menuFor = null; },
  month: (el) => { const [y, m] = (ui.month || ui.date.slice(0, 7)).split("-").map(Number); const d = new Date(y, m - 1 + Number(el.dataset.n), 1); ui.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
  view: (el) => { ui.view = el.dataset.view; ui.menuFor = null; if (ui.view === "month") ui.month = ui.date.slice(0, 7); saveUi(); window.scrollTo(0, 0); },
  "open-shelf": () => { ui.view = "shelf"; saveUi(); $("#reward").classList.remove("show"); },
  "close-reward": () => $("#reward").classList.remove("show"),
  catline: () => { ui.catLine = CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)]; },
  pickcat: (el) => saveSettings({ cat: el.dataset.id }),
  shelfmore: () => { ui.shelfMore += 40; },
  syncnow: () => sync.syncNow("manual"),
  signout: async () => { if (ctx.client) await ctx.client.auth.signOut(); },
  signin: () => showAuth(),
  export: () => exportBackup(),
  clearcache: () => {
    if (store.dirty.size) { alert(`${store.dirty.size} change(s) haven't synced yet. Connect to the internet and sync first.`); return; }
    if (!confirm("Remove the cached copy on this device? Your cloud data stays safe.")) return;
    for (const s of ["items", "dirty", "lastpull"]) LS.del(`vw:v1:${store.uid}:${s}`);
    location.reload();
  },
};
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) { if (ui.menuFor && !e.target.closest(".menu")) { ui.menuFor = null; scheduleRender(); } return; }
  const fn = actions[el.dataset.act];
  if (!fn) return;
  const before = store.ver;
  fn(el);
  if (store.ver === before) scheduleRender(); // store changes already re-render via the listener
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (ui.menuFor) { ui.menuFor = null; scheduleRender(); } $("#reward").classList.remove("show"); }
});
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (d.matches && d.matches("details.sec")) { const c = LS.get("vw:collapsed", {}); c[d.dataset.sec] = !d.open; LS.set("vw:collapsed", c); }
}, true);
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "datePick") { if (el.value) { ui.date = el.value; scheduleRender(true); } return; }
  if (el.id === "importFile") { importBackup(el.files[0]); el.value = ""; return; }
  if (el.dataset && el.dataset.set) {
    const k = el.dataset.set;
    saveSettings({ [k]: el.type === "checkbox" ? el.checked : el.value });
    applyEffects();
  }
});

function exportBackup() {
  const items = {};
  for (const [k, v] of store.items) if (!v.deleted) items[k] = { data: v.data, ts: v.ts };
  const blob = new Blob([JSON.stringify({ app: "velaris-winter", version: 1, exportedAt: new Date().toISOString(), items }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `velaris-backup-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importBackup(file) {
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== "velaris-winter" || !j.items) throw new Error("not a Velaris backup");
    const n = Object.keys(j.items).length;
    if (!confirm(`Import ${n} items? They will replace matching items on all your devices.`)) return;
    for (const [k, v] of Object.entries(j.items)) store.set(k, v.data);
    alert("Backup imported.");
  } catch (err) { alert("That file couldn't be imported: " + err.message); }
}

/* ============================ auth overlay ============================ */
function showAuth(msg = "") {
  const o = $("#auth");
  o.hidden = false;
  $("#authMsg").textContent = msg;
  const cfgOk = !!ctx.client;
  $("#authForm").hidden = !cfgOk;
  $("#authNoCfg").hidden = cfgOk;
  $("#authEmail").focus();
}
const hideAuth = () => { $("#auth").hidden = true; };
async function authAction(kind) {
  const email = $("#authEmail").value.trim(), password = $("#authPass").value;
  const msg = (t) => { $("#authMsg").textContent = t; };
  if (!email) { msg("Please enter your email."); return; }
  msg("One moment…");
  try {
    const redirect = location.origin + location.pathname;
    if (kind === "magic") {
      const { error } = await ctx.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (error) throw error;
      msg("Check your email for the sign-in link. Open it on this device.");
    } else if (!password || password.length < 6) {
      msg("Please enter a password (at least 6 characters).");
    } else if (kind === "signup") {
      const { data, error } = await ctx.client.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
      if (error) throw error;
      msg(data.session ? "Welcome." : "Account created. Check your email to confirm it, then sign in.");
    } else {
      const { error } = await ctx.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) { msg(err.message || String(err)); }
}

/* ============================ boot ============================ */
let shellBuilt = false;
function ensureShell() {
  if (shellBuilt) return;
  shellBuilt = true;
  $("#app").hidden = false;
}
function adoptLocal() {
  if (store.uid === "local") return;
  const raw = LS.get("vw:v1:local:items", null);
  if (!raw || !Object.keys(raw).length) return;
  for (const [k, v] of Object.entries(raw)) if (!store.items.has(k)) store.set(k, v.data);
  for (const s of ["items", "dirty", "lastpull"]) LS.del(`vw:v1:local:${s}`);
}
async function startCloud(user, opts = {}) {
  if (ctx.mode === "cloud" && ctx.user && ctx.user.id === user.id) return;
  ctx.mode = "cloud"; ctx.user = user; ctx.offlineOnly = !!opts.offlineOnly;
  store.load(user.id);
  adoptLocal();
  LS.set("vw:lastuser", user.id); LS.set("vw:lastemail", user.email || "");
  hideAuth(); ensureShell(); applyEffects(); render();
  if (opts.offlineOnly) { sync.setStatus("offline"); addEventListener("online", () => location.reload(), { once: true }); return; }
  await sync.start(ctx.client, user);
  applyEffects(); render();
}
function startLocal(reason) {
  ctx.mode = "local"; ctx.user = null;
  store.load("local");
  hideAuth(); ensureShell(); applyEffects(); render();
  sync.setStatus("local");
  if (reason === "config") $("#banner").textContent = "Cloud sync isn't set up yet (config.js is empty), so your ticks are saved on this device only.";
  else if (reason === "lib") $("#banner").textContent = "The sync library didn't load, so your ticks are saved on this device only.";
  else $("#banner").textContent = "Using this device only. Sign in from Settings to sync across devices.";
  $("#banner").hidden = false;
}
function onSignedOut() {
  sync.stop();
  ctx.mode = null; ctx.user = null;
  $("#app").hidden = true; shellBuilt = false;
  showAuth("Signed out.");
}

async function boot() {
  store.on(() => scheduleRender());
  $("#authForm").addEventListener("submit", (e) => { e.preventDefault(); authAction("signin"); });
  $("#btnSignup").addEventListener("click", () => authAction("signup"));
  $("#btnMagic").addEventListener("click", () => authAction("magic"));
  $$("[data-local]").forEach((b) => b.addEventListener("click", () => startLocal("chosen")));
  $("#dlgForm").addEventListener("submit", (e) => { e.preventDefault(); submitDialog(); });
  $("#f-cancel").addEventListener("click", () => dlg().close());
  $("#f-del").addEventListener("click", () => { const id = $("#dlgForm").dataset.id; const t = index().byId.get(id); if (t && confirm(`Delete “${t.t}”?`)) { deleteTask(id); dlg().close(); } });
  $("#syncBtn").addEventListener("click", () => sync.syncNow("manual"));
  const { client, reason } = makeClient();
  if (!client) { startLocal(reason); return; }
  ctx.client = client;
  let handled = false;
  client.auth.onAuthStateChange((event, session) => {
    // Never await supabase calls inside this callback: hand off to a timer.
    setTimeout(() => {
      if (event === "SIGNED_OUT") { onSignedOut(); return; }
      if (session && session.user) { handled = true; startCloud(session.user); return; }
      if (event === "INITIAL_SESSION" && !handled) {
        const last = LS.get("vw:lastuser", null);
        if (!navigator.onLine && last) startCloud({ id: last, email: LS.get("vw:lastemail", "") }, { offlineOnly: true });
        else showAuth();
      }
    }, 0);
  });
}

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
boot();
// Exposed for automated tests only.
window.__vw = { store, sync, ctx, ui, index, settings };
