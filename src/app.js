/* 737 NUDGE — app logic (vanilla JS, no build step). Content comes from window.NUDGE (content.js). */
(() => {
"use strict";

const DATA = window.NUDGE || { capsules: [], masterclasses: [] };
const CAPS = DATA.capsules;
const MCS = DATA.masterclasses;
const CAP_TIME = 180;
const LS = "nudge737.v1";

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); };
const fmt = (t) => { const a = Math.abs(t); return `${t < 0 ? "+" : ""}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const COLORS = { memory: ["#ff5ad9", "#ffb428", "#ff4f61", "#3fe0ff", "#45f0a0"], maneuver: ["#45f0a0", "#3fe0ff"], sop: ["#3fe0ff", "#a6b4ff"] };
const CAT = { memory: "Memory items", maneuver: "Manœuvres", sop: "SOP compagnie" };
const LEITNER = [1, 1, 3, 7, 14, 30];

/* ---------- state ---------- */
const DEF = { xp: 0, streak: 0, best: 0, last: null, fleet: "MAX", sound: true, cap: {}, mc: {}, miss: {}, day: { k: null, n: 0 }, badges: [], q: 0, ok: 0, cleared: 0 };
let S = structuredClone(DEF);
try { const v = localStorage.getItem(LS); if (v) S = { ...S, ...JSON.parse(v) }; } catch (e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };

/* streak breaks if a day was skipped */
if (S.last && S.last !== dayKey() && S.last !== addDays(-1)) { S.streak = 0; save(); }

const visible = (c) => !c.fleet || c.fleet === "both" || c.fleet === S.fleet;
const capsVisible = () => CAPS.filter(visible);
const mcsVisible = () => MCS.filter(visible);
const capColor = (c) => c.color || COLORS[c.cat]?.[CAPS.filter((x) => x.cat === c.cat).indexOf(c) % COLORS[c.cat].length] || "#3fe0ff";
const isDue = (id) => S.cap[id] && S.cap[id].due <= dayKey();
const missDue = () => Object.entries(S.miss).filter(([, m]) => m.due <= dayKey() && findQ(m.id, m.qi)).map(([k, m]) => ({ key: k, ...m }));
const reviewCount = () => missDue().length + capsVisible().filter((c) => isDue(c.id)).length;
function findQ(id, qi) { const c = CAPS.find((x) => x.id === id) || MCS.find((x) => x.id === id); return c && c.qcm[qi] ? { c, q: c.qcm[qi] } : null; }

/* ---------- ranks & badges ---------- */
const RANKS = [
  { xp: 0, n: "Cadet", s: 1 }, { xp: 300, n: "First Officer", s: 2 }, { xp: 900, n: "Senior First Officer", s: 3 },
  { xp: 2000, n: "Captain", s: 4 }, { xp: 4000, n: "Captain · TRI", s: 4 }, { xp: 7000, n: "Captain · TRE", s: 4 },
];
const rankOf = (xp) => { let i = 0; RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; }); return { ...RANKS[i], i, next: RANKS[i + 1] }; };
const allBest = (cat) => { const l = CAPS.filter((c) => c.cat === cat); return l.length > 0 && l.every((c) => (S.cap[c.id]?.best || 0) >= 4); };
const BADGES = [
  { id: "first", g: "1", n: "Premier vol", d: "Terminer une capsule", t: () => Object.keys(S.cap).length > 0 },
  { id: "perfect", g: "5/5", n: "Sans faute", d: "5/5 à une capsule", t: () => Object.values(S.cap).some((c) => c.best >= 5) },
  { id: "fast", g: "90s", n: "Réflexe", d: "Capsule ≥ 4/5 en moins de 90 s", t: () => Object.values(S.cap).some((c) => c.fast) },
  { id: "st3", g: "3", n: "Régulier", d: "Série de 3 jours", t: () => S.best >= 3 },
  { id: "st7", g: "7", n: "Semaine pleine", d: "Série de 7 jours", t: () => S.best >= 7 },
  { id: "st30", g: "30", n: "Line check ready", d: "Série de 30 jours", t: () => S.best >= 30 },
  { id: "mem", g: "MEM", n: "Memory items", d: "Toutes les capsules memory ≥ 4/5", t: () => allBest("memory") },
  { id: "man", g: "MAN", n: "Manœuvres", d: "Toutes les manœuvres ≥ 4/5", t: () => allBest("maneuver") },
  { id: "sop", g: "SOP", n: "Standard", d: "Toutes les capsules SOP ≥ 4/5", t: () => allBest("sop") },
  { id: "mc1", g: "MC", n: "Masterclass", d: "Terminer une masterclass", t: () => Object.keys(S.mc).length > 0 },
  { id: "mcall", g: "TRI", n: "Instructeur", d: "Toutes les masterclass ≥ 6/8", t: () => MCS.length > 0 && MCS.every((m) => (S.mc[m.id]?.best || 0) >= 6) },
  { id: "deb", g: "DEB", n: "Débrief", d: "Corriger 10 erreurs en révision", t: () => S.cleared >= 10 },
];
function checkBadges() {
  const fresh = BADGES.filter((b) => !S.badges.includes(b.id) && b.t());
  fresh.forEach((b) => S.badges.push(b.id));
  return fresh;
}

/* ---------- sound & haptics ---------- */
let AC = null;
function beep(ok) {
  try { navigator.vibrate && navigator.vibrate(ok ? 18 : [40, 50, 40]); } catch (e) {}
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [880, 1320] : [196, 147];
    notes.forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + i * 0.09;
      o.type = ok ? "sine" : "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ok ? 0.12 : 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.18);
    });
  } catch (e) {}
}

/* ---------- XP / streak ---------- */
function award(xp) {
  S.xp += xp;
  const k = dayKey();
  if (S.last !== k) { S.streak = S.last === addDays(-1) ? S.streak + 1 : 1; S.last = k; }
  S.best = Math.max(S.best, S.streak);
  if (S.day.k !== k) S.day = { k, n: 0 };
  S.day.n++;
}
function noteMiss(id, qi, ok) {
  const key = `${id}#${qi}`;
  S.q++; if (ok) S.ok++;
  if (!ok) S.miss[key] = { id, qi, due: addDays(1), n: (S.miss[key]?.n || 0) + 1 };
}

