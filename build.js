#!/usr/bin/env node
/*
 * konyhaiatvalto.hu – statikus oldalgenerátor (függőségmentes, Node 16+).
 *
 *   node build.js
 *
 * Bemenet:  src/ (core.js, app.js, style.css, ingredients.json)
 * Kimenet:  docs/  (kész, feltölthető statikus oldal)
 *
 * Környezeti változók:
 *   SITE_URL   az oldal gyökér-URL-je, alapértelmezés: https://konyhaiatvalto.hu
 *   BASE_PATH  almappa, ha nem domain gyökerén fut (pl. /konyhaiatvalto GitHub project pages-en)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const KA = require('./src/core.js');

const { UNITS, fmt, niceMass, niceVol, convert } = KA;
const SITE_URL = (process.env.SITE_URL || 'https://konyhaiatvalto.hu').replace(/\/+$/, '');
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'docs');
const BRAND = 'Konyhai átváltó';
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);

const data = JSON.parse(fs.readFileSync(path.join(SRC, 'ingredients.json'), 'utf8'));
const CATS = Object.fromEntries(data.categories.map((c) => [c.id, c]));
const INGS = data.ingredients;

/* ------------------------------------------------------------------ segédek */

const url = (p) => BASE + p;
const abs = (p) => SITE_URL + BASE + p;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const art = (w) => (/^[aáeéiíoóöőuúüű]/i.test(w) ? 'az' : 'a');
const T = (u) => UNITS[u].text;
const ASK = (u) => UNITS[u].ask;
const SPOONISH = ['bogre', 'pohar', 'evokanal', 'teaskanal'];