/* ---------- views ---------- */
const app = $("#app");
let tab = "home", P = null, tick = null;

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  lib: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  mc: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
};

function header() {
  const r = rankOf(S.xp);
  return `<div class="top">
    <div class="logo"><b>737</b> NUDGE</div>
    <div class="chips">
      <div class="fleet" role="group" aria-label="Flotte">${["NG", "MAX"].map((f) => `<button data-fleet="${f}" aria-pressed="${S.fleet === f}">${f}</button>`).join("")}</div>
      <span class="chip ${S.streak >= 3 ? "hot" : ""}" title="Série de jours"><span class="ic">▲</span>${S.streak}</span>
      <span class="chip xp" title="XP"><span class="ic">◆</span>${S.xp}</span>
    </div>
  </div>
  <div class="rank">
    <div class="stripes" aria-hidden="true">${[0, 1, 2, 3].map((k) => `<i class="${k < r.s ? "on" : ""}"></i>`).join("")}</div>
    <div class="meta"><div class="nm">${esc(r.n)}</div>
      <div class="bar"><i style="width:${r.next ? Math.round(((S.xp - r.xp) / (r.next.xp - r.xp)) * 100) : 100}%"></i></div>
      <small>${r.next ? `${r.next.xp - S.xp} XP avant ${esc(r.next.n)}` : "Grade maximum"}</small></div>
  </div>`;
}

function capRow(c) {
  const st = S.cap[c.id];
  const pips = `<span class="pips">${[0, 1, 2, 3, 4].map((k) => `<i class="${st && k < st.best ? "on" : ""}"></i>`).join("")}</span>`;
  const right = !st ? `<span>3:00</span>` : isDue(c.id) ? `<span class="due">À revoir</span>` : `<span class="ok">${st.best}/5</span>`;
  const fl = c.fleet && c.fleet !== "both" ? `<span class="fl">${esc(c.fleet)}</span>` : "";
  return `<button class="cap" data-go="${esc(c.id)}">
    <span class="badge ${st && st.best >= 5 ? "ring" : ""}" style="background:${capColor(c)}">${esc(c.code)}</span>
    <span class="tx"><h3>${esc(c.titleFr || c.title)}${fl}</h3><small>${esc(c.title)} · ${esc(c.ref || "")}</small></span>
    <span class="st">${right}${pips}</span></button>`;
}

function mcCard(m, i) {
  const st = S.mc[m.id];
  const big = m.chapters.flatMap((c) => c.nums || [])[0];
  const col = ["var(--mag)", "var(--cyan)", "var(--green)", "var(--amber)"][i % 4];
  return `<button class="mc" data-mc="${esc(m.id)}">
    <span class="tag" style="color:${col}">Masterclass · ${esc(m.code)}</span>
    ${big ? `<span class="big" style="color:${col}">${esc(big.v)}</span>` : ""}
    <h3>${esc(m.title)}</h3><p>${esc(m.intro || "")}</p>
    <span class="foot"><span>${m.chapters.length} chapitres · ${m.minutes || 8} min</span><span class="${st ? "ok" : ""}">${st ? `${st.best}/${m.qcm.length} ✓` : "Nouveau"}</span></span></button>`;
}

function dailyPick() {
  const vis = capsVisible();
  const due = vis.find((c) => isDue(c.id));
  if (due) return { c: due, why: "À revoir aujourd'hui" };
  const fresh = vis.find((c) => !S.cap[c.id]);
  if (fresh) return { c: fresh, why: "Nouvelle capsule" };
  const d = new Date(); const idx = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % Math.max(vis.length, 1);
  return { c: vis[idx], why: "Capsule du jour" };
}

function vHome() {
  const pick = dailyPick();
  const rc = reviewCount();
  const today = S.day.k === dayKey() ? S.day.n : 0;
  const acc = S.q ? Math.round((S.ok / S.q) * 100) : 0;
  const mcs = mcsVisible();
  const next = pick.c ? `<div class="hero">
      <svg class="adi" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="adc"><circle cx="50" cy="50" r="44"/></clipPath></defs><g clip-path="url(#adc)"><rect x="-20" y="-20" width="140" height="74" fill="#1d6fa8" transform="rotate(-8 50 50)"/><rect x="-20" y="54" width="140" height="80" fill="#7a4a1c" transform="rotate(-8 50 50)"/><path d="M-20 54h140" stroke="#fff" stroke-width="1.5" transform="rotate(-8 50 50)"/></g><circle cx="50" cy="50" r="44" fill="none" stroke="#3fe0ff" stroke-width="1.5"/><path d="M26 52h16l4 4M74 52H58l-4 4" stroke="#ffb428" stroke-width="3" fill="none"/><path d="M38 44h24M30 62h40" stroke="#ff5ad9" stroke-width="2"/></svg>
      <div class="tag">${esc(pick.why)} · ${esc(CAT[pick.c.cat] || "")}</div>
      <h2>${esc(pick.c.titleFr || pick.c.title)}</h2>
      <p>Situation, ${pick.c.steps?.length ? "items à réciter, " : ""}chiffres clés, 5 questions.</p>
      <div class="row"><button class="go" data-go="${esc(pick.c.id)}">DÉMARRER · 3 MIN</button>
      ${rc ? `<button class="go alt" data-review>RÉVISION · ${rc}</button>` : ""}</div>
    </div>` : `<div class="empty">Aucune capsule pour cette flotte.</div>`;
  const mem = capsVisible().filter((c) => c.cat === "memory").slice(0, 6);
  return `<div class="scr">${header()}<div class="scroll">
    ${next}
    <div class="goal">
      <div class="g"><b>${today}<span style="font-size:.8rem;color:var(--dim)">/3</span></b><small>Aujourd'hui</small></div>
      <div class="c"><b>${acc}%</b><small>Précision</small></div>
      <div class="a"><b>${S.best}</b><small>Meilleure série</small></div>
    </div>
    <div class="homewrap">
      <div><div class="sec"><span>Memory items</span><span>${mem.length}</span></div><div class="grid" style="grid-template-columns:1fr">${mem.map(capRow).join("")}</div></div>
      <div><div class="sec"><span>Masterclass</span><span>${mcs.length}</span></div><div class="grid" style="grid-template-columns:1fr">${mcs.slice(0, 3).map(mcCard).join("")}</div></div>
    </div>
    ${disclaimer()}</div></div>`;
}