function ldScript(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function trimDesc(parts, max = 160) {
  let out = '';
  for (const p of parts) {
    const next = out ? out + ' ' + p : p;
    if (next.length > max && out) break;
    out = next;
  }
  return out;
}

/** "egy bögre", "fél bögre", "10 dkg", "1 dl" */
function qty(q, u) {
  if (SPOONISH.includes(u) && q === 1) return 'egy ' + T(u);
  if (SPOONISH.includes(u) && q === 0.5) return 'fél ' + T(u);
  return fmt(q) + ' ' + T(u);
}

/** Táblázatcímke: "1/2 bögre" */
function qLabel(q, u) {
  const n = q === 0.5 ? '1/2' : q === 0.25 ? '1/4' : fmt(q);
  return n + ' ' + T(u);
}

/** Zárójeles kiegészítés: bögre/pohár -> dl, kanalak -> ml */
function ext(u, ml) {
  if (u === 'bogre' || u === 'pohar') return ' (' + fmt(ml / 100) + ' dl)';
  if (u === 'evokanal' || u === 'teaskanal') return ' (' + fmt(ml) + ' ml)';
  return '';
}

const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const CSS_V = hash(fs.readFileSync(path.join(SRC, 'style.css')));
const JS_V = hash(fs.readFileSync(path.join(SRC, 'app.js')) + fs.readFileSync(path.join(SRC, 'core.js')));

/* ------------------------------------------------------------ fájlkezelés */

const sitemap = [];
const seen = { title: new Map(), desc: new Map() };

function writeFile(rel, content) {
  const full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function writePage(p, html, meta) {
  const rel = p === '/' ? 'index.html' : p.replace(/^\//, '') + 'index.html';
  writeFile(rel, html);
  sitemap.push(p);
  for (const k of ['title', 'desc']) {
    const v = meta[k];
    if (seen[k].has(v)) console.warn(`FIGYELEM: duplikált ${k}: ${v} (${p} / ${seen[k].get(v)})`);
    seen[k].set(v, p);
  }
}

/* ------------------------------------------------------------------ layout */

function layout({ title, desc, p, body, ld = [], noindex = false, scripts = '' }) {
  const canonical = abs(p);
  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">`}
<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#c8402a">
<link rel="icon" href="${url('/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${url('/assets/style.css')}?v=${CSS_V}">
${ld.map(ldScript).join('\n')}
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${url('/')}"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#c8402a"/><path d="M9 9h14l-2 15a2 2 0 0 1-2 1.8h-6a2 2 0 0 1-2-1.8z" fill="#fff"/><path d="M10.2 16h11.6" stroke="#c8402a" stroke-width="1.6"/></svg>Konyhai <span>átváltó</span></a>
    <nav aria-label="Fő menü">
      <a href="${url('/')}">Átváltó</a>
      <a href="${url('/#hozzavalok')}">Hozzávalók</a>
      <a href="${url('/mertekegysegek/')}">Mértékegységek</a>
    </nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p><strong>${BRAND}</strong> – bögre, pohár, evőkanál, teáskanál átváltása grammra, dekára, deciliterre.</p>
    <p>Az értékek tájékoztató jellegűek: a bögre és a pohár nem szabványos mérték (itt 2,5 dl, illetve 2 dl), a hozzávalók tömege pedig a tömörségtől és a márkától függően eltérhet. Pontos eredményhez mérlegelj.</p>
    <p><a href="${url('/')}">Főoldal</a> · <a href="${url('/mertekegysegek/')}">Mértékegységek</a> · <a href="${url('/#hozzavalok')}">Hozzávalók</a> · © ${NOW.getFullYear()} konyhaiatvalto.hu</p>
  </div>
</footer>
${scripts}
</body>
</html>
`;
}

function crumbs(items) {
  const html = `<nav class="crumbs" aria-label="Morzsamenü"><ol>${items
    .map((it, i) => (i < items.length - 1 ? `<li><a href="${url(it.p)}">${esc(it.name)}</a></li>` : `<li aria-current="page">${esc(it.name)}</li>`))
    .join('')}</ol></nav>`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.p) })),
  };
  return { html, ld };
}

function faqLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

function faqHtml(faqs, heading = 'Gyakori kérdések') {
  return `<section aria-labelledby="faq"><h2 id="faq">${esc(heading)}</h2>
${faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
</section>`;
}

function tbl(headers, rows) {
  return `<div class="tw"><table><thead><tr>${headers
    .map((h, i) => `<th scope="col"${i ? ' class="num"' : ''}>${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr${r.hl ? ' class="hl"' : ''}><th scope="row">${esc(r.cells[0])}</th>${r.cells
      .slice(1)
      .map((c) => `<td class="num">${esc(c)}</td>`)
      .join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

/* ------------------------------------------------------ számítások (szöveg) */

/** térfogat -> tömeg */
function v2m(ing, q, u, t) {
  const d = ing.density;
  const ml = q * UNITS[u].f;
  const gRaw = ml * d;
  const g = niceMass(gRaw);
  const val = convert(g, 'g', t);
  const alt = t === 'g' ? fmt(g / 10) + ' dkg' : fmt(g) + ' g';
  const subj = cap(qty(q, u)) + ext(u, ml) + ' ' + ing.name;
  let tail = '';
  if (t === 'g') tail = ', vagyis ' + fmt(g / 10) + ' dkg';
  else if (t === 'dkg') tail = ', azaz ' + fmt(g) + ' g';
  else tail = ' (' + fmt(g) + ' g)';
  const sentence = `${subj} kb. ${fmt(val)} ${T(t)}${tail}.`;
  const short = `Kb. ${fmt(val)} ${T(t)} (${alt})`;
  let calc = `${fmt(ml)} ml × ${fmt(d)} g/ml = ${fmt(gRaw)} g, kerekítve kb. ${fmt(g)} g`;
  if (t !== 'g') calc += ` = ${fmt(val)} ${T(t)}`;
  return { ml, gRaw, g, val, sentence, short, calc, main: `≈ ${fmt(val)} ${T(t)}` };
}

/** tömeg -> térfogat */
function m2v(ing, q, u, t) {
  const d = ing.density;
  const gIn = convert(q, u, 'g');
  const ml = gIn / d;
  const volRaw = ml / UNITS[t].f;
  const vol = niceVol(volRaw, t);
  let tail = '';
  if (t === 'dl') tail = ', azaz kb. ' + fmt(niceVol(ml / 250, 'bogre')) + ' bögre';
  else if (t === 'bogre') tail = ', vagyis kb. ' + fmt(niceVol(ml / 100, 'dl')) + ' dl';
  else if (t === 'evokanal') tail = ', azaz kb. ' + fmt(niceVol(ml / 100, 'dl')) + ' dl';
  else if (t === 'teaskanal') tail = ', azaz kb. ' + fmt(niceVol(ml / 15, 'evokanal')) + ' evőkanál';
  const inp = u === 'g' ? `${fmt(q)} g` : `${fmt(q)} ${T(u)} (${fmt(gIn)} g)`;
  const sentence = `${cap(inp)} ${ing.name} kb. ${fmt(vol)} ${T(t)}${tail}.`;
  const alt = t === 'bogre' ? fmt(niceVol(ml / 100, 'dl')) + ' dl' : t === 'dl' ? fmt(niceVol(ml / 250, 'bogre')) + ' bögre' : t === 'evokanal' ? fmt(niceVol(ml / 100, 'dl')) + ' dl' : fmt(niceVol(ml / 15, 'evokanal')) + ' evőkanál';
  const short = `Kb. ${fmt(vol)} ${T(t)} (${alt})`;
  let calc = `${fmt(gIn)} g ÷ ${fmt(d)} g/ml = ${fmt(ml)} ml`;
  if (t !== 'ml') calc += ` = ${fmt(volRaw)} ${T(t)}, kerekítve kb. ${fmt(vol)} ${T(t)}`;
  return { gIn, ml, vol, sentence, short, calc, main: `≈ ${fmt(vol)} ${T(t)}` };
}

/** Egy dl, evőkanál, teáskanál grammban – a meta leírásokhoz */
function quick(ing) {
  const g = (ml) => fmt(niceMass(ing.density * ml));
  return { dl: g(100), tbsp: g(15), tsp: g(5), cup: niceMass(ing.density * 250), cupDkg: fmt(niceMass(ing.density * 250) / 10) };
}

/* -------------------------------------------------------------- kérdéslista */

function defsFor(ing) {
  const list = [];
  const V = (q, u, t) => list.push({ kind: 'v2m', q, u, t });
  const M = (q, u, t) => list.push({ kind: 'm2v', q, u, t });
  if (ing.spice) {
    V(1, 'teaskanal', 'g'); V(0.5, 'teaskanal', 'g'); V(1, 'evokanal', 'g'); V(1, 'dl', 'g');
    M(5, 'g', 'teaskanal'); M(10, 'g', 'teaskanal'); M(10, 'g', 'evokanal');
  } else {
    V(1, 'bogre', 'g'); V(1, 'bogre', 'dkg'); V(0.5, 'bogre', 'g'); V(0.5, 'bogre', 'dkg');
    V(1, 'pohar', 'g'); V(1, 'pohar', 'dkg'); V(1, 'evokanal', 'g'); V(1, 'teaskanal', 'g');
    V(1, 'dl', 'g'); V(1, 'dl', 'dkg'); V(1, 'l', 'g'); V(1, 'l', 'kg');
    M(10, 'dkg', 'dl'); M(100, 'g', 'dl'); M(50, 'dkg', 'bogre'); M(500, 'g', 'bogre'); M(1, 'kg', 'bogre');
    M(100, 'g', 'evokanal'); M(10, 'dkg', 'evokanal');
  }
  return list;
}

const defKey = (d) => `${d.kind}-${d.q}-${d.u}-${d.t}`;

function slugQty(q, u) {
  if (q === 1 && SPOONISH.includes(u)) return 'egy-' + UNITS[u].slug;
  if (q === 0.5) return 'fel-' + UNITS[u].slug;
  if (q === 1 && (u === 'dl' || u === 'l')) return '1-' + UNITS[u].slug;
  return q + '-' + UNITS[u].slug;
}

const questions = []; // {ing, def, key, slug, path, question}
for (const ing of INGS) {
  for (const def of defsFor(ing)) {
    const slug = `hany-${UNITS[def.t].slug}-${slugQty(def.q, def.u)}-${ing.slug}`;
    questions.push({
      ing, def, key: defKey(def), slug,
      path: `/atvaltas/${slug}/`,
      question: `Hány ${ASK(def.t)} ${qty(def.q, def.u)} ${ing.name}?`,
    });
  }
}
const qByIng = new Map();
const qByKey = new Map();
for (const q of questions) {
  if (!qByIng.has(q.ing.slug)) qByIng.set(q.ing.slug, []);
  qByIng.get(q.ing.slug).push(q);
  if (!qByKey.has(q.key)) qByKey.set(q.key, []);
  qByKey.get(q.key).push(q);
}
{
  const slugs = new Set();
  for (const q of questions) {
    if (slugs.has(q.slug)) throw new Error('Duplikált slug: ' + q.slug);
    slugs.add(q.slug);
  }
}

const hubPath = (ing) => `/hozzavalo/${ing.slug}/`;
const calcLink = (ing, q, u, t) => `${url('/')}?e=${ing ? ing.slug : ''}&a=${q}&f=${u}&t=${t}`;

/* ------------------------------------------------------------- táblázatok */

function volTable(ing, hl) {
  const spec = ing.spice
    ? [[0.5, 'teaskanal'], [1, 'teaskanal'], [1, 'evokanal'], [1, 'dl']]
    : [[1, 'teaskanal'], [1, 'evokanal'], [1, 'dl'], [1, 'pohar'], [0.5, 'bogre'], [1, 'bogre'], [1, 'l']];
  const rows = spec.map(([q, u]) => {
    const ml = q * UNITS[u].f;
    const g = niceMass(ml * ing.density);
    return {
      hl: hl && hl.kind === 'v2m' && hl.q === q && hl.u === u,
      cells: [qLabel(q, u) + ext(u, ml), fmt(ml) + ' ml', fmt(g) + ' g', fmt(g / 10) + ' dkg'],
    };
  });
  return tbl(['Mennyiség', 'Térfogat', 'Tömeg (g)', 'Tömeg (dkg)'], rows);
}

function massTable(ing, hl) {
  const spec = ing.spice ? [[5, 'g'], [10, 'g'], [20, 'g'], [50, 'g']] : [[10, 'dkg'], [20, 'dkg'], [25, 'dkg'], [50, 'dkg'], [1, 'kg']];
  const cols = ing.spice ? ['teaskanal', 'evokanal', 'dl'] : ['dl', 'bogre', 'pohar', 'evokanal'];
  const rows = spec.map(([q, u]) => ({
    hl: hl && hl.kind === 'm2v' && hl.q === q && hl.u === u,
    cells: [
      u === 'dkg' ? `${q} dkg (${q * 10} g)` : u === 'kg' ? `${q} kg` : `${q} g`,
      ...cols.map((c) => fmt(niceVol(convert(q, u, c, ing.density), c))),
    ],
  }));
  return tbl(['Tömeg', ...cols.map((c) => T(c))], rows);
}

/* --------------------------------------------------------- GYIK-generátorok */

function densityFaq(ing) {
  const qk = quick(ing);
  return {
    q: `Mennyi ${art(ing.name)} ${ing.name} sűrűsége?`,
    a: `${cap(art(ing.name))} ${ing.name} sűrűsége átlagosan kb. ${fmt(ing.density)} g/ml, vagyis 1 dl ${ing.name} kb. ${qk.dl} g. Az oldal ezzel az értékkel számol.` + (ing.note ? ' ' + ing.note : ''),
  };
}

function accuracyFaq(ing) {
  return { q: 'Mennyire pontos ez az átváltás?', a: `Tájékoztató érték. ${CATS[ing.cat].note}` };
}

function extraUnitFaqs(ing, exceptUnit, n = 2) {
  const pool = ing.spice ? ['teaskanal', 'evokanal', 'dl'] : ['bogre', 'dl', 'evokanal', 'teaskanal'];
  return pool
    .filter((u) => u !== exceptUnit)
    .slice(0, n)
    .map((u) => ({ q: `Hány gramm ${qty(1, u)} ${ing.name}?`, a: v2m(ing, 1, u, 'g').sentence }));
}

const STD_FAQ = [
  { q: 'Hány dl egy bögre?', a: 'A magyar konyhai szokás szerint egy bögre 2,5 dl, azaz 250 ml. Fontos, hogy a bögre nem szabványos mérték, ezért receptenként előfordulhat eltérés.', u: ['bogre', 'dl'] },
  { q: 'Hány dl egy pohár?', a: 'Egy pohár 2 dl, azaz 200 ml. Így egy bögre és egy pohár különbsége fél deci.', u: ['pohar', 'dl'] },
  { q: 'Hány ml egy evőkanál?', a: 'Egy evőkanál 15 ml, vagyis 3 teáskanálnyi folyadék fér bele.', u: ['evokanal', 'ml'] },
  { q: 'Hány ml egy teáskanál?', a: 'Egy teáskanál 5 ml. Három teáskanál egy evőkanálnak felel meg, 20 teáskanál pedig egy deciliternek.', u: ['teaskanal', 'ml'] },
];

/* ---------------------------------------------------------- kérdés-oldalak */

function relatedSameDef(q) {
  const same = qByKey.get(q.key).filter((x) => x !== q);
  const sameCat = same.filter((x) => x.ing.cat === q.ing.cat);
  const rest = same.filter((x) => x.ing.cat !== q.ing.cat);
  // az aktuális hozzávaló után következők, hogy minden oldal más szomszédokat kapjon
  const idx = INGS.indexOf(q.ing);
  const order = (a) => a.sort((x, y) => ((INGS.indexOf(x.ing) - idx + INGS.length) % INGS.length) - ((INGS.indexOf(y.ing) - idx + INGS.length) % INGS.length));
  return [...order(sameCat), ...order(rest)].slice(0, 8);
}

function buildQuestionPage(q) {
  const { ing, def } = q;
  const cat = CATS[ing.cat];
  const a = def.kind === 'v2m' ? v2m(ing, def.q, def.u, def.t) : m2v(ing, def.q, def.u, def.t);
  const qk = quick(ing);
  let title = `${q.question} ${a.short} | ${BRAND}`;
  if (title.length > 68) title = `${q.question} ${a.short.replace(/ \(.*\)$/, '')} | ${BRAND}`;
  const desc = trimDesc([
    a.sentence,
    ing.spice
      ? `1 teáskanál ${ing.name} ≈ ${qk.tsp} g, 1 evőkanál ≈ ${qk.tbsp} g.`
      : `1 dl ${ing.name} ≈ ${qk.dl} g, 1 evőkanál ≈ ${qk.tbsp} g, 1 teáskanál ≈ ${qk.tsp} g.`,
    'Átváltási táblázat és kalkulátor.',
  ]);

  const faqs = [
    { q: q.question, a: a.sentence },
    ...extraUnitFaqs(ing, def.u, 2),
    densityFaq(ing),
    accuracyFaq(ing),
  ];

  const bc = crumbs([
    { name: 'Főoldal', p: '/' },
    { name: cap(ing.name), p: hubPath(ing) },
    { name: q.question, p: q.path },
  ]);

  const sameIng = qByIng.get(ing.slug).filter((x) => x !== q);
  const sameDef = relatedSameDef(q);
  const li = (x, text) => `<li><a href="${url(x.path)}">${esc(text)}</a></li>`;

  const body = `
${bc.html}
<h1>${esc(q.question)}</h1>
<section class="card answer" aria-label="Válasz">
  <p class="big">${esc(a.main)}</p>
  <p>${esc(a.sentence)}</p>
  <p class="calc">Számítás: ${esc(a.calc)}.</p>
  <p><a class="btn" href="${calcLink(ing, def.q, def.u, def.t)}">Saját mennyiség átváltása →</a></p>
</section>

<h2>${esc(cap(ing.name))} átváltási táblázat: térfogat → tömeg</h2>
${volTable(ing, def)}

<h2>${esc(cap(ing.name))} átváltási táblázat: tömeg → térfogat</h2>
${massTable(ing, def)}

<h2>Mit érdemes tudni?</h2>
<p>${esc(cat.note)}</p>
${ing.note ? `<p>${esc(ing.note)}</p>` : ''}
<p>Az oldal ${esc(ing.name)} esetén <strong>${fmt(ing.density)} g/ml</strong> sűrűséggel számol (1 dl ≈ ${qk.dl} g). A használt mérőedények: 1 bögre = 2,5 dl, 1 pohár = 2 dl, 1 evőkanál = 15 ml, 1 teáskanál = 5 ml. A pontos mennyiséghez mérj mérlegen.</p>

${faqHtml(faqs)}

<h2>További ${esc(ing.name)} átváltások</h2>
<ul class="links">
  <li><a href="${url(hubPath(ing))}"><strong>${esc(cap(ing.name))} – összes átváltás egy oldalon</strong></a></li>
  ${sameIng.map((x) => li(x, x.question)).join('\n  ')}
</ul>

<h2>Ugyanez más hozzávalóval</h2>
<ul class="links">
  ${sameDef.map((x) => li(x, x.question)).join('\n  ')}
</ul>
`;

  writePage(
    q.path,
    layout({ title, desc, p: q.path, body, ld: [bc.ld, faqLd(faqs)] }),
    { title, desc }
  );
}

/* ----------------------------------------------------- hozzávaló-főoldalak */

function buildHub(ing) {
  const cat = CATS[ing.cat];
  const qk = quick(ing);
  const p = hubPath(ing);
  const name = cap(ing.name);
  const title = ing.spice
    ? `${name} átváltó: hány gramm 1 teáskanál, evőkanál? | ${BRAND}`
    : `${name} átváltó: hány gramm 1 bögre, dl, evőkanál? | ${BRAND}`;
  const desc = ing.spice
    ? trimDesc([`${name} átváltás: 1 teáskanál ≈ ${qk.tsp} g, 1 evőkanál ≈ ${qk.tbsp} g, 1 dl ≈ ${qk.dl} g.`, 'Táblázat, gyakori kérdések és kalkulátor.'])
    : trimDesc([`${name} átváltás: 1 dl ≈ ${qk.dl} g, 1 bögre (2,5 dl) ≈ ${qk.cupDkg} dkg, 1 evőkanál ≈ ${qk.tbsp} g, 1 teáskanál ≈ ${qk.tsp} g.`, 'Táblázat és kalkulátor.']);

  const faqs = ing.spice
    ? [
        { q: `Hány gramm egy teáskanál ${ing.name}?`, a: v2m(ing, 1, 'teaskanal', 'g').sentence },
        { q: `Hány gramm egy evőkanál ${ing.name}?`, a: v2m(ing, 1, 'evokanal', 'g').sentence },
        { q: `Hány gramm 1 dl ${ing.name}?`, a: v2m(ing, 1, 'dl', 'g').sentence },
        densityFaq(ing),
      ]
    : [
        { q: `Hány gramm egy bögre ${ing.name}?`, a: v2m(ing, 1, 'bogre', 'g').sentence },
        { q: `Hány dkg 1 dl ${ing.name}?`, a: v2m(ing, 1, 'dl', 'dkg').sentence },
        { q: `Hány gramm egy evőkanál ${ing.name}?`, a: v2m(ing, 1, 'evokanal', 'g').sentence },
        { q: `Hány dl 10 dkg ${ing.name}?`, a: m2v(ing, 10, 'dkg', 'dl').sentence },
        densityFaq(ing),
      ];

  const bc = crumbs([{ name: 'Főoldal', p: '/' }, { name, p }]);
  const list = qByIng.get(ing.slug);
  const sameCat = INGS.filter((x) => x.cat === ing.cat && x !== ing);

  const cards = ing.spice
    ? [['1 teáskanál', qk.tsp + ' g'], ['1 evőkanál', qk.tbsp + ' g'], ['1 dl', qk.dl + ' g']]
    : [['1 dl', qk.dl + ' g'], ['1 bögre (2,5 dl)', qk.cupDkg + ' dkg'], ['1 evőkanál', qk.tbsp + ' g'], ['1 teáskanál', qk.tsp + ' g']];

  const body = `
${bc.html}
<h1>${esc(name)} átváltás – ${ing.spice ? 'teáskanál, evőkanál, gramm' : 'bögre, pohár, evőkanál, dl, gramm'}</h1>
<p class="lead">Hány gramm ${esc(ing.name)} van egy ${ing.spice ? 'teáskanálban vagy evőkanálban' : 'bögrében, pohárban, deciliterben vagy evőkanálban'}? Az alábbi táblázat ${fmt(ing.density)} g/ml sűrűséggel számol.</p>
<section class="card answer">
  <div class="catgrid">
    ${cards.map(([k, v]) => `<div><p class="muted small" style="margin:0">${esc(k)}</p><p class="big" style="font-size:1.6rem">${esc(v)}</p></div>`).join('\n    ')}
  </div>
  <p><a class="btn" href="${calcLink(ing, 1, ing.spice ? 'teaskanal' : 'bogre', ing.spice ? 'g' : 'dkg')}">Saját mennyiség átváltása →</a></p>
</section>

<h2>Térfogat → tömeg</h2>
${volTable(ing, null)}

<h2>Tömeg → térfogat</h2>
${massTable(ing, null)}

<h2>Mit érdemes tudni?</h2>
<p>${esc(cat.note)}</p>
${ing.note ? `<p>${esc(ing.note)}</p>` : ''}

${faqHtml(faqs)}

<h2>${esc(name)} – gyakori kérdések külön oldalon</h2>
<ul class="links">
  ${list.map((x) => `<li><a href="${url(x.path)}">${esc(x.question)}</a></li>`).join('\n  ')}
</ul>

${sameCat.length ? `<h2>${esc(cat.name)}</h2>
<ul class="links">
  ${sameCat.map((x) => `<li><a href="${url(hubPath(x))}">${esc(cap(x.name))} átváltás</a></li>`).join('\n  ')}
</ul>` : ''}
`;

  writePage(p, layout({ title, desc, p, body, ld: [bc.ld, faqLd(faqs)] }), { title, desc });
}

/* ----------------------------------------------------- mértékegység-oldalak */

const unitPairs = [];
for (const group of [KA.VOLUME_ORDER, KA.MASS_ORDER]) {
  for (const f of group) {
    for (const t of group) {
      if (f === t) continue;
      const v = convert(1, f, t);
      if (v < 0.01 || v > 1000) continue;
      unitPairs.push({ f, t, v, path: `/atvaltas/hany-${UNITS[t].slug}-egy-${UNITS[f].slug}/`, question: `Hány ${ASK(t)} egy ${ASK(f)}?` });
    }
  }
}

function buildUnitPage(pr) {
  const { f, t, v } = pr;
  const group = UNITS[f].type === 'v' ? KA.VOLUME_ORDER : KA.MASS_ORDER;
  const eq = `1 ${T(f)} = ${fmt(v)} ${T(t)}`;
  const main = `${eq}`;
  const convention = f === 'bogre' || f === 'pohar' || t === 'bogre' || t === 'pohar'
    ? ' A bögre és a pohár nem szabványos mérték; a magyar konyhákban általában 2,5 dl-es bögrével és 2 dl-es pohárral számolnak.'
    : '';
  const sentence = `${cap(eq)}.${convention}`;
  const title = `${pr.question} ${eq} | ${BRAND}`;
  const desc = trimDesc([`${pr.question} ${eq}.`, `Átváltási táblázat ${group === KA.MASS_ORDER ? 'gramm, dkg és kg' : 'ml, dl, liter, bögre, pohár, evőkanál és teáskanál'} között.`, 'Gyors konyhai átváltó.']);
  const mult = [1, 2, 3, 4, 5, 10];
  const cols = group.filter((u) => u !== f);
  const rows = mult.map((m) => ({ hl: m === 1, cells: [`${m} ${T(f)}`, ...cols.map((c) => fmt(convert(m, f, c)) + ' ' + T(c))] }));
  const std = STD_FAQ.filter((s) => !(s.u[0] === f && s.u[1] === t)).slice(0, 3);
  const faqs = [{ q: pr.question, a: sentence }, ...std.map(({ q, a }) => ({ q, a }))];
  const bc = crumbs([{ name: 'Főoldal', p: '/' }, { name: 'Mértékegységek', p: '/mertekegysegek/' }, { name: pr.question, p: pr.path }]);
  const others = unitPairs.filter((x) => x !== pr && (x.f === f || x.t === t)).slice(0, 12);

  const body = `
${bc.html}
<h1>${esc(pr.question)}</h1>
<section class="card answer">
  <p class="big">${esc(main)}</p>
  <p>${esc(sentence)}</p>
  <p><a class="btn" href="${calcLink(null, 1, f, t)}">Saját mennyiség átváltása →</a></p>
</section>

<h2>${esc(cap(T(f)))} átváltása más mértékegységekre</h2>
${tbl([cap(UNITS[f].ask), ...cols.map((c) => T(c))], rows)}

${UNITS[f].type === 'v' ? `<p>Hozzávalók (liszt, cukor, tej…) esetén a térfogat tömegre váltásához a sűrűséget is figyelembe kell venni – ehhez nézd meg a <a href="${url('/#hozzavalok')}">hozzávalók átváltási táblázatát</a>.</p>` : ''}

${faqHtml(faqs)}

<h2>Kapcsolódó átváltások</h2>
<ul class="links">
  ${others.map((x) => `<li><a href="${url(x.path)}">${esc(x.question)}</a></li>`).join('\n  ')}
  <li><a href="${url('/mertekegysegek/')}">Összes konyhai mértékegység</a></li>
</ul>
`;
  writePage(pr.path, layout({ title, desc, p: pr.path, body, ld: [bc.ld, faqLd(faqs)] }), { title, desc });
}

function buildUnitsIndex() {
  const p = '/mertekegysegek/';
  const title = `Konyhai mértékegységek: bögre, pohár, evőkanál, dl átváltása | ${BRAND}`;
  const desc = '1 bögre = 2,5 dl, 1 pohár = 2 dl, 1 evőkanál = 15 ml, 1 teáskanál = 5 ml. Áttekintő táblázat és minden mértékegység-átváltás egy helyen.';
  const bc = crumbs([{ name: 'Főoldal', p: '/' }, { name: 'Mértékegységek', p }]);
  const rows = KA.VOLUME_ORDER.map((u) => ({
    cells: [cap(UNITS[u].label.replace(/^(\S+) – /, '$1 – ')), ...['ml', 'dl', 'l'].map((c) => fmt(convert(1, u, c)) + ' ' + T(c))],
  }));
  const massRows = KA.MASS_ORDER.map((u) => ({ cells: [UNITS[u].label, ...['g', 'dkg', 'kg'].map((c) => fmt(convert(1, u, c)) + ' ' + T(c))] }));
  const faqs = STD_FAQ.map(({ q, a }) => ({ q, a }));
  const groupLinks = (order) =>
    order
      .map((f) => {
        const list = unitPairs.filter((x) => x.f === f);
        if (!list.length) return '';
        return `<h3>1 ${esc(T(f))} átváltása</h3><ul class="links">${list.map((x) => `<li><a href="${url(x.path)}">${esc(x.question)}</a></li>`).join('')}</ul>`;
      })
      .join('\n');

  const body = `
${bc.html}
<h1>Konyhai mértékegységek átváltása</h1>
<p class="lead">Receptekben gyakran találkozol bögrével, pohárral, evő- és teáskanállal. Íme, mennyit jelentenek deciliterben és milliliterben.</p>
<h2>Térfogat</h2>
${tbl(['1 egység', 'ml', 'dl', 'liter'], rows)}
<h2>Tömeg</h2>
${tbl(['1 egység', 'g', 'dkg', 'kg'], massRows)}
<p>Térfogatot tömegre csak hozzávalóval együtt lehet pontosan átváltani, mert a liszt, a cukor vagy az olaj különböző sűrűségű. Ezt a <a href="${url('/#hozzavalok')}">hozzávalók táblázata</a> és az <a href="${url('/')}">átváltó kalkulátor</a> segít megoldani.</p>
${faqHtml(faqs)}
<h2>Összes mértékegység-átváltás</h2>
${groupLinks(KA.VOLUME_ORDER)}
${groupLinks(KA.MASS_ORDER)}
`;
  writePage(p, layout({ title, desc, p, body, ld: [bc.ld, faqLd(faqs)] }), { title, desc });
}

/* ------------------------------------------------------------------ főoldal */

function unitOptions(selected) {
  const group = (label, order) =>
    `<optgroup label="${label}">${order.map((u) => `<option value="${u}"${u === selected ? ' selected' : ''}>${esc(UNITS[u].label)}</option>`).join('')}</optgroup>`;
  return group('Térfogat', KA.VOLUME_ORDER) + group('Tömeg', KA.MASS_ORDER);
}

function ingOptions(selected) {
  return (
    '<option value="">Nincs (víz / folyadék, 1 g/ml)</option>' +
    data.categories
      .map((c) => {
        const opts = INGS.filter((i) => i.cat === c.id)
          .map((i) => `<option value="${i.slug}" data-name="${esc(i.name)}"${i.slug === selected ? ' selected' : ''}>${esc(cap(i.name))}</option>`)
          .join('');
        return `<optgroup label="${esc(c.name)}">${opts}</optgroup>`;
      })
      .join('')
  );
}

function buildHome() {
  const p = '/';
  const title = 'Konyhai átváltó: bögre, pohár, evőkanál → gramm, dkg, dl';
  const desc = `Ingyenes konyhai átváltó: bögre, pohár, evőkanál, teáskanál átváltása dl-re, ml-re, grammra és dkg-ra ${INGS.length} hozzávaló sűrűségével (liszt, cukor, vaj, tej…).`;
  const init = m2vInit();
  const faqs = [
    ...STD_FAQ.map(({ q, a }) => ({ q, a })),
    { q: 'Hány gramm egy bögre liszt?', a: v2m(INGS[0], 1, 'bogre', 'g').sentence },
    { q: 'Hogyan váltom át a bögrét grammra?', a: 'Válaszd ki a hozzávalót, add meg a mennyiséget (például 1 bögre), és az átváltó a hozzávaló sűrűsége alapján megmutatja a tömeget grammban, dekában vagy kilogrammban. Folyadékoknál és kistömegű fűszereknél is használható.' },
  ];
  const presets = [
    ['1 bögre liszt → dkg', 'liszt', 1, 'bogre', 'dkg'],
    ['1 bögre cukor → g', 'cukor', 1, 'bogre', 'g'],
    ['1 bögre rizs → dkg', 'rizs', 1, 'bogre', 'dkg'],
    ['1 dl olaj → g', 'olaj', 1, 'dl', 'g'],
    ['1 evőkanál méz → g', 'mez', 1, 'evokanal', 'g'],
    ['1 teáskanál só → g', 'so', 1, 'teaskanal', 'g'],
    ['1 pohár tej → g', 'tej', 1, 'pohar', 'g'],
    ['50 dkg liszt → bögre', 'liszt', 50, 'dkg', 'bogre'],
    ['25 dkg vaj → dl', 'vaj', 25, 'dkg', 'dl'],
    ['1 bögre → dl', '', 1, 'bogre', 'dl'],
  ];
  const popularIngs = ['liszt', 'cukor', 'porcukor', 'rizs', 'vaj', 'olaj', 'tej', 'mez', 'kakaopor', 'zabpehely', 'so', 'sutopor'];
  const popular = popularIngs.map((s) => {
    const ing = INGS.find((i) => i.slug === s);
    return qByIng.get(s).find((x) => x.key === (ing.spice ? 'v2m-1-teaskanal-g' : 'v2m-1-bogre-dkg'));
  });

  const tableRows = data.categories
    .map((c) => {
      const items = INGS.filter((i) => i.cat === c.id);
      return (
        `<tr class="cat"><th colspan="5" scope="colgroup">${esc(c.name)}</th></tr>` +
        items
          .map((i) => {
            const g = (ml) => fmt(niceMass(i.density * ml));
            return `<tr><th scope="row"><a href="${url(hubPath(i))}">${esc(cap(i.name))}</a></th><td class="num">${g(100)}</td><td class="num">${g(250)}</td><td class="num">${g(15)}</td><td class="num">${g(5)}</td></tr>`;
          })
          .join('')
      );
    })
    .join('');

  const measureRows = ['teaskanal', 'evokanal', 'dl', 'pohar', 'bogre', 'l'].map((u) => ({
    cells: [cap(T(u)), ...['ml', 'dl'].map((c) => fmt(convert(1, u, c)) + ' ' + T(c))],
  }));

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: BRAND,
      url: abs('/'),
      inLanguage: 'hu',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      description: desc,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'HUF' },
    },
    faqLd(faqs),
  ];

  const body = `
<h1>Konyhai átváltó: bögre, pohár, evőkanál → gramm, dkg, dl</h1>
<p class="lead">Számold át gyorsan a receptek mértékegységeit: bögre, pohár, evőkanál, teáskanál, ml, dl, liter, gramm, dkg és kg között – ${INGS.length} hozzávaló sűrűségével.</p>

<section class="card conv" id="atvalto" aria-label="Átváltó kalkulátor">
  <form onsubmit="return false" autocomplete="off">
    <div class="row">
      <div><label for="amount">Mennyiség</label><input id="amount" type="text" inputmode="decimal" value="1"></div>
      <div><label for="from">Miből</label><select id="from">${unitOptions('bogre')}</select></div>
      <button type="button" class="swap" id="swap" aria-label="Mértékegységek felcserélése" title="Felcserélés">⇄</button>
      <div><label for="to">Mibe</label><select id="to">${unitOptions('dkg')}</select></div>
    </div>
    <div class="ing"><label for="ing">Hozzávaló</label><select id="ing">${ingOptions('liszt')}</select></div>
  </form>
  <div class="result" aria-live="polite">
    <p class="big" id="result-main">${esc(init.main)}</p>
    <p class="sub" id="result-sub">${esc(init.sub)}</p>
  </div>
  <details style="margin-top:12px"><summary>Az összes mértékegység</summary>
    <div class="tw"><table><thead><tr><th scope="col">Egység</th><th scope="col" class="num">Érték</th></tr></thead><tbody id="all-body">${init.rows}</tbody></table></div>
  </details>
</section>

<ul class="chips" aria-label="Gyakori átváltások">
${presets.map(([label, e, a, f, t]) => `  <li><a data-preset href="${url('/')}?e=${e}&amp;a=${a}&amp;f=${f}&amp;t=${t}">${esc(label)}</a></li>`).join('\n')}
</ul>

<h2>Mennyi egy bögre, pohár, evőkanál?</h2>
${tbl(['Mérték', 'ml', 'dl'], measureRows)}
<p class="small muted">A bögre és a pohár nem szabványos; a magyar konyhákban 2,5 dl-es bögrével és 2 dl-es pohárral szokás számolni. <a href="${url('/mertekegysegek/')}">Részletek és további átváltások →</a></p>

<h2 id="hozzavalok">Hozzávalók átváltása grammra</h2>
<p>Hány gramm 1 dl, 1 bögre, 1 evőkanál vagy 1 teáskanál? Kattints a hozzávalóra a részletes táblázatért és a gyakori kérdésekért.</p>
<label class="small muted" for="filter">Keresés a hozzávalók között</label>
<input class="filter" id="filter" type="search" placeholder="pl. liszt, cukor, vaj…">
<div class="tw"><table id="ing-table"><thead><tr><th scope="col">Hozzávaló</th><th scope="col" class="num">1 dl (g)</th><th scope="col" class="num">1 bögre (g)</th><th scope="col" class="num">1 evőkanál (g)</th><th scope="col" class="num">1 teáskanál (g)</th></tr></thead><tbody>${tableRows}</tbody></table></div>

<h2>Népszerű kérdések</h2>
<ul class="links">
${popular.map((x) => `  <li><a href="${url(x.path)}">${esc(x.question)}</a></li>`).join('\n')}
  <li><a href="${url('/atvaltas/hany-dl-egy-bogre/')}">Hány dl egy bögre?</a></li>
  <li><a href="${url('/atvaltas/hany-ml-egy-evokanal/')}">Hány ml egy evőkanál?</a></li>
  <li><a href="${url('/atvaltas/hany-teaskanal-egy-evokanal/')}">Hány teáskanál egy evőkanál?</a></li>
</ul>

${faqHtml(faqs)}
`;

  const scripts = `<script src="${url('/assets/core.js')}?v=${JS_V}"></script>
<script src="${url('/assets/data.js')}?v=${JS_V}"></script>
<script src="${url('/assets/app.js')}?v=${JS_V}"></script>`;
  writePage(p, layout({ title, desc, p, body, ld, scripts }), { title, desc });
}

/** A főoldal statikus kezdőeredménye (JS nélkül is látszik). */
function m2vInit() {
  const ing = INGS.find((i) => i.slug === 'liszt');
  const amount = 1, from = 'bogre', to = 'dkg';
  const res = convert(amount, from, to, ing.density);
  const rows = [['Térfogat', KA.VOLUME_ORDER], ['Tömeg', KA.MASS_ORDER]]
    .map(([label, order]) =>
      `<tr><th colspan="2">${label}</th></tr>` +
      order.map((u) => `<tr${u === to ? ' class="hl"' : ''}><td>${T(u)}</td><td class="num">${fmt(convert(amount, from, u, ing.density))}</td></tr>`).join(''))
    .join('');
  return {
    main: `1 bögre liszt = ${fmt(res)} dkg`,
    sub: `Sűrűség: ${fmt(ing.density)} g/ml (1 dl liszt ≈ ${fmt(niceMass(ing.density * 100))} g). Az érték tájékoztató jellegű.`,
    rows,
  };
}

/* --------------------------------------------------------------- 404 + fájlok */

function build404() {
  const body = `
<h1>Ez az oldal nem található</h1>
<p class="lead">Úgy tűnik, rossz linkre kattintottál. Próbáld meg az átváltót, vagy keress a hozzávalók között.</p>
<p><a class="btn" href="${url('/')}">Vissza az átváltóhoz</a> <a class="btn ghost" href="${url('/#hozzavalok')}">Hozzávalók</a></p>`;
  writeFile('404.html', layout({ title: `Az oldal nem található | ${BRAND}`, desc: 'Az oldal nem található.', p: '/404.html', body, noindex: true }));
}

function buildStatic() {
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  for (const f of ['style.css', 'app.js', 'core.js']) fs.copyFileSync(path.join(SRC, f), path.join(OUT, 'assets', f));
  const dens = Object.fromEntries(INGS.map((i) => [i.slug, i.density]));
  writeFile('assets/data.js', `window.KA_DENSITY=${JSON.stringify(dens)};\n`);

  writeFile('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#c8402a"/><path d="M9 9h14l-2 15a2 2 0 0 1-2 1.8h-6a2 2 0 0 1-2-1.8z" fill="#fff"/><path d="M10.2 16h11.6" stroke="#c8402a" stroke-width="1.6"/></svg>\n');

  writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

  const urls = sitemap
    .map((p) => `  <url><loc>${abs(p)}</loc><lastmod>${TODAY}</lastmod></url>`)
    .join('\n');
  writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  writeFile('.nojekyll', '');
  writeFile('_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
  const host = new URL(SITE_URL).hostname;
  if (!BASE && !host.endsWith('github.io')) writeFile('CNAME', host + '\n');
}

/* ---------------------------------------------------------------------- main */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

buildHome();
buildUnitsIndex();
unitPairs.forEach(buildUnitPage);
INGS.forEach(buildHub);
questions.forEach(buildQuestionPage);
build404();
buildStatic();

console.log(`Kész: ${sitemap.length} oldal a ${path.relative(process.cwd(), OUT) || '.'} mappában`);
console.log(`  hozzávalók: ${INGS.length} | kérdés-oldalak: ${questions.length} | mértékegység-oldalak: ${unitPairs.length}`);
console.log(`  SITE_URL=${SITE_URL}${BASE ? ' BASE_PATH=' + BASE : ''}`);