function vLib() {
  const vis = capsVisible();
  const cats = ["memory", "maneuver", "sop"].filter((k) => vis.some((c) => c.cat === k));
  const rc = reviewCount();
  return `<div class="scr">${header()}<div class="scroll">
    ${rc ? `<div class="hero" style="padding:14px 16px"><div class="tag" style="color:var(--amber)">Révision espacée</div><h2 style="font-size:1.05rem;max-width:100%">${rc} élément${rc > 1 ? "s" : ""} à revoir aujourd'hui</h2><div class="row" style="margin-top:10px"><button class="go" data-review>LANCER LA RÉVISION</button></div></div>` : ""}
    ${cats.map((k) => { const l = vis.filter((c) => c.cat === k); const done = l.filter((c) => S.cap[c.id]).length;
      return `<div class="sec"><span>${CAT[k]}</span><span>${done}/${l.length}</span></div><div class="grid">${l.map(capRow).join("")}</div>`; }).join("")}
    ${disclaimer()}</div></div>`;
}

function vMc() {
  const l = mcsVisible();
  return `<div class="scr">${header()}<div class="scroll">
    <div class="sec"><span>Masterclass · cours approfondis</span><span>${l.length}</span></div>
    <div class="grid mcgrid">${l.map(mcCard).join("") || `<div class="empty">Masterclass à venir.</div>`}</div>
    ${disclaimer()}</div></div>`;
}

function vMe() {
  const acc = S.q ? Math.round((S.ok / S.q) * 100) : 0;
  return `<div class="scr">${header()}<div class="scroll">
    <div class="stats">
      <div class="stat"><b>${S.xp}</b><small>XP total</small></div>
      <div class="stat"><b>${S.best}</b><small>Meilleure série</small></div>
      <div class="stat"><b>${acc}%</b><small>Précision · ${S.q} q.</small></div>
      <div class="stat"><b>${Object.keys(S.cap).length}/${CAPS.length}</b><small>Capsules jouées</small></div>
    </div>
    <div class="sec"><span>Badges</span><span>${S.badges.length}/${BADGES.length}</span></div>
    <div class="badges">${BADGES.map((b) => `<div class="bdg ${S.badges.includes(b.id) ? "on" : ""}"><span class="h">${esc(b.g)}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join("")}</div>
    <div class="sec"><span>Grades</span><span></span></div>
    <div class="grid" style="grid-template-columns:1fr">${RANKS.map((r) => `<div class="cap" style="grid-template-columns:1fr auto;cursor:default"><span class="tx"><h3 style="color:${S.xp >= r.xp ? "var(--amber)" : "var(--dim)"}">${esc(r.n)}</h3></span><span class="st">${r.xp} XP</span></div>`).join("")}</div>
    <div class="sec"><span>Réglages</span><span></span></div>
    <button class="cap" id="snd" style="grid-template-columns:1fr auto"><span class="tx"><h3>Sons</h3><small>Signal bonne / mauvaise réponse</small></span><span class="st"><span class="${S.sound ? "ok" : ""}">${S.sound ? "ON" : "OFF"}</span></span></button>
    <button class="lnk" id="reset">Réinitialiser ma progression</button>
    ${disclaimer()}</div></div>`;
}

function disclaimer() {
  return `<div class="disc">Outil de révision. Ne remplace pas le QRH, le FCOM, le FCTM ni les SOP en vigueur.<br>Sources : QRH NG rev 55 · QRH MAX · FCTM NG rev 25 · FCTM MAX · SOP B737 Ed 03 Rev 03<br>Prepared by CPT Bouchenafa M.A · Fleet Training Manager B737 NG/MAX</div>`;
}

function tabbar() {
  const rc = reviewCount();
  const t = [["home", "Accueil"], ["lib", "Capsules"], ["mc", "Masterclass"], ["me", "Profil"]];
  return `<nav class="tabs">${t.map(([k, n]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${n}${k === "lib" && rc ? `<span class="dot">${rc}</span>` : ""}</button>`).join("")}</nav>`;
}

let resetArmed = false;
function home(t) {
  clearInterval(tick); P = null;
  if (t) tab = t;
  const v = { home: vHome, lib: vLib, mc: vMc, me: vMe }[tab]();
  app.innerHTML = v + tabbar();
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => home(b.dataset.tab)));
  app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => startCap(b.dataset.go)));
  app.querySelectorAll("[data-mc]").forEach((b) => (b.onclick = () => startMc(b.dataset.mc)));
  app.querySelectorAll("[data-review]").forEach((b) => (b.onclick = startReview));
  app.querySelectorAll("[data-fleet]").forEach((b) => (b.onclick = () => { S.fleet = b.dataset.fleet; save(); home(); toast(`Flotte : 737 ${S.fleet}`); }));
  const snd = $("#snd"); if (snd) snd.onclick = () => { S.sound = !S.sound; save(); home(); };
  const rs = $("#reset");
  if (rs) rs.onclick = () => {
    if (!resetArmed) { resetArmed = true; rs.textContent = "Touchez encore pour confirmer"; setTimeout(() => { resetArmed = false; }, 3000); return; }
    S = { ...structuredClone(DEF), fleet: S.fleet, sound: S.sound }; save(); resetArmed = false; home(); toast("Progression réinitialisée");
  };
}

/* ---------- players ---------- */
function slidesForCap(c) {
  const steps = (c.steps || []).filter((s) => !s.fleet || s.fleet === "both" || s.fleet === S.fleet);
  const sl = [{ t: "flash" }];
  if (steps.length) sl.push({ t: "mem", steps });
  if (c.nums?.length) sl.push({ t: "nums" });
  if (c.then?.length || c.trap || c.diff) sl.push({ t: "then" });
  return sl;
}
const prepQ = (q) => { const order = shuffle(q.o.map((_, k) => k)); return { ...q, o: order.map((k) => q.o[k]), a: order.indexOf(q.a) }; };

function startCap(id) {
  const c = CAPS.find((x) => x.id === id); if (!c) return;
  const slides = slidesForCap(c);
  const qs = c.qcm.map((q, qi) => ({ ...prepQ(q), id: c.id, qi }));
  P = { mode: "cap", c, slides, qs, i: 0, score: 0, ans: null, res: [], rev: 0, t: CAP_TIME, combo: 0, xp: 0, dir: 1 };
  runTimer(); render();
}
function startMc(id) {
  const m = MCS.find((x) => x.id === id); if (!m) return;
  const slides = [{ t: "mcintro" }, ...m.chapters.map((ch) => ({ t: "chap", ch }))];
  const qs = m.qcm.map((q, qi) => ({ ...prepQ(q), id: m.id, qi }));
  P = { mode: "mc", c: { ...m, color: "#ff5ad9" }, slides, qs, i: 0, score: 0, ans: null, res: [], rev: 0, t: null, combo: 0, xp: 0, dir: 1 };
  render();
}
function startReview() {
  const items = shuffle(missDue()).slice(0, 5).map((m) => { const f = findQ(m.id, m.qi); return { ...prepQ(f.q), id: m.id, qi: m.qi, from: f.c.titleFr || f.c.title }; });
  // pad with questions from capsules due for review
  const dueCaps = capsVisible().filter((c) => isDue(c.id));
  for (const c of shuffle(dueCaps)) { if (items.length >= 5) break; const qi = Math.floor(Math.random() * c.qcm.length); if (!items.some((x) => x.id === c.id && x.qi === qi)) items.push({ ...prepQ(c.qcm[qi]), id: c.id, qi, from: c.titleFr || c.title }); }
  if (!items.length) { toast("Rien à revoir. Bravo."); return; }
  P = { mode: "rev", c: { code: "REV", title: "Révision", titleFr: "Révision espacée", color: "#ffb428" }, slides: [], qs: items, i: 0, score: 0, ans: null, res: [], rev: 0, t: null, combo: 0, xp: 0, dir: 1, dueCaps: dueCaps.map((c) => c.id) };
  render();
}
function runTimer() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!P || P.t === null) return;
    P.t--;
    const el = $("#tm"); if (el) { el.textContent = P.t >= 0 ? fmt(P.t) : "0:00"; el.classList.toggle("low", P.t <= 30); }
  }, 1000);
}

function slideBody(s, c) {
  const col = c.color || capColor(c);
  const K = (t) => `<div class="kicker" style="color:${col}">${esc(t)}</div>`;
  if (s.t === "flash") return `${K("Situation")}<h1 class="h1">${esc(c.flash.title)}</h1><p class="lead">${esc(c.flash.text)}</p>
      <div class="cues">${(c.flash.cues || []).map((x) => `<span>${esc(x)}</span>`).join("")}</div>`;
  if (s.t === "mem") {
    const lbl = c.cat === "memory" ? "Memory items" : c.cat === "maneuver" ? "Manœuvre" : "Actions clés";
    const all = P.rev >= s.steps.length;
    return `${K(lbl)}<h1 class="h1">${c.cat === "sop" ? "Les standards." : "Récitez, puis vérifiez."}</h1>
      <div class="mem">${s.steps.map((m, k) => `<button class="mi ${k < P.rev ? "rev" : k === P.rev ? "next" : "locked"} ${/^(if|when)\b/i.test(m.item) ? "cond" : ""}" data-mi="${k}" ${k > P.rev ? 'tabindex="-1"' : ""}>
        <span class="n">${k + 1}</span><span class="k">${esc(m.item)}<span class="dots"><span class="v">${k < P.rev ? esc(m.action) : "?"}</span></span></span></button>`).join("")}</div>
      <div class="hint">${all ? "Complet ✓ — glissez pour continuer" : "Touchez l'item surligné pour révéler la réponse"}${!all && S.cap[c.id] ? ' · <button data-revall style="color:var(--cyan);text-decoration:underline">tout révéler</button>' : ""}</div>`;
  }
  if (s.t === "nums") return `${K("Les chiffres")}<h1 class="h1">À graver.</h1>
      <div class="nums">${c.nums.map((n, k) => `<div class="num pop c${k % 4} ${String(n.v).length > 6 ? "long" : ""}"><div class="v">${esc(n.v)}</div><div class="l">${esc(n.l)}</div>${n.s ? `<div class="s">${esc(n.s)}</div>` : ""}</div>`).join("")}</div>`;
  if (s.t === "then") return `${K("Ensuite")}<h1 class="h1">Et après ?</h1>
      ${c.then?.length ? `<ul class="then">${c.then.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${c.trap ? `<div class="box"><b>PIÈGE</b>${esc(c.trap)}</div>` : ""}
      ${c.diff ? `<div class="box diff"><b>NG / MAX</b>${esc(c.diff)}</div>` : ""}`;
  if (s.t === "mcintro") return `${K("Masterclass · " + (c.minutes || 8) + " min")}<h1 class="h1">${esc(c.title)}</h1><p class="lead">${esc(c.intro || "")}</p>
      <div class="cues">${c.chapters.map((ch, k) => `<span style="color:var(--cyan)">${k + 1} · ${esc(ch.kicker || ch.title)}</span>`).join("")}</div>
      <p class="src">${esc(c.ref || "")}</p>`;
  if (s.t === "chap") {
    const ch = s.ch;
    return `${K(ch.kicker || "Chapitre")}<h1 class="h1">${esc(ch.title)}</h1>
      ${(ch.body || []).map((p) => `<p class="lead">${esc(p)}</p>`).join("")}
      ${ch.nums?.length ? `<div class="nums" style="margin-top:16px">${ch.nums.map((n, k) => `<div class="num pop c${k % 4} ${String(n.v).length > 6 ? "long" : ""}"><div class="v">${esc(n.v)}</div><div class="l">${esc(n.l)}</div>${n.s ? `<div class="s">${esc(n.s)}</div>` : ""}</div>`).join("")}</div>` : ""}
      ${ch.bullets?.length ? `<ul class="then" style="margin-top:14px">${ch.bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${ch.quote ? `<div class="box q"><b>${esc(ch.quote.src || "FCTM")}</b>“${esc(ch.quote.text)}”</div>` : ""}`;
  }
  return "";
}

function qBody(q, qi, n, col) {
  const answered = P.ans !== null;
  return `<div class="kicker" style="color:${col}">Question ${qi + 1} / ${n}${q.from ? " · " + esc(q.from) : ""}</div><p class="q">${esc(q.q)}</p>
    <div class="opts">${q.o.map((o, k) => `<button class="opt ${answered ? (k === q.a ? "ok" : k === P.ans ? "ko" : "fade") : ""}" data-o="${k}" ${answered ? "disabled" : ""}><span class="l">${"ABCD"[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
    ${answered ? `<div class="why"><b style="color:${P.ans === q.a ? "var(--green)" : "var(--red)"}">${P.ans === q.a ? "✓ EXACT" : "✗ À REVOIR"}</b> · ${esc(q.w)}</div>` : ""}`;
}

function render() {
  const { c, slides, qs, i } = P;
  const total = slides.length + qs.length;
  const col = c.color || capColor(c);
  const bars = Array.from({ length: total }, (_, k) => {
    if (k >= slides.length) { const r = P.res[k - slides.length]; if (r !== undefined) return `<i class="${r ? "ok" : "ko"}"></i>`; }
    return `<i class="${k < i ? "on" : k === i ? "cur" : ""}"></i>`;
  }).join("");
  let body, canNext = true, label = "SUIVANT";
  if (i < slides.length) {
    const s = slides[i];
    body = slideBody(s, c);
    if (s.t === "mem") canNext = P.rev >= s.steps.length;
    if (i === slides.length - 1) label = "QCM →";
  } else {
    const qi = i - slides.length;
    body = qBody(qs[qi], qi, qs.length, col);
    canNext = P.ans !== null;
    label = qi === qs.length - 1 ? "RÉSULTAT" : "SUIVANT";
  }
  const showPrev = i > 0 && i < slides.length;
  app.innerHTML = `<div class="scr player">
    <div class="bars">${bars}</div>
    <div class="phead"><button class="x" id="x" aria-label="Quitter">×</button><span class="ptitle">${esc(c.code)} · ${esc(c.titleFr || c.title)}</span>${P.t !== null ? `<span class="timer ${P.t <= 30 ? "low" : ""}" id="tm">${P.t >= 0 ? fmt(P.t) : "0:00"}</span>` : `<span class="timer" style="color:var(--cyan)">${i + 1}/${total}</span>`}</div>
    <div class="combo">${P.combo >= 2 ? `COMBO ×${P.combo}` : ""}</div>
    <div class="stage" id="stage"><div class="card ${P.lastI !== i ? "anim" : ""} ${P.dir < 0 ? "back" : ""}">${body}</div></div>
    <div class="nav">${showPrev ? '<button class="btn ghost" id="pv" aria-label="Précédent">←</button>' : ""}<button class="btn" id="nx" ${canNext ? "" : "disabled"}>${label}</button></div>
  </div>`;
  P.lastI = i;
  $("#x").onclick = () => home();
  const pv = $("#pv"); if (pv) pv.onclick = prev;
  $("#nx").onclick = next;
  app.querySelectorAll("[data-mi]").forEach((b) => (b.onclick = () => { if (+b.dataset.mi === P.rev) { P.rev++; beep(true); render(); } }));
  const ra = $("[data-revall]"); if (ra) ra.onclick = (e) => { e.stopPropagation(); P.rev = 99; render(); };
  app.querySelectorAll("[data-o]").forEach((b) => (b.onclick = () => answer(+b.dataset.o)));
}

function answer(k) {
  if (!P || P.ans !== null || P.i < P.slides.length) return;
  const q = P.qs[P.i - P.slides.length];
  P.ans = k;
  const ok = k === q.a;
  P.res.push(ok);
  if (ok) {
    P.score++; P.combo++;
    const g = (P.mode === "mc" ? 15 : 20) + (P.combo >= 3 ? 10 : 0);
    P.xp += g; floatGain(`+${g}`); confetti(14);
    if (P.mode === "rev" && S.miss[`${q.id}#${q.qi}`]) { delete S.miss[`${q.id}#${q.qi}`]; S.cleared++; }
  } else { P.combo = 0; }
  noteMiss(q.id, q.qi, ok);
  if (!ok && P.mode === "rev") S.miss[`${q.id}#${q.qi}`].due = addDays(1);
  beep(ok); save(); render();
  const st = $("#stage"); if (st) st.scrollTop = st.scrollHeight;
}
function next() {
  if (!P) return;
  const total = P.slides.length + P.qs.length;
  const s = P.slides[P.i];
  if (s && s.t === "mem" && P.rev < s.steps.length) return;
  if (P.i >= P.slides.length && P.ans === null) return;
  if (P.i >= total - 1) return result();
  P.i++; P.ans = null; P.rev = 0; P.dir = 1; render();
}
function prev() { if (!P || P.i === 0 || P.i >= P.slides.length) return; P.i--; P.rev = 99; P.dir = -1; render(); }

function result() {
  clearInterval(tick);
  const { c, score, qs, mode } = P;
  const n = qs.length, pct = n ? score / n : 0;
  const used = P.t !== null ? CAP_TIME - P.t : null;
  let bonus = 0, notes = [];
  if (mode === "cap") {
    if (P.t >= 0) { bonus += 20; notes.push("Chrono +20"); }
    if (score === n) { bonus += 30; notes.push("Sans faute +30"); }
    const prevS = S.cap[c.id] || { best: 0, plays: 0, box: 0 };
    const box = score >= 4 ? Math.min((prevS.box || 0) + 1, LEITNER.length - 1) : 1;
    S.cap[c.id] = { best: Math.max(prevS.best || 0, score), plays: (prevS.plays || 0) + 1, box, due: addDays(LEITNER[box]), fast: prevS.fast || (score >= 4 && used <= 90) };
  } else if (mode === "mc") {
    bonus += 50; notes.push("Masterclass +50");
    const prevM = S.mc[c.id] || { best: 0 };
    S.mc[c.id] = { best: Math.max(prevM.best, score), done: true };
  } else if (mode === "rev") {
    bonus += 20; notes.push("Révision +20");
    (P.dueCaps || []).forEach((id) => { if (S.cap[id]) S.cap[id].due = addDays(LEITNER[S.cap[id].box || 1]); });
  }
  const xp = P.xp + bonus;
  award(xp);
  const fresh = checkBadges();
  save();
  const C = 2 * Math.PI * 74, colr = pct >= 0.8 ? "var(--green)" : pct >= 0.6 ? "var(--amber)" : "var(--red)";
  const msg = pct === 1 ? "Réflexes verrouillés." : pct >= 0.8 ? "Solide. On revoit ça dans quelques jours." : pct >= 0.6 ? "Presque. Refaites-la demain." : "À retravailler avec le QRH.";
  const wrong = qs.filter((_, k) => P.res[k] === false);
  const ref = mode === "rev" ? "" : `<p class="src">Référence : ${esc(c.ref || "")}</p>`;
  app.innerHTML = `<div class="scr player"><div class="stage"><div class="card anim res">
    <div class="kicker" style="color:${c.color || capColor(c)};justify-content:center">${esc(c.titleFr || c.title)}</div>
    <div class="ring"><svg viewBox="0 0 176 176" width="176" height="176" aria-hidden="true"><circle cx="88" cy="88" r="74" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="88" cy="88" r="74" fill="none" stroke="${colr}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
      <div class="s"><span>${score}/${n}<small>${used !== null ? (P.t >= 0 ? "en " + fmt(used) : "temps dépassé") : mode === "mc" ? "masterclass" : "révision"}</small></span></div></div>
    <h1 class="h1" style="font-size:1.4rem">${msg}</h1>
    <div class="rewards"><div class="rw c"><b>+${xp}</b>XP</div><div class="rw"><b>▲ ${S.streak}</b>jour${S.streak > 1 ? "s" : ""}</div>${mode === "cap" ? `<div class="rw g"><b>J+${LEITNER[S.cap[c.id].box]}</b>prochaine</div>` : ""}</div>
    ${notes.length ? `<p class="src" style="margin-top:0">${notes.join(" · ")}</p>` : ""}
    ${fresh.map((b) => `<span class="newbadge">⬢ Nouveau badge : ${esc(b.n)}</span>`).join("")}
    ${wrong.length ? `<div class="review"><div class="sec" style="margin:8px 0 0"><span>À retenir</span><span>${wrong.length}</span></div>${wrong.map((q) => `<div>${esc(q.q)}<b>${esc(q.o[q.a])}</b></div>`).join("")}</div>` : ""}
    ${ref}
  </div></div>
  <div class="nav"><button class="btn ghost" id="re" aria-label="Rejouer">↻</button><button class="btn" id="hm">CONTINUER</button></div></div>`;
  $("#re").onclick = () => (mode === "cap" ? startCap(c.id) : mode === "mc" ? startMc(c.id) : startReview());
  $("#hm").onclick = () => home();
  if (pct >= 0.8) confetti(90);
  P = null;
}

/* ---------- input ---------- */
let tx = null, ty = null;
document.addEventListener("touchstart", (e) => { if (!P) return; tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!P || tx === null) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  dx < 0 ? next() : prev();
}, { passive: true });
document.addEventListener("keydown", (e) => {
  if (!P) return;
  if (e.key === "ArrowRight" || e.key === "Enter") { if (e.target.closest && e.target.closest("button") && e.key === "Enter") return; next(); }
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "Escape") home();
  else if (/^[1-4]$/.test(e.key)) answer(+e.key - 1);
  else if (e.key === " " && P.slides[P.i]?.t === "mem") { e.preventDefault(); P.rev++; render(); }
});

/* ---------- fx ---------- */
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
function floatGain(t) { const d = document.createElement("div"); d.className = "gain"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 950); }
const cv = $("#burst"), cx = cv.getContext("2d"); let parts = [], raf = null;
function confetti(n) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#3fe0ff", "#ff5ad9", "#ffb428", "#45f0a0"];
  for (let k = 0; k < n; k++) parts.push({ x: innerWidth / 2, y: innerHeight * 0.5, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4, s: Math.random() * 5 + 3, c: cols[k % 4], l: 64 });
  if (!raf) loop();
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.l--; cx.fillStyle = p.c; cx.globalAlpha = Math.max(p.l / 64, 0); cx.fillRect(p.x, p.y, p.s, p.s * 0.6); });
  parts = parts.filter((p) => p.l > 0);
  raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, cv.width, cv.height), null);
}

/* offline support when served as a PWA */
if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude|anthropic/.test(location.hostname)) {
  try { navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) {}
}

home();
})();
